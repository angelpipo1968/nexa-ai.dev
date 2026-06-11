FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates nodejs npm \
    && rm -rf /var/lib/apt/lists/* \
    && git config --global --add safe.directory /workspace

RUN pip install --no-cache-dir fastapi==0.115.0 uvicorn[standard]==0.30.6 requests==2.32.3 redis==5.0.8

COPY . /app

EXPOSE 5000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
