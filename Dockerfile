FROM python:3.11-slim

WORKDIR /app

# Install requirements
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend /app

# Railway will inject PORT (usually 8080)
ENV PORT=8080

# Start FastAPI using the injected port
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
