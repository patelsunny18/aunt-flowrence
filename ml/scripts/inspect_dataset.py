import pandas as pd
from pathlib import Path

RAW_PATH = Path(__file__).resolve().parents[1] / "data" / "raw" / "menstrual_cycle_data.csv"

def main():
    print("Loading from:", RAW_PATH)
    df = pd.read_csv(RAW_PATH)
    print("\nShape:", df.shape)
    print("\nColumns:\n", df.columns.tolist())
    print("\nFirst 5 rows:\n", df.head())

if __name__ == "__main__":
    main()
