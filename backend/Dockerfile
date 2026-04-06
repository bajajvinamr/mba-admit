FROM python:3.11-slim

# Cache bust: 2026-04-06-v2
WORKDIR /app

# Install system deps for building packages
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Start - read PORT from env so Railway can route correctly
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
