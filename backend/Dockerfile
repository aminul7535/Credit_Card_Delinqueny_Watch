# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# copy only requirements first for caching
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# copy the rest of the backend code
COPY . .

# expose a port (Render will set $PORT)
EXPOSE 8000

# Use PORT env if provided by Render, default to 8000
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
