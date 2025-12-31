from flask import Flask, request, jsonify
from flask_cors import CORS
import hashlib
import json
import os
from datetime import datetime
from transformers import pipeline

app = Flask(__name__)
CORS(app)


class HealthcareAIModel:
    def __init__(self):
        model_name = os.getenv("MODEL_NAME", "distilbert-base-uncased-finetuned-sst-2-english")
        self.hf_model_name = model_name
        self.model_id = f"hf-{model_name}"
        self.version = "1.0.0"
        
        self.pipeline = pipeline(
            "text-classification",
            model=model_name,
            tokenizer=model_name,
        )
        
        self.model_checksum = self._calculate_model_checksum()

    def _calculate_model_checksum(self):
        config = {
            "model_id": self.model_id,
            "version": self.version,
            "hf_model_name": self.hf_model_name,
        }
        config_str = json.dumps(config, sort_keys=True)
        return hashlib.sha256(config_str.encode()).hexdigest()

    def predict(self, medical_text: str):
        result = self.pipeline(medical_text[:512])[0]
        label = result.get("label", "").upper()
        score = float(result.get("score", 0.5))

        if "NEG" in label:
            risk = int(50 + score * 50)
        else:
            risk = int((1 - score) * 40)

        confidence = int(score * 100)

        return {
            "prediction": f"Pneumonia risk: {risk}%",
            "risk_score": risk,
            "confidence": confidence,
            "model_id": self.model_id,
            "model_version": self.version,
            "raw_model_output": {
                "label": label,
                "score": score,
            },
        }

    def get_model_metadata(self):
        return {
            "model_id": self.model_id,
            "model_version": self.version,
            "model_checksum": self.model_checksum,
            "inference_params": {
                "hf_model_name": self.hf_model_name,
                "task": "text-classification",
            },
        }


ai_model = HealthcareAIModel()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "model_id": ai_model.model_id})

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        medical_text = data.get('text', '')
        
        if not medical_text:
            return jsonify({"error": "Medical text is required"}), 400
        
        prediction = ai_model.predict(medical_text)
        metadata = ai_model.get_model_metadata()
        
        return jsonify({
            "success": True,
            "prediction": prediction,
            "model_metadata": metadata,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/model/metadata', methods=['GET'])
def get_model_metadata():
    return jsonify({
        "success": True,
        "metadata": ai_model.get_model_metadata()
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"AI Service starting on port {port}")
    print(f"Model ID: {ai_model.model_id}")
    print(f"Model Checksum: {ai_model.model_checksum}")
    app.run(host='0.0.0.0', port=port, debug=True)

