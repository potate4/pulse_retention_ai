"""
Dynamic LLM-based CSV Normalization Service
--------------------------------------------

This service allows you to normalize any CSV file to a custom schema dynamically.
Unlike the static llm_normalizer, this accepts a custom schema at runtime.

Given:
1. A raw CSV file path
2. A custom expected schema (list of tuples: [(column_name, description), ...])

The service:
1. Summarizes the CSV (columns, dtypes, sample rows).
2. Calls Gemini 2.5 Flash to generate a Python script that converts the raw CSV
   into the expected schema.
3. Executes the generated script in a sandboxed subprocess.
4. Validates the output CSV against the expected schema.
5. On failure, sends the previous script + error list back to the LLM to request
   a fixed script, retrying up to `max_attempts` times.
"""

from __future__ import annotations

import os
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List, Tuple, Optional

import pandas as pd
import requests
from app.core.config import settings


# ---------------------------------------------------------------------------
# 1. CSV summarization
# ---------------------------------------------------------------------------

def summarize_csv(path: str, max_rows: int = 5) -> str:
    """
    Build a compact textual summary of the CSV for prompt context.

    Includes:
    - Column names and dtypes (based on head)
    - First `max_rows` rows as CSV text
    """
    df = pd.read_csv(path)
    head = df.head(max_rows)

    col_parts: List[str] = []
    for c in head.columns:
        col_parts.append(f"{c} ({head[c].dtype})")

    summary_lines: List[str] = []
    summary_lines.append("COLUMNS:")
    summary_lines.append(", ".join(col_parts))
    summary_lines.append("")
    summary_lines.append("SAMPLE_ROWS_CSV:")
    summary_lines.append(head.to_csv(index=False))

    return "\n".join(summary_lines)


# ---------------------------------------------------------------------------
# 2. Gemini client (OpenAI-compatible API)
# ---------------------------------------------------------------------------

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
GEMINI_MODEL = "gemini-2.5-flash"


def call_gemini(system_text: str, user_text: str, timeout: int = 60) -> str:
    """
    Minimal HTTP client for Gemini 2.5 Flash using OpenAI-compatible API.

    Expects GEMINI_API_KEY in environment.
    Returns raw content string from the first choice.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY environment variable is not set")

    payload = {
        "model": GEMINI_MODEL,
        "messages": [
            {"role": "system", "content": system_text},
            {"role": "user", "content": user_text},
        ],
        "temperature": 0.2,
    }
    headers = {"Authorization": f"Bearer {api_key}"}

    resp = requests.post(GEMINI_API_URL, json=payload, headers=headers, timeout=timeout)
    resp.raise_for_status()
    data = resp.json()

    try:
        return data["choices"][0]["message"]["content"]
    except Exception as exc:
        raise RuntimeError(f"Unexpected Gemini response format: {data}") from exc


def clean_ai_response(raw: str) -> str:
    """
    Clean LLM response to extract only Python code.

    - Strip markdown fences and language tags.
    - Remove XML / pseudo-XML tags like <thought>...</thought>.
    """
    text = raw

    # Drop <thought> blocks or any XML-like tags
    text = re.sub(r"<\s*/?thought\s*>.*?</\s*thought\s*>", "", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<[^>]+>", "", text)

    # Remove common markdown fences
    text = text.replace("```python", "")
    text = text.replace("```", "")

    return text.strip()


# ---------------------------------------------------------------------------
# 3. Script static validation (contract + safety)
# ---------------------------------------------------------------------------

FORBIDDEN_SNIPPETS = [
    "subprocess",
    "requests",
    "httpx",
    "aiohttp",
    "eval(",
    "exec(",
    "os.system",
    "shutil.rmtree",
    "shutil.rmdtree",
]


def script_contract_ok(code: str, max_bytes: int = 40_000) -> Tuple[bool, List[str]]:
    """
    Validate core structural and safety requirements of generated code.

    Returns (ok, errors).
    """
    errors: List[str] = []

    if len(code.encode("utf-8")) > max_bytes:
        errors.append(f"Script is too large (> {max_bytes} bytes).")

    if "def clean(" not in code:
        errors.append("Missing required function definition: def clean(input_path, output_path).")

    if "__name__" not in code or "if __name__ == \"__main__\"" not in code and "if __name__ == '__main__'" not in code:
        errors.append("Missing required main guard: if __name__ == '__main__': ... clean(sys.argv[1], sys.argv[2]).")

    for snippet in FORBIDDEN_SNIPPETS:
        if snippet in code:
            errors.append(f"Forbidden pattern detected: {snippet!r}.")

    ok = len(errors) == 0
    return ok, errors


# ---------------------------------------------------------------------------
# 4. Execution + validation helpers
# ---------------------------------------------------------------------------

def run_clean_script(
    code: str,
    input_csv: str,
    output_csv: str,
    timeout_sec: int = 60,
) -> Tuple[int, str, str]:
    """
    Write `code` to a temporary script and execute it as:
        python script.py input_csv output_csv

    Returns (returncode, stdout, stderr).
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        script_path = Path(tmpdir) / "clean_script.py"
        script_path.write_text(code, encoding="utf-8")

        cmd = ["python", str(script_path), input_csv, output_csv]
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout_sec,
        )

        return proc.returncode, proc.stdout, proc.stderr


