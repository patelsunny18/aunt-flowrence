import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"  # keep consistent with training

import numpy as np
from pathlib import Path
import tensorflow as tf


def main():
    project_root = Path(__file__).resolve().parents[2]

    # Paths
    data_path = project_root / "ml" / "data" / "processed" / "cycle_sequences.npz"
    models_dir = project_root / "ml" / "models"
    keras_model_path = models_dir / "best_lstm_model.keras"
    tflite_model_path = models_dir / "cycle_lstm.tflite"

    print(f"Loading data from: {data_path}")
    data = np.load(data_path, allow_pickle=True)
    X = data["X"]
    y = data["y"]

    print(f"X shape: {X.shape}, y shape: {y.shape}")

    # Take one sample (or a small batch) for testing
    sample = X[0:1].astype("float32")  # shape (1, seq_len, num_features)
    print(f"Sample shape: {sample.shape}")

    # --- Keras prediction (reference) ---
    print(f"\nLoading Keras model from: {keras_model_path}")
    keras_model = tf.keras.models.load_model(str(keras_model_path))
    keras_pred = keras_model.predict(sample)
    print(f"Keras prediction: {keras_pred.flatten()}")

    # --- TFLite prediction ---
    print(f"\nLoading TFLite model from: {tflite_model_path}")
    interpreter = tf.lite.Interpreter(model_path=str(tflite_model_path))
    interpreter.allocate_tensors()

    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    print("\nTFLite input details:", input_details)
    print("TFLite output details:", output_details)

    # Make sure our sample matches expected dtype/shape
    input_index = input_details[0]["index"]
    expected_shape = input_details[0]["shape"]
    expected_dtype = input_details[0]["dtype"]

    print(f"\nExpected input shape: {expected_shape}, dtype: {expected_dtype}")

    # Reshape if needed (usually should already be (1, seq_len, num_features))
    sample_for_tflite = sample.astype(expected_dtype)
    if tuple(sample_for_tflite.shape) != tuple(expected_shape):
        print(f"Reshaping sample from {sample_for_tflite.shape} to {expected_shape}")
        sample_for_tflite = sample_for_tflite.reshape(expected_shape)

    interpreter.set_tensor(input_index, sample_for_tflite)
    interpreter.invoke()

    output_index = output_details[0]["index"]
    tflite_pred = interpreter.get_tensor(output_index)

    print(f"\nTFLite prediction: {tflite_pred.flatten()}")

    # Compare
    diff = np.abs(keras_pred.flatten() - tflite_pred.flatten())
    print(f"\n|Keras - TFLite| difference: {diff}")


if __name__ == "__main__":
    print(f"TensorFlow version: {tf.__version__}")
    main()
