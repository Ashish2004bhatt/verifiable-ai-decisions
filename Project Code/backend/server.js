const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const crypto = require('crypto');
const axios = require('axios');
const http = require('http');
require('dotenv').config();

const httpAgent = new http.Agent({ family: 4 });

const app = express();
app.use(cors());
app.use(express.json());

const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:5000').replace('localhost', '127.0.0.1');
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '';
const RPC_URL = (process.env.RPC_URL || 'http://127.0.0.1:8545').replace('localhost', '127.0.0.1');
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';

let provider, contract, signer;
let contractABI;

const mockFingerprints = new Map();

try {
  contractABI = require('./contract-abi.json');
} catch (error) {
  contractABI = [
    "function registerDecision(string memory decisionId, bytes32 fingerprint, string memory modelId) public",
    "function verifyDecision(string memory decisionId, bytes32 providedFingerprint) public view returns (bool isValid, uint256 timestamp)",
    "function getDecision(string memory decisionId) public view returns (bytes32 fingerprint, uint256 timestamp, string memory modelId, bool exists)"
  ];
}

async function initializeBlockchain() {
  if (CONTRACT_ADDRESS && RPC_URL) {
    try {
      provider = new ethers.JsonRpcProvider(RPC_URL);
      
      if (PRIVATE_KEY) {
        signer = new ethers.Wallet(PRIVATE_KEY, provider);
      } else {
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          signer = await provider.getSigner(accounts[0].address);
        } else {
          throw new Error('No accounts available');
        }
      }
      
      contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
      const signerAddress = await signer.getAddress();
      console.log('Connected to blockchain');
      console.log(`Contract: ${CONTRACT_ADDRESS}`);
      console.log(`Signer: ${signerAddress}`);
    } catch (error) {
      console.warn('Blockchain connection failed:', error.message);
      console.warn('Running in mock mode');
      contract = null;
    }
  } else {
    console.warn('Blockchain not configured');
    console.warn('Running in mock mode');
  }
}

initializeBlockchain();

function generateFingerprint(inputHash, outputValue, modelMetadata) {
  const data = {
    input_hash: inputHash,
    output_value: outputValue,
    model_id: modelMetadata.model_id,
    model_checksum: modelMetadata.model_checksum,
    inference_params: JSON.stringify(modelMetadata.inference_params)
  };
  
  const dataString = JSON.stringify(data, Object.keys(data).sort());
  const fingerprint = crypto.createHash('sha256').update(dataString).digest('hex');
  
  return fingerprint;
}

function hashInput(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    blockchain_connected: !!contract,
    contract_address: CONTRACT_ADDRESS
  });
});

app.post('/api/inference', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Medical text is required' });
    }
    
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/predict`, {
      text: text
    }, {
      httpAgent: httpAgent
    });
    
    const prediction = aiResponse.data.prediction;
    const modelMetadata = aiResponse.data.model_metadata;
    
    res.json({
      success: true,
      input_text: text,
      prediction: prediction,
      model_metadata: modelMetadata,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Inference error:', error);
    res.status(500).json({
      error: 'Failed to get AI prediction',
      details: error.message
    });
  }
});

app.post('/api/generate-proof', async (req, res) => {
  try {
    const { input_text, output_value, model_metadata, decision_id } = req.body;
    
    if (!input_text || !output_value || !model_metadata) {
      return res.status(400).json({
        error: 'input_text, output_value, and model_metadata are required'
      });
    }
    
    const inputHash = hashInput(input_text);
    const fingerprint = generateFingerprint(inputHash, output_value, model_metadata);
    const fingerprintBytes32 = '0x' + fingerprint;
    
    const decisionId = decision_id || `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let txHash = null;
    let blockchainError = null;
    
    if (contract) {
      try {
        const tx = await contract.registerDecision(
          decisionId,
          fingerprintBytes32,
          model_metadata.model_id
        );
        await tx.wait();
        txHash = tx.hash;
      } catch (error) {
        console.error('Blockchain error:', error);
        blockchainError = error.message;
      }
    } else {
      mockFingerprints.set(decisionId, fingerprint);
    }
    
    res.json({
      success: true,
      decision_id: decisionId,
      fingerprint: fingerprint,
      input_hash: inputHash,
      stored_on_blockchain: !!txHash,
      transaction_hash: txHash,
      blockchain_error: blockchainError,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Proof generation error:', error);
    res.status(500).json({
      error: 'Failed to generate proof',
      details: error.message
    });
  }
});

app.post('/api/verify', async (req, res) => {
  try {
    const { decision_id, input_text, output_value, model_metadata } = req.body;
    
    if (!decision_id || !input_text || !output_value || !model_metadata) {
      return res.status(400).json({
        error: 'decision_id, input_text, output_value, and model_metadata are required'
      });
    }
    
    const inputHash = hashInput(input_text);
    const fingerprint = generateFingerprint(inputHash, output_value, model_metadata);
    const fingerprintBytes32 = '0x' + fingerprint;
    
    let isValid = false;
    let timestamp = null;
    let blockchainError = null;
    let storedFingerprint = null;
    
    if (contract) {
      try {
        const [isValidResult, timestampResult] = await contract.verifyDecision(
          decision_id,
          fingerprintBytes32
        );
        isValid = isValidResult;
        timestamp = timestampResult.toString();
        
        const decision = await contract.getDecision(decision_id);
        storedFingerprint = decision.fingerprint;
      } catch (error) {
        console.error('Verification error:', error);
        blockchainError = error.message;
        if (error.message.includes('not found') || error.message.includes('Decision not found')) {
          isValid = false;
        }
      }
    } else {
      const storedFp = mockFingerprints.get(decision_id);
      if (storedFp) {
        storedFingerprint = '0x' + storedFp;
        isValid = storedFp === fingerprint;
        blockchainError = 'Blockchain not connected - running in mock mode';
      } else {
        isValid = false;
        blockchainError = 'Decision not found in mock storage';
      }
    }
    
    res.json({
      success: true,
      decision_id: decision_id,
      provided_fingerprint: fingerprint,
      stored_fingerprint: storedFingerprint,
      is_valid: isValid,
      timestamp: timestamp,
      blockchain_connected: !!contract,
      blockchain_error: blockchainError,
      verification_time: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      error: 'Failed to verify decision',
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend API server running on port ${PORT}`);
  console.log(`AI Service URL: ${AI_SERVICE_URL}`);
  console.log(`Contract Address: ${CONTRACT_ADDRESS || 'Not configured'}`);
});

