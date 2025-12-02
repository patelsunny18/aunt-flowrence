import os

# --- IMPORTANT: use legacy Keras backend so TFLite works with TF 2.16 ---
os.environ["TF_USE_LEGACY_KERAS"] = "1"

import numpy as np
from pathlib import Path
import tensorflow as tf
from tensorflow.keras import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint


def load_data():
    """
    Loads preprocessed numpy arrays from an .npz file.

    Expected keys in the .npz:
      - X, y
      - mean, std, feature_cols, seq_len  (extra metadata)

    We do a simple train/val/test split here.
    """
    project_root = Path(__file__).resolve().parents[2]
    data_path = project_root / "ml" / "data" / "processed" / "cycle_sequences.npz"

    print(f"Loading data from: {data_path}")
    data = np.load(data_path, allow_pickle=True)

    X = data["X"]
    y = data["y"]
    mean = data["mean"]
    std = data["std"]
    feature_cols = data["feature_cols"]
    seq_len = int(data["seq_len"])

    print("File metadata:")
    print(f"  seq_len: {seq_len}")
    print(f"  num_features: {len(feature_cols)}")
    print("  feature_cols:", feature_cols)

    print("Original shapes:")
    print(f"  X: {X.shape}, y: {y.shape}")

    # Simple split: 70% train, 15% val, 15% test
    n = X.shape[0]
    n_train = int(0.7 * n)
    n_val = int(0.15 * n)

    X_train, y_train = X[:n_train], y[:n_train]
    X_val,   y_val   = X[n_train:n_train + n_val], y[n_train:n_train + n_val]
    X_test,  y_test  = X[n_train + n_val:], y[n_train + n_val:]

    print("Split shapes:")
    print(f"  X_train: {X_train.shape}, y_train: {y_train.shape}")
    print(f"  X_val:   {X_val.shape},   y_val:   {y_val.shape}")
    print(f"  X_test:  {X_test.shape},  y_test:  {y_test.shape}")

    return (X_train, y_train, X_val, y_val, X_test, y_test)


def build_model(input_shape):
    """
    Builds a simple LSTM regression model.

    input_shape: (timesteps, num_features)
    """
    print(f"Building model with input_shape={input_shape}")

    model = Sequential(
        [
            LSTM(64, input_shape=input_shape, return_sequences=False),
            Dropout(0.3),
            Dense(32, activation="relu"),
            Dropout(0.2),
            Dense(1, activation="linear"),
        ]
    )

    model.compile(
        optimizer="adam",
        loss="mse",
        metrics=["mae"],
    )

    model.summary()
    return model


def train():
    # --------------------------------------------------
    # 1. Load data
    # --------------------------------------------------
    X_train, y_train, X_val, y_val, X_test, y_test = load_data()

    # Infer input shape from training data: (timesteps, num_features)
    # We expect something like (batch, seq_len, num_features)
    timesteps = X_train.shape[1]
    num_features = X_train.shape[2]
    input_shape = (timesteps, num_features)

    # --------------------------------------------------
    # 2. Build model
    # --------------------------------------------------
    model = build_model(input_shape)

    # --------------------------------------------------
    # 3. Set up paths and callbacks
    # --------------------------------------------------
    project_root = Path(__file__).resolve().parents[2]
    models_dir = project_root / "ml" / "models"
    models_dir.mkdir(parents=True, exist_ok=True)

    checkpoint_path = models_dir / "best_lstm_model.keras"
    print(f"Checkpoint path: {checkpoint_path}")

    early_stopping_cb = EarlyStopping(
        monitor="val_loss",
        patience=10,
        restore_best_weights=True,
        mode="min",
        verbose=1,
    )

    checkpoint_cb = ModelCheckpoint(
        filepath=str(checkpoint_path),  # Path -> str for tf_keras
        save_best_only=True,
        monitor="val_loss",
        mode="min",
        verbose=1,
    )

    # --------------------------------------------------
    # 4. Train
    # --------------------------------------------------
    history = model.fit(
        X_train,
        y_train,
        validation_data=(X_val, y_val),
        epochs=100,
        batch_size=32,
        callbacks=[early_stopping_cb, checkpoint_cb],
    )

    # Optionally evaluate on test set
    if X_test is not None and y_test is not None and len(X_test) > 0:
        print("\nEvaluating on test set...")
        test_loss, test_mae = model.evaluate(X_test, y_test, verbose=0)
        print(f"Test loss (MSE): {test_loss:.4f}, Test MAE: {test_mae:.4f}")

    # --------------------------------------------------
    # 5. Load best model (from checkpoint) before export
    # --------------------------------------------------
    print(f"\nLoading best model from checkpoint: {checkpoint_path}")
    best_model = tf.keras.models.load_model(str(checkpoint_path))

    # --------------------------------------------------
    # 6. Save as SavedModel
    # --------------------------------------------------
    saved_model_dir = models_dir / "saved_model"
    print(f"Saving SavedModel to: {saved_model_dir}")
    best_model.save(str(saved_model_dir))  # Path -> str

    # --------------------------------------------------
    # 7. Convert SavedModel to TFLite
    # --------------------------------------------------
    print("Converting SavedModel to TFLite...")
    converter = tf.lite.TFLiteConverter.from_saved_model(str(saved_model_dir))

    # Allow TF Select ops so TensorList and some LSTM internals are supported
    converter.target_spec.supported_ops = [
        tf.lite.OpsSet.TFLITE_BUILTINS,
        tf.lite.OpsSet.SELECT_TF_OPS,
    ]

    # Follow TFLite’s own error message suggestions:
    #  - don't aggressively lower tensor list ops
    #  - enable resource variables handling
    converter._experimental_lower_tensor_list_ops = False
    converter.experimental_enable_resource_variables = True

    try:
        tflite_model = converter.convert()
        tflite_path = models_dir / "cycle_lstm.tflite"
        with open(tflite_path, "wb") as f:
            f.write(tflite_model)
        print(f"✅ TFLite model saved to: {tflite_path}")
    except Exception as e:
        print("❌ TFLite conversion failed!")
        print(type(e), e)



if __name__ == "__main__":
    print(f"TensorFlow version: {tf.__version__}")
    try:
        print(f"Keras backend version: {tf.keras.__version__}")
    except AttributeError:
        print("Keras backend version: (legacy tf.keras in use)")

    train()
