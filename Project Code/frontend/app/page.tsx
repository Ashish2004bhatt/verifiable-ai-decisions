'use client'

import { useState } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Prediction {
  prediction: {
    prediction: string
    risk_score: number
    confidence: number
    model_id: string
  }
  model_metadata: {
    model_id: string
    model_checksum: string
    inference_params: any
  }
}

interface Proof {
  decision_id: string
  fingerprint: string
  stored_on_blockchain: boolean
  transaction_hash?: string
}

interface Verification {
  is_valid: boolean
  provided_fingerprint: string
  stored_fingerprint?: string
}

export default function Home() {
  const [medicalText, setMedicalText] = useState('')
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [proof, setProof] = useState<Proof | null>(null)
  const [verification, setVerification] = useState<Verification | null>(null)
  const [loading, setLoading] = useState(false)
  const [tamperedOutput, setTamperedOutput] = useState('')
  const [showTamperDemo, setShowTamperDemo] = useState(false)

  const sampleReports = [
    {
      title: 'Pneumonia Case',
      text: `Patient presents with acute onset of fever (38.5°C), productive cough with yellow sputum, and shortness of breath. 
      Chest X-ray shows bilateral lower lobe infiltrates and consolidation. 
      Physical examination reveals decreased breath sounds and wheezing. 
      White blood cell count elevated at 15,000/μL. 
      Clinical suspicion for pneumonia is high.`
    },
    {
      title: 'Mild Respiratory Symptoms',
      text: `Patient reports mild cough and occasional chest discomfort. 
      Vital signs stable. Chest X-ray shows clear lung fields. 
      No signs of infection. Recommend symptomatic treatment.`
    },
    {
      title: 'Severe Pneumonia',
      text: `Patient admitted with severe respiratory distress. 
      High-grade fever (39.8°C), productive cough, dyspnea, and hypoxia (SpO2 88% on room air). 
      Chest X-ray reveals extensive bilateral consolidation and pleural effusion. 
      Marked leukocytosis (20,000/μL). 
      Urgent treatment for severe pneumonia required.`
    }
  ]

  const handleInference = async () => {
    if (!medicalText.trim()) {
      alert('Please enter medical text')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${API_URL}/api/inference`, {
        text: medicalText
      })
      setPrediction(response.data)
      setTamperedOutput(response.data.prediction.prediction)
      setProof(null)
      setVerification(null)
    } catch (error: any) {
      alert('Error: ' + (error.response?.data?.error || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateProof = async () => {
    if (!prediction || !medicalText) {
      alert('Please run inference first')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${API_URL}/api/generate-proof`, {
        input_text: medicalText,
        output_value: prediction.prediction.prediction,
        model_metadata: prediction.model_metadata
      })
      setProof(response.data)
      setVerification(null)
    } catch (error: any) {
      alert('Error: ' + (error.response?.data?.error || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!proof || !medicalText) {
      alert('Please generate proof first')
      return
    }

    const outputToVerify = showTamperDemo ? tamperedOutput : prediction!.prediction.prediction

    setLoading(true)
    try {
      const response = await axios.post(`${API_URL}/api/verify`, {
        decision_id: proof.decision_id,
        input_text: medicalText,
        output_value: outputToVerify,
        model_metadata: prediction!.model_metadata
      })
      setVerification(response.data)
    } catch (error: any) {
      alert('Error: ' + (error.response?.data?.error || error.message))
    } finally {
      setLoading(false)
    }
  }

  const loadSample = (text: string) => {
    setMedicalText(text)
    setPrediction(null)
    setProof(null)
    setVerification(null)
    setShowTamperDemo(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Verifiable AI Decisions
          </h1>
          <p className="text-lg text-gray-600">
            Tamper-proof, privacy-preserving proof of AI decisions for healthcare
          </p>
          <div className="mt-4 p-4 bg-blue-100 rounded-lg max-w-2xl mx-auto">
            <p className="text-sm text-gray-700">
              <strong>Core Concept:</strong> We don't verify the AI by re-running it.
              We verify that the decision used in reality hasn't changed.
              Blockchain acts as an immutable receipt — not as storage.
            </p>
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Input & Inference */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Sample Medical Reports</h2>
              <div className="space-y-2">
                {sampleReports.map((report, idx) => (
                  <button
                    key={idx}
                    onClick={() => loadSample(report.text)}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition"
                  >
                    <div className="font-medium text-sm">{report.title}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Upload Medical Report</h2>
              <textarea
                value={medicalText}
                onChange={(e) => setMedicalText(e.target.value)}
                placeholder="Enter medical report text here..."
                className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleInference}
                disabled={loading || !medicalText.trim()}
                className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Processing...' : 'Get AI Prediction'}
              </button>
            </div>

            {prediction && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">AI Prediction</h2>
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700">
                      {prediction.prediction.prediction}
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                      Confidence: {prediction.prediction.confidence}%
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Model:</strong> {prediction.model_metadata.model_id}
                  </div>
                  <div className="text-xs text-gray-500 font-mono break-all">
                    <strong>Model Checksum:</strong> {prediction.model_metadata.model_checksum.substring(0, 32)}...
                  </div>
                </div>
                <button
                  onClick={handleGenerateProof}
                  disabled={loading}
                  className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                >
                  {loading ? 'Generating...' : 'Generate Proof'}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {proof && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Cryptographic Proof</h2>
                <div className="space-y-3">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-sm font-medium text-green-800 mb-2">
                      {proof.stored_on_blockchain ? 'Stored on Blockchain' : 'Mock Mode (Blockchain not connected)'}
                    </div>
                    {proof.transaction_hash && (
                      <div className="text-xs text-gray-600 font-mono break-all">
                        TX: {proof.transaction_hash.substring(0, 20)}...
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">
                    <strong>Decision ID:</strong> {proof.decision_id}
                  </div>
                  <div className="text-xs text-gray-500 font-mono break-all">
                    <strong>Fingerprint:</strong> {proof.fingerprint.substring(0, 32)}...
                  </div>
                </div>
              </div>
            )}

            {proof && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Tamper Demo</h2>
                <div className="space-y-3">
                  <label className="block text-sm font-medium">
                    Modify Output (to test verification):
                  </label>
                  <input
                    type="text"
                    value={tamperedOutput}
                    onChange={(e) => {
                      setTamperedOutput(e.target.value)
                      setShowTamperDemo(true)
                    }}
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="Original: Pneumonia risk: 70%"
                  />
                  <div className="text-xs text-gray-500">
                    Try changing the risk percentage to see verification fail
                  </div>
                  <button
                    onClick={handleVerify}
                    disabled={loading}
                    className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                  >
                    {loading ? 'Verifying...' : 'Verify Decision'}
                  </button>
                </div>
              </div>
            )}

            {verification && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Verification Result</h2>
                <div className={`p-6 rounded-lg ${verification.is_valid ? 'bg-green-50' : 'bg-red-50'}`}>
                  {verification.is_valid ? (
                    <div>
                      <div className="text-xl font-bold text-green-700">Decision Authentic</div>
                      <div className="text-sm text-gray-600 mt-2">
                        The fingerprint matches the blockchain record. Decision has not been altered.
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xl font-bold text-red-700">Tampering Detected!</div>
                      <div className="text-sm text-gray-600 mt-2">
                        The fingerprint does not match the blockchain record. Decision has been altered.
                      </div>
                    </div>
                  )}
                </div>
                {verification.stored_fingerprint && (
                  <div className="mt-4 text-xs text-gray-500 space-y-1">
                    <div className="font-mono break-all">
                      <strong>Provided:</strong> {verification.provided_fingerprint.substring(0, 32)}...
                    </div>
                    <div className="font-mono break-all">
                      <strong>Stored:</strong> {verification.stored_fingerprint.substring(2, 34)}...
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">How It Works</h2>
              <div className="text-sm text-gray-700 space-y-2">
                <div className="flex items-start">
                  <span className="font-bold mr-2">1.</span>
                  <span>AI makes a decision based on medical input</span>
                </div>
                <div className="flex items-start">
                  <span className="font-bold mr-2">2.</span>
                  <span>System creates cryptographic fingerprint (hash of input + output + model)</span>
                </div>
                <div className="flex items-start">
                  <span className="font-bold mr-2">3.</span>
                  <span>Fingerprint stored on blockchain (immutable record)</span>
                </div>
                <div className="flex items-start">
                  <span className="font-bold mr-2">4.</span>
                  <span>Later verification: regenerate hash and compare with blockchain</span>
                </div>
                <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                  <strong>Key Point:</strong> We verify integrity, not accuracy. The blockchain proves the decision hasn't changed, not that it was correct.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

