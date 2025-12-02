"""
Quick helper script to test the LLM-based auto CSV processor.

It reads `datasets/telco_churn.csv`, generates mappings via Gemini using
`auto_preprocess_dataset`, and writes the normalized output to
`datasets/telco_auto_normalized.csv`.
"""

from pathlib import Path

from app.helpers.auto_mapping_generator import auto_preprocess_dataset


BASE_DIR = Path(__file__).resolve().parent
INPUT_PATH = BASE_DIR / "datasets" / "eComm.csv"
OUTPUT_PATH = BASE_DIR / "datasets" / "eComm_AUTOs.csv"


def main() -> None:
    print(f"Input:  {INPUT_PATH}")
    print(f"Output: {OUTPUT_PATH}")

    auto_preprocess_dataset(
        input_csv=str(INPUT_PATH),
        output_csv=str(OUTPUT_PATH),
        show_plan=True,
    )


if __name__ == "__main__":
    main()


