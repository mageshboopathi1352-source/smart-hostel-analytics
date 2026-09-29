"""
AIoT Smart Hostel - Sensor Data Preprocessing & Sequence Generator
Handles sliding window sequence preparation for LSTM / 1D-CNN Anomaly Detection.
"""

import os
import json
import numpy as np
import pandas as pd

FEATURES = ["temperature", "humidity", "light", "motion", "air_quality"]
SEQUENCE_LENGTH = 5  # Sliding window of last 5 sensor readings

class SensorDataPreprocessor:
    def __init__(self, sequence_length=SEQUENCE_LENGTH):
        self.sequence_length = sequence_length
        self.feature_min = {}
        self.feature_max = {}
        self.is_fitted = False

    def fit(self, df: pd.DataFrame):
        for col in FEATURES:
            if col in df.columns:
                vals = df[col].dropna()
                self.feature_min[col] = float(vals.min())
                self.feature_max[col] = float(vals.max())
                if self.feature_max[col] == self.feature_min[col]:
                    self.feature_max[col] += 1.0
            else:
                self.feature_min[col] = 0.0
                self.feature_max[col] = 100.0
        self.is_fitted = True

    def transform_single(self, record: dict) -> list:
        """Normalize a single sensor reading dictionary."""
        norm = []
        for col in FEATURES:
            val = record.get(col)
            if val is None or np.isnan(float(val)):
                # Default air_quality median if not present
                val = 45.0 if col == "air_quality" else 25.0
            val = float(val)
            min_val = self.feature_min.get(col, 0.0)
            max_val = self.feature_max.get(col, 100.0)
            scaled = (val - min_val) / (max_val - min_val)
            norm.append(max(0.0, min(1.0, scaled)))
        return norm

    def transform_dataframe(self, df: pd.DataFrame) -> np.ndarray:
        df_clean = df.copy()
        for col in FEATURES:
            if col not in df_clean.columns:
                df_clean[col] = 45.0 if col == "air_quality" else 0.0
            df_clean[col] = df_clean[col].fillna(45.0 if col == "air_quality" else 0.0)
        
        scaled_data = []
        for _, row in df_clean.iterrows():
            norm_row = self.transform_single(row.to_dict())
            scaled_data.append(norm_row)
        return np.array(scaled_data, dtype=np.float32)

    def create_sequences(self, scaled_features: np.ndarray, labels: np.ndarray = None):
        """Build sliding window sequences (samples, sequence_length, features)."""
        X = []
        y = []
        n_samples = len(scaled_features)
        if n_samples < self.sequence_length:
            # Pad with first element if shorter than window
            pad_len = self.sequence_length - n_samples
            pad = np.repeat(scaled_features[:1], pad_len, axis=0)
            scaled_features = np.vstack([pad, scaled_features])
            n_samples = len(scaled_features)

        for i in range(n_samples - self.sequence_length + 1):
            X.append(scaled_features[i : i + self.sequence_length])
            if labels is not None and i + self.sequence_length - 1 < len(labels):
                y.append(labels[i + self.sequence_length - 1])

        X = np.array(X, dtype=np.float32)
        y = np.array(y, dtype=np.float32) if labels is not None else None
        return X, y

    def save_scaler(self, path="ml/scaler/scaler_params.json"):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            json.dump({
                "features": FEATURES,
                "sequence_length": self.sequence_length,
                "feature_min": self.feature_min,
                "feature_max": self.feature_max
            }, f, indent=2)

    def load_scaler(self, path="ml/scaler/scaler_params.json"):
        if os.path.exists(path):
            with open(path, "r") as f:
                data = json.load(f)
                self.sequence_length = data.get("sequence_length", SEQUENCE_LENGTH)
                self.feature_min = data.get("feature_min", {})
                self.feature_max = data.get("feature_max", {})
                self.is_fitted = True
            return True
        return False

def load_and_preprocess_dataset(csv_path="dataset/sensor_data.csv"):
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at {csv_path}")
    df = pd.read_csv(csv_path)
    preprocessor = SensorDataPreprocessor(sequence_length=SEQUENCE_LENGTH)
    preprocessor.fit(df)
    preprocessor.save_scaler()

    scaled_X = preprocessor.transform_dataframe(df)
    labels = df["is_anomaly"].values.astype(np.float32)
    X_seq, y_seq = preprocessor.create_sequences(scaled_X, labels)
    return df, preprocessor, X_seq, y_seq

if __name__ == "__main__":
    df, preprocessor, X_seq, y_seq = load_and_preprocess_dataset()
    print(f"[Preprocessing Complete] Sequences shape: {X_seq.shape}, Labels shape: {y_seq.shape}")
    print(f"Features: {FEATURES}")
