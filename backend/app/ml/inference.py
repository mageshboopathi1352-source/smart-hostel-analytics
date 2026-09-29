import os
import json
import numpy as np
from typing import List, Dict, Tuple, Optional

FEATURES = ["temperature", "humidity", "light", "motion", "air_quality"]
SEQUENCE_LENGTH = 5

class AnomalyInferenceEngine:
    def __init__(self, model_path="ml/model/anomaly_dnn_weights.json", scaler_path="ml/scaler/scaler_params.json"):
        self.model_path = model_path
        self.scaler_path = scaler_path
        self.feature_min = {
            "temperature": 20.0, "humidity": 30.0, "light": 0.0, "motion": 0.0, "air_quality": 30.0
        }
        self.feature_max = {
            "temperature": 45.0, "humidity": 100.0, "light": 1000.0, "motion": 1.0, "air_quality": 300.0
        }
        self.neural_weights = None
        self.keras_model = None
        self.load_artifacts()

    def load_artifacts(self):
        # Load scaler parameters if saved
        if os.path.exists(self.scaler_path):
            try:
                with open(self.scaler_path, "r") as f:
                    data = json.load(f)
                    self.feature_min.update(data.get("feature_min", {}))
                    self.feature_max.update(data.get("feature_max", {}))
            except Exception as e:
                print(f"[ML Engine] Notice loading scaler: {e}")

        # Check for Keras .keras model
        keras_path = "ml/model/anomaly_dnn.keras"
        if os.path.exists(keras_path):
            try:
                import tensorflow as tf
                self.keras_model = tf.keras.models.load_model(keras_path)
                print("[ML Engine] Loaded Keras LSTM model successfully.")
            except Exception as e:
                print(f"[ML Engine] Keras load info: {e}")

        # Load weights json
        if self.keras_model is None and os.path.exists(self.model_path):
            try:
                with open(self.model_path, "r") as f:
                    self.neural_weights = json.load(f)
                print("[ML Engine] Loaded neural sequence weights successfully.")
            except Exception as e:
                print(f"[ML Engine] Neural weights load info: {e}")

    def normalize_reading(self, reading: Dict[str, float]) -> List[float]:
        vector = []
        for feat in FEATURES:
            raw_val = reading.get(feat)
            if raw_val is None or (isinstance(raw_val, float) and np.isnan(raw_val)):
                raw_val = 45.0 if feat == "air_quality" else 25.0
            raw_val = float(raw_val)
            min_v = self.feature_min.get(feat, 0.0)
            max_v = self.feature_max.get(feat, 100.0)
            denom = max_v - min_v if max_v != min_v else 1.0
            scaled = (raw_val - min_v) / denom
            vector.append(max(0.0, min(1.0, scaled)))
        return vector

    def predict(self, window_readings: List[Dict[str, float]]) -> Tuple[bool, str, str, float, str]:
        """
        Takes a list of recent readings (up to SEQUENCE_LENGTH),
        returns (is_anomaly, anomaly_type, severity, confidence, description).
        """
        if not window_readings:
            return False, "NORMAL", "NORMAL", 0.05, "No sensor telemetry available"

        latest = window_readings[-1]
        temp = float(latest.get("temperature", 25.0))
        hum = float(latest.get("humidity", 50.0))
        air_q = float(latest.get("air_quality") or 45.0)
        light = float(latest.get("light", 300.0))
        motion = int(latest.get("motion", 0))

        # Pad sequence to SEQUENCE_LENGTH
        norm_seq = [self.normalize_reading(r) for r in window_readings]
        while len(norm_seq) < SEQUENCE_LENGTH:
            norm_seq.insert(0, norm_seq[0])
        norm_seq = norm_seq[-SEQUENCE_LENGTH:]

        confidence = 0.10

        # Run inference if model available
        if self.keras_model is not None:
            try:
                X_in = np.array([norm_seq], dtype=np.float32)
                pred_prob = float(self.keras_model.predict(X_in, verbose=0)[0][0])
                confidence = pred_prob
            except Exception:
                confidence = 0.50
        elif self.neural_weights is not None:
            try:
                X_flat = np.array(norm_seq, dtype=np.float32).flatten().reshape(1, -1)
                W1 = np.array(self.neural_weights["W1"])
                b1 = np.array(self.neural_weights["b1"])
                W2 = np.array(self.neural_weights["W2"])
                b2 = np.array(self.neural_weights["b2"])

                z1 = np.dot(X_flat, W1) + b1
                a1 = np.maximum(0, z1)
                z2 = np.dot(a1, W2) + b2
                confidence = float(1.0 / (1.0 + np.exp(-np.clip(z2[0][0], -15, 15))))
            except Exception:
                confidence = 0.50

        # Environmental anomaly boundary logic
        if temp >= 37.0 or air_q >= 150.0:
            is_anomaly = True
            anomaly_type = "CRITICAL_FIRE_RISK"
            severity = "CRITICAL"
            confidence = max(confidence, 0.94)
            description = f"Critical thermal/gas spike: Temp {temp:.1f}°C, Air Quality index {air_q:.1f} ppm."
        elif temp >= 33.0:
            is_anomaly = True
            anomaly_type = "WARNING_OVERHEATING"
            severity = "WARNING"
            confidence = max(confidence, 0.86)
            description = f"Elevated temperature threshold breach: {temp:.1f}°C."
        elif hum >= 82.0:
            is_anomaly = True
            anomaly_type = "HIGH_HUMIDITY_DAMP"
            severity = "WARNING"
            confidence = max(confidence, 0.88)
            description = f"Excessive relative humidity: {hum:.1f}% presents damp and mold hazard."
        elif air_q >= 110.0:
            is_anomaly = True
            anomaly_type = "POOR_VENTILATION_STUFFY"
            severity = "WARNING"
            confidence = max(confidence, 0.82)
            description = f"Stale air quality and VOC buildup: {air_q:.1f} ppm."
        elif temp < 10.0 or temp > 60.0:
            is_anomaly = True
            anomaly_type = "SENSOR_FAULT"
            severity = "WARNING"
            confidence = 0.91
            description = f"Out-of-range sensor value detected ({temp:.1f}°C), possible hardware fault."
        else:
            is_anomaly = confidence >= 0.65
            if is_anomaly:
                anomaly_type = "UNUSUAL_PATTERN"
                severity = "WARNING"
                description = "Deep Neural Network detected anomalous multivariate temporal drift."
            else:
                anomaly_type = "NORMAL"
                severity = "NORMAL"
                confidence = max(0.02, min(0.35, confidence))
                description = "All environmental telemetry parameters within normal baseline range."

        return is_anomaly, anomaly_type, severity, round(confidence, 4), description

anomaly_engine = AnomalyInferenceEngine()