def validate_output_csv(
    path: str,
    expected_schema: List[Tuple[str, str]]
) -> Tuple[bool, List[str]]:
    """
    Validate that `path` points to a CSV that conforms to expected_schema.

    expected_schema: list of tuples [(column_name, description), ...]

    Returns (ok, errors).
    """
    errors: List[str] = []

    if not Path(path).exists():
        return False, [f"Output CSV file not found at {path}."]

    try:
        df = pd.read_csv(path)
    except Exception as exc:
        return False, [f"Failed to read output CSV: {exc}"]

    # Extract required columns from schema
    required_cols = set([col_name for col_name, _ in expected_schema])
    actual_cols = set(df.columns)
    missing = required_cols - actual_cols

    if missing:
        errors.append(f"Missing required columns: {sorted(missing)}")

    # Basic check: no completely empty dataframe
    if len(df) == 0:
        errors.append("Output CSV is empty (0 rows).")

    ok = len(errors) == 0
    return ok, errors


# ---------------------------------------------------------------------------
# 5. Prompt construction
# ---------------------------------------------------------------------------

def build_system_prompt(expected_schema: List[Tuple[str, str]]) -> str:
    """
    System-style instructions for Gemini.

    Describes:
    - The expected schema contract.
    - The required script structure and safety rules.
    - The repair behavior (PREVIOUS_SCRIPT + ERRORS_TO_FIX).
    """
    # Build schema text from list of tuples
    schema_lines = []
    for col_name, description in expected_schema:
        schema_lines.append(f"    {repr(col_name)}: {description}")
    schema_text = "\n".join(schema_lines)

    return f"""
You are an expert data engineer.
Your job is to generate Python code that normalizes a raw CSV file to a custom expected schema.
You will receive a summary of the raw CSV, and sometimes your previous script plus a list of
ERRORS_TO_FIX when your prior attempt failed.

EXPECTED_SCHEMA (column_name: description):
{{
{schema_text}
}}

Your task:
- Map the input CSV columns to the EXPECTED_SCHEMA fields based on column names, descriptions, and sample values.
- Perform necessary preprocessing: handle null values, drop unnecessary columns, type casts, etc.
- Ensure the output CSV contains EXACTLY the columns defined in EXPECTED_SCHEMA.

REQUIRED CONTRACT FOR THE SCRIPT YOU OUTPUT:
1. Define def clean(input_path: str, output_path: str) -> None:
   - Read the CSV at input_path using pandas.read_csv.
   - Infer reasonable mappings from raw columns to EXPECTED_SCHEMA fields.
   - Perform preprocessing:
       * Handle null values appropriately (fill, drop, or convert)
       * Drop unnecessary columns not in the schema
       * Cast types as needed based on the descriptions
       * Create derived columns if necessary
   - Write the final DataFrame to output_path using df.to_csv(index=False).
   - The output MUST have exactly the columns in EXPECTED_SCHEMA, in any order.

2. Include a main guard:
   if __name__ == "__main__":
       import sys
       if len(sys.argv) != 3:
           raise SystemExit("Usage: python script.py <input_csv> <output_csv>")
       clean(sys.argv[1], sys.argv[2])

3. Allowed imports:
   - pandas, numpy, datetime, re, sys, os (for path handling only), typing.

4. Forbidden behavior:
   - Do NOT import subprocess, requests, httpx, aiohttp, or any networking libraries.
   - Do NOT call eval or exec.
   - Do NOT call os.system or delete files.
   - Do NOT access files outside the input/output paths that are passed in.

5. Output format:
   - Return ONLY Python code.
   - No markdown fences, no comments, no explanations, no extra text.

REPAIR BEHAVIOR:
- On some prompts you will receive:
    PREVIOUS_SCRIPT: <your last script>
    ERRORS_TO_FIX:
      - <error 1>
      - <error 2>
  You MUST output a FULL corrected script that still obeys the same contract.
  Do NOT output a diff; always send the complete updated script.
""".strip()


