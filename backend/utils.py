# utils.py
import csv
import io
from typing import List, Dict, Any

REQUIRED_COLUMNS = [
    'Customer ID','Credit Limit','Utilisation %','Avg Payment Ratio','Min Due Paid Frequency',
    'Merchant Mix Index','Cash Withdrawal %','Recent Spend Change %','DPD Bucket Next Month'
]

def parse_csv_bytes(content: bytes, encoding: str = 'utf-8') -> List[Dict[str, Any]]:
    """
    Parse CSV bytes into a list of dict rows using csv.DictReader.
    Returns list of dict where keys are the header column names.
    """
    text = content.decode(encoding, errors='replace')
    f = io.StringIO(text)
    reader = csv.DictReader(f)
    rows = []
    for r in reader:
        # keep as-is (strings); scoring functions will coerce to float
        rows.append({k.strip(): (v.strip() if isinstance(v, str) else v) for k,v in r.items()})
    return rows

def validate_records_columns(records: List[Dict[str, Any]]) -> List[str]:
    """
    Check first record header columns (keys) against REQUIRED_COLUMNS.
    Returns list of missing columns (empty list if OK).
    """
    if not records:
        return REQUIRED_COLUMNS[:]  # everything missing
    first = records[0]
    present = list(first.keys())
    missing = [c for c in REQUIRED_COLUMNS if c not in present]
    return missing

def records_to_csv_bytes(records: List[Dict[str, Any]], encoding: str = 'utf-8') -> bytes:
    """
    Convert list of dicts (all having same keys) to CSV bytes.
    """
    if not records:
        return b""
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(records[0].keys()))
    writer.writeheader()
    for r in records:
        writer.writerow(r)
    return output.getvalue().encode(encoding)
