FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY backend/requirements.txt /app/requirements-backend.txt
COPY ["CHAT BOT/backend/requirements_standalone.txt", "/app/requirements-chatbot.txt"]

RUN pip install --no-cache-dir \
    -r /app/requirements-backend.txt \
    -r /app/requirements-chatbot.txt

# Copy project files
COPY . /app

# Ensure Python can import both backend and chatbot modules
ENV PYTHONPATH="/app/backend:/app/CHAT BOT/backend"

EXPOSE 8000 8001

CMD ["bash", "-c", "uvicorn app.main:app --host 0.0.0.0 --port 8000"]