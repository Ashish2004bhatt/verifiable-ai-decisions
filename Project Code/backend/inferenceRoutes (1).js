const express = require('express');
const axios = require('axios');
const http = require('http');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../config/constants');
const { validateInferenceRequest } = require('../utils/validationHelpers');

const router = express.Router();
const httpAgent = new http.Agent({ family: 4 });

function getAIServiceUrl() {
  return process.env.AI_SERVICE_URL || 'http://127.0.0.1:5000';
}

async function callAIServiceForPrediction(text, aiServiceUrl) {
  try {
    const response = await axios.post(
      `${aiServiceUrl}/predict`,
      { text: text },
      { httpAgent: httpAgent }
    );
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}

function formatInferenceResponse(predictionData, inputText) {
  return {
    success: true,
    input_text: inputText,
    prediction: predictionData.prediction,
    model_metadata: predictionData.model_metadata,
    timestamp: new Date().toISOString()
  };
}

router.post('/api/inference', async (req, res) => {
  try {
    const validation = validateInferenceRequest(req.body);
    
    if (!validation.isValid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: validation.errors.join(', ')
      });
    }

    const aiServiceUrl = getAIServiceUrl();
    const aiResult = await callAIServiceForPrediction(req.body.text, aiServiceUrl);
    
    if (!aiResult.success) {
      console.error('Inference error:', aiResult.error);
      return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
        error: ERROR_MESSAGES.AI_SERVICE_FAILED,
        details: aiResult.error
      });
    }

    const response = formatInferenceResponse(aiResult.data, req.body.text);
    res.json(response);

  } catch (error) {
    console.error('Inference error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_MESSAGES.AI_SERVICE_FAILED,
      details: error.message
    });
  }
});

module.exports = router;

