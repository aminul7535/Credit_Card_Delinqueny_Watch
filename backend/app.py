# app.py
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import io
from scoring import score_row
from utils import parse_csv_bytes, validate_records_columns, records_to_csv_bytes

app = FastAPI(title="Credit Card Early Risk API - Simple (no pandas)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# simple in-memory store
LAST_RESULTS = {
    'records': []  # list of dicts (original row keys + scoring fields)
}

@app.get("/")
async def root():
    return {"message": "Credit Card Early Risk API (CSV parsing without pandas). POST /upload to score a CSV file."}

@app.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.csv'):
        raise HTTPException(status_code=400, detail="Please upload a CSV file with .csv extension.")
    content = await file.read()
    try:
        records = parse_csv_bytes(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Unable to parse CSV: {e}")

    missing = validate_records_columns(records)
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing required columns: {missing}")

    scored_rows = []
    for r in records:
        score_out = score_row(r)
        out = r.copy()
        # attach computed fields
        out.update({
            'raw_score': score_out['raw_score'],
            'score_norm': score_out['score_norm'],
            'risk_class': score_out['risk_class'],
            'top3_contribs': str(score_out['top3']),
            'contribs': str(score_out['contribs'])
        })
        scored_rows.append(out)

    LAST_RESULTS['records'] = scored_rows

    total = len(scored_rows)
    high = sum(1 for r in scored_rows if r.get('risk_class') == 'High')
    medium = sum(1 for r in scored_rows if r.get('risk_class') == 'Medium')
    low = sum(1 for r in scored_rows if r.get('risk_class') == 'Low')

    response = {
        'total_customers': total,
        'high_risk': high,
        'medium_risk': medium,
        'low_risk': low,
        'records': scored_rows
    }
    return JSONResponse(content=response)

@app.get("/summary")
async def get_summary():
    recs = LAST_RESULTS.get('records', [])
    if not recs:
        return {"message": "No data processed yet."}
    total = len(recs)
    high = sum(1 for r in recs if r.get('risk_class') == 'High')
    medium = sum(1 for r in recs if r.get('risk_class') == 'Medium')
    low = sum(1 for r in recs if r.get('risk_class') == 'Low')
    return {
        'total_customers': total,
        'high_risk': high,
        'medium_risk': medium,
        'low_risk': low
    }

@app.get("/customer/{customer_id}")
async def get_customer(customer_id: str):
    recs = LAST_RESULTS.get('records', [])
    for r in recs:
        if str(r.get('Customer ID')) == str(customer_id):
            return r
    raise HTTPException(status_code=404, detail="Customer not found in last processed file.")

@app.get("/download_scored_csv")
async def download_scored_csv():
    recs = LAST_RESULTS.get('records', [])
    if not recs:
        raise HTTPException(status_code=404, detail="No scored data available. Upload first.")
    csv_bytes = records_to_csv_bytes(recs)
    return StreamingResponse(io.BytesIO(csv_bytes), media_type="text/csv", headers={
        'Content-Disposition': 'attachment; filename="scored_customers.csv"'
    })
