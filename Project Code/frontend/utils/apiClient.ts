import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function makeApiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'POST',
  data?: any
): Promise<ApiResponse<T>> {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      ...(data && { data })
    };

    const response = await axios(config);
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
}

export async function fetchInference(text: string) {
  return makeApiRequest('/api/inference', 'POST', { text });
}

export async function generateProof(
  inputText: string,
  outputValue: string,
  modelMetadata: any,
  decisionId?: string
) {
  return makeApiRequest('/api/generate-proof', 'POST', {
    input_text: inputText,
    output_value: outputValue,
    model_metadata: modelMetadata,
    decision_id: decisionId
  });
}

export async function verifyDecision(
  decisionId: string,
  inputText: string,
  outputValue: string,
  modelMetadata: any
) {
  return makeApiRequest('/api/verify', 'POST', {
    decision_id: decisionId,
    input_text: inputText,
    output_value: outputValue,
    model_metadata: modelMetadata
  });
}

export { API_BASE_URL };

