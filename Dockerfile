FROM python:3.11-slim

WORKDIR /app

# copy only requirements first for caching
COPY backend/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# copy backend code
COPY backend /app

# optional: default PORT if not provided (Railway sets PORT)
ENV PORT=8000

# use sh -c so shell expands $PORT at runtime
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