def build_user_prompt(
    raw_summary: str,
    last_script: Optional[str],
    last_error_text: Optional[str],
    last_error_list: List[str],
) -> str:
    """
    Build the user message for Gemini, including CSV summary, and, on retries,
    the previous script plus a bullet list of errors to fix.
    """
    base = [
        "RAW_CSV_SUMMARY:",
        raw_summary,
        "",
        "GOAL:",
        "Write a script that follows the EXPECTED_SCHEMA contract described in the system message.",
    ]

    if last_script is not None:
        base.append("")
        base.append("PREVIOUS_SCRIPT:")
        base.append(last_script)
        base.append("")
        base.append("ERRORS_TO_FIX:")
        if last_error_list:
            for err in last_error_list:
                base.append(f"- {err}")
        elif last_error_text:
            base.append(f"- {last_error_text}")
        else:
            base.append("- Script failed, but no specific error details were captured.")

        base.append("")
        base.append("Please output a FULL corrected Python script that obeys the same contract.")

    return "\n".join(base)


# ---------------------------------------------------------------------------
# 6. High-level orchestration
# ---------------------------------------------------------------------------

def normalize_with_dynamic_llm(
    input_csv: str,
    output_csv: str,
    expected_schema: List[Tuple[str, str]],
    max_attempts: int = 5,
    gemini_timeout_sec: int = 60,
    script_timeout_sec: int = 60,
) -> Tuple[bool, Dict[str, object]]:
    """
    Normalize a raw CSV to a custom expected schema using Gemini-generated code.

    Args:
        input_csv: Path to the raw CSV.
        output_csv: Path where the normalized CSV should be written.
        expected_schema: List of tuples [(column_name, description), ...]
        max_attempts: Maximum number of code-generation / repair attempts.
        gemini_timeout_sec: HTTP timeout for LLM calls.
        script_timeout_sec: Timeout for executing generated scripts.

    Returns:
        (success_flag, metadata_dict)

        On success:
            success_flag = True
            metadata = {
                "attempts": <int>,
                "last_stdout": <str>,
                "generated_script": <str>,
            }

        On failure:
            success_flag = False
            metadata = {
                "attempts": <int>,
                "last_error_text": <str>,
                "last_error_list": <List[str]>,
                "last_script": <str | None>,
            }
    """
    system_prompt = build_system_prompt(expected_schema)
    raw_summary = summarize_csv(input_csv)

    last_script: Optional[str] = None
    last_error_text: Optional[str] = None
    last_error_list: List[str] = []

    last_stdout: str = ""

    for attempt in range(1, max_attempts + 1):
        user_prompt = build_user_prompt(
            raw_summary=raw_summary,
            last_script=last_script,
            last_error_text=last_error_text,
            last_error_list=last_error_list,
        )

        # Call LLM
        raw_resp = call_gemini(system_prompt, user_prompt, timeout=gemini_timeout_sec)
        code = clean_ai_response(raw_resp)
        last_script = code

        # Static contract/safety checks
        ok_contract, contract_errors = script_contract_ok(code)
        if not ok_contract:
            last_error_text = "Generated code does not satisfy the required structure or safety rules."
            last_error_list = contract_errors
            continue

        # Execute script
        try:
            retcode, stdout, stderr = run_clean_script(
                code=code,
                input_csv=input_csv,
                output_csv=output_csv,
                timeout_sec=script_timeout_sec,
            )
        except subprocess.TimeoutExpired:
            last_error_text = f"Script execution timed out after {script_timeout_sec} seconds."
            last_error_list = []
            continue
        except Exception as exc:
            last_error_text = f"Unexpected error while executing script: {exc}"
            last_error_list = []
            continue

        last_stdout = stdout

        if retcode != 0:
            truncated_stderr = stderr[:1000] if stderr else ""
            truncated_stdout = stdout[:500] if stdout else ""
            last_error_text = f"Runtime error: process exited with code {retcode}."
            last_error_list = [
                f"stderr (truncated): {truncated_stderr}",
                f"stdout (truncated): {truncated_stdout}",
            ]
            continue

        # Validate output CSV
        ok_output, validation_errors = validate_output_csv(output_csv, expected_schema)
        if not ok_output:
            last_error_text = "Validation failed: output CSV does not conform to EXPECTED_SCHEMA."
            last_error_list = validation_errors
            continue

        # Success
        return True, {
            "attempts": attempt,
            "last_stdout": last_stdout,
            "generated_script": last_script,
        }

    # All attempts failed
    return False, {
        "attempts": max_attempts,
        "last_error_text": last_error_text,
        "last_error_list": last_error_list,
        "last_script": last_script,
        "last_stdout": last_stdout,
    }


__all__ = [
    "normalize_with_dynamic_llm",
    "summarize_csv",
    "call_gemini",
    "clean_ai_response",
    "script_contract_ok",
    "run_clean_script",
    "validate_output_csv",
]
