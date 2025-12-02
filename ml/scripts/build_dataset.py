import pandas as pd
import numpy as np
from pathlib import Path

# Paths
RAW_PATH = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "raw"
    / "menstrual_cycle_data.csv"
)
OUT_PATH = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "processed"
    / "cycle_sequences.npz"
)

# Column names from your inspect output
USER_COL = "ClientID"
CYCLE_NUM_COL = "CycleNumber"
TARGET_COL = "LengthofCycle"  # what we want to predict

# Features we’ll feed into the model for each cycle
FEATURE_COLS = [
    "LengthofCycle",
    "MeanCycleLength",
    "EstimatedDayofOvulation",
    "LengthofLutealPhase",
    "FirstDayofHigh",
    "TotalNumberofHighDays",
    "TotalHighPostPeak",
    "TotalNumberofPeakDays",
    "TotalDaysofFertility",
    "TotalFertilityFormula",
    "LengthofMenses",
    "MeanMensesLength",
    "MeanBleedingIntensity",
    "NumberofDaysofIntercourse",
    "IntercourseInFertileWindow",
    "UnusualBleeding",
    "PhasesBleeding",
    "Age",
    "BMI",
]

SEQ_LEN = 3  # use last 3 cycles to predict the next one


def load_raw() -> pd.DataFrame:
    print("Loading raw data from:", RAW_PATH)
    df = pd.read_csv(RAW_PATH)
    print("Raw shape:", df.shape)
    return df


from collections import OrderedDict

def preprocess(df: pd.DataFrame) -> pd.DataFrame:
    # All columns we *want*
    desired_cols = [USER_COL, CYCLE_NUM_COL, TARGET_COL] + FEATURE_COLS

    # Keep only those that actually exist
    present_cols = [c for c in desired_cols if c in df.columns]

    # Deduplicate while preserving order
    keep_cols = list(dict.fromkeys(present_cols))

    print("\nKeeping columns:", keep_cols)
    df = df[keep_cols].copy()

    # Numeric columns = TARGET + FEATURES (deduped)
    numeric_present = [c for c in (FEATURE_COLS + [TARGET_COL]) if c in df.columns]
    numeric_cols = list(dict.fromkeys(numeric_present))

    print("\nNumeric columns that will be converted:", numeric_cols)

    # Safely coerce numeric columns
    for col in numeric_cols:
        values = df[col].values
        converted = pd.to_numeric(values, errors="coerce")
        df[col] = converted

    # 🔧 Impute missing numeric values with column medians
    if numeric_cols:
        num_df = df[numeric_cols]
        medians = num_df.median()
        df[numeric_cols] = num_df.fillna(medians)

    # Drop rows missing critical ID / cycle index / target
    required_for_row = [c for c in [USER_COL, CYCLE_NUM_COL, TARGET_COL] if c in df.columns]
    df = df.dropna(subset=required_for_row)

    # Sort by user + cycle number if both exist
    sort_cols = [c for c in [USER_COL, CYCLE_NUM_COL] if c in df.columns]
    if sort_cols:
        df = df.sort_values(sort_cols)

    print("After preprocess shape:", df.shape)
    return df




def build_sequences(df: pd.DataFrame):
    """
    Build sequences of length SEQ_LEN from the entire dataset
    (sorted by ClientID + CycleNumber), ignoring per-user boundaries.

    Each sample:
      X_seq: last SEQ_LEN cycles (shape: SEQ_LEN x F)
      y_val: next cycle's length (scalar)
    """
    sort_cols = [c for c in [USER_COL, CYCLE_NUM_COL] if c in df.columns]
    if sort_cols:
        df = df.sort_values(sort_cols)

    feat = df[FEATURE_COLS].to_numpy(dtype=np.float32)
    target = df[TARGET_COL].to_numpy(dtype=np.float32)

    X_list: list[np.ndarray] = []
    y_list: list[float] = []

    n_rows = len(df)
    if n_rows <= SEQ_LEN:
        raise ValueError(f"Not enough rows ({n_rows}) for seq_len={SEQ_LEN}")

    for start in range(0, n_rows - SEQ_LEN):
        end = start + SEQ_LEN
        X_seq = feat[start:end, :]   # (SEQ_LEN, F)
        y_val = target[end]          # next cycle length

        if np.isnan(y_val):
            continue

        X_list.append(X_seq)
        y_list.append(y_val)

    if not X_list:
        raise ValueError("No sequences built (this should not happen now).")

    X = np.stack(X_list, axis=0)
    y = np.array(y_list, dtype=np.float32)

    print("Built X shape:", X.shape)
    print("Built y shape:", y.shape)
    return X, y




def normalize_features(X: np.ndarray):
    """
    Normalize features across the whole dataset (per feature).
    X shape: (N, T, F)
    """
    N, T, F = X.shape
    flat = X.reshape(N * T, F)

    mean = flat.mean(axis=0)
    std = flat.std(axis=0)
    std[std == 0] = 1.0  # avoid divide-by-zero

    flat_norm = (flat - mean) / std
    X_norm = flat_norm.reshape(N, T, F)
    return X_norm, mean.astype(np.float32), std.astype(np.float32)


def main():
    df = load_raw()
    df = preprocess(df)
    X, y = build_sequences(df)
    X_norm, mean, std = normalize_features(X)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    np.savez(
        OUT_PATH,
        X=X_norm,
        y=y,
        mean=mean,
        std=std,
        feature_cols=np.array(FEATURE_COLS),
        seq_len=np.array([SEQ_LEN], dtype=np.int32),
    )
    print("Saved processed dataset to", OUT_PATH)


if __name__ == "__main__":
    main()
