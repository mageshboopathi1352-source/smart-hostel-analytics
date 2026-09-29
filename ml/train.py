"""
AIoT Smart Hostel - DNN Anomaly Prediction Model Training
Trains an LSTM / 1D-CNN Deep Neural Network on sliding-window sensor sequences.
"""

import os
import json
import numpy as np

# Ensure directory structure
os.makedirs("ml/model", exist_ok=True)
os.makedirs("ml/scaler", exist_ok=True)

from ml.preprocess import load_and_preprocess_dataset, FEATURES, SEQUENCE_LENGTH

def build_and_train_model():
    print("[1/4] Loading dataset and building sequence windows...")
    df, preprocessor, X, y = load_and_preprocess_dataset("dataset/sensor_data.csv")
    print(f"Total sequences generated: {len(X)} | Input shape: {X.shape}")

    # Train / Test split (80/20)
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    model_trained = False
    history_record = {}

    try:
        import tensorflow as tf
        from tensorflow.keras.models import Sequential
        from tensorflow.keras.layers import LSTM, Dense, Dropout, Conv1D, GlobalMaxPooling1D
        from tensorflow.keras.optimizers import Adam

        print("[2/4] TensorFlow detected. Compiling Deep LSTM Neural Network...")
        model = Sequential([
            LSTM(32, input_shape=(SEQUENCE_LENGTH, len(FEATURES)), return_sequences=False),
            Dropout(0.2),
            Dense(16, activation="relu"),
            Dense(1, activation="sigmoid")
        ])

        model.compile(
            optimizer=Adam(learning_rate=0.005),
            loss="binary_crossentropy",
            metrics=["accuracy"]
        )

        print("[3/4] Training LSTM model for 25 epochs...")
        history = model.fit(
            X_train, y_train,
            epochs=25,
            batch_size=8,
            validation_data=(X_test, y_test),
            verbose=1
        )

        model.save("ml/model/anomaly_dnn.keras")
        # Also save weights for lightweight portability
        model.save_weights("ml/model/anomaly_dnn.weights.h5")
        history_record = {
            "loss": [float(v) for v in history.history["loss"]],
            "accuracy": [float(v) for v in history.history["accuracy"]],
            "val_accuracy": [float(v) for v in history.history.get("val_accuracy", [])]
        }
        model_trained = True
        print("[4/4] Saved Keras model to ml/model/anomaly_dnn.keras")

    except ImportError:
        print("[Notice] TensorFlow not yet available. Training neural weights using numpy optimization...")
        # Train a robust 2-layer Neural Classifier using backpropagation on sequence embeddings
        # Flat feature representation from sequence
        X_train_flat = X_train.reshape((len(X_train), -1))
        X_test_flat = X_test.reshape((len(X_test), -1))

        input_dim = X_train_flat.shape[1]
        hidden_dim = 16
        np.random.seed(42)

        W1 = np.random.randn(input_dim, hidden_dim) * 0.1
        b1 = np.zeros((1, hidden_dim))
        W2 = np.random.randn(hidden_dim, 1) * 0.1
        b2 = np.zeros((1, 1))

        lr = 0.05
        epochs = 150
        losses = []
        accuracies = []

        for ep in range(epochs):
            # Forward pass
            z1 = np.dot(X_train_flat, W1) + b1
            a1 = np.maximum(0, z1) # ReLU
            z2 = np.dot(a1, W2) + b2
            y_pred = 1.0 / (1.0 + np.exp(-np.clip(z2, -15, 15))) # Sigmoid

            # Binary cross-entropy
            eps = 1e-7
            y_t = y_train.reshape((-1, 1))
            loss = -np.mean(y_t * np.log(y_pred + eps) + (1 - y_t) * np.log(1 - y_pred + eps))
            acc = float(np.mean((y_pred > 0.5) == y_t))
            losses.append(float(loss))
            accuracies.append(acc)

            # Backprop
            d_z2 = (y_pred - y_t) / len(X_train)
            d_W2 = np.dot(a1.T, d_z2)
            d_b2 = np.sum(d_z2, axis=0, keepdims=True)

            d_a1 = np.dot(d_z2, W2.T)
            d_z1 = d_a1 * (z1 > 0)
            d_W1 = np.dot(X_train_flat.T, d_z1)
            d_b1 = np.sum(d_z1, axis=0, keepdims=True)

            W1 -= lr * d_W1
            b1 -= lr * d_b1
            W2 -= lr * d_W2
            b2 -= lr * d_b2

        # Save neural network weights and architecture
        neural_model_data = {
            "type": "NeuralSequenceClassifier",
            "input_dim": input_dim,
            "hidden_dim": hidden_dim,
            "W1": W1.tolist(),
            "b1": b1.tolist(),
            "W2": W2.tolist(),
            "b2": b2.tolist(),
            "sequence_length": SEQUENCE_LENGTH,
            "features": FEATURES
        }
        with open("ml/model/anomaly_dnn_weights.json", "w") as f:
            json.dump(neural_model_data, f, indent=2)

        history_record = {"loss": losses[-10:], "accuracy": accuracies[-10:]}
        model_trained = True
        print(f"[4/4] Saved neural sequence weights to ml/model/anomaly_dnn_weights.json (Final Train Acc: {accuracies[-1]:.2%})")

    # Save training metadata
    with open("ml/model/train_summary.json", "w") as f:
        json.dump({
            "trained": model_trained,
            "num_sequences": len(X),
            "features": FEATURES,
            "sequence_length": SEQUENCE_LENGTH,
            "history": history_record
        }, f, indent=2)

    return model_trained

if __name__ == "__main__":
    build_and_train_model()
