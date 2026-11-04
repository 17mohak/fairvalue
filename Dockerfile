# FairValue prediction API (research prototype). Serves the full-data refits in models/.
# Build after `python -m src.models.final` has written models/*.joblib.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 FAIRVALUE_MODELS_DIR=/app/models
WORKDIR /app

COPY requirements-api.txt .
RUN pip install --no-cache-dir -r requirements-api.txt

# Only the code the API imports, plus the trained models and their registry.
COPY src/__init__.py src/config.py src/
COPY src/features/ src/features/
COPY src/models/__init__.py src/models/tiers.py src/models/
COPY src/api/ src/api/
COPY models/model_registry.json models/*.joblib models/

RUN useradd --create-home appuser
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"
CMD ["uvicorn", "src.api.app:app", "--host", "0.0.0.0", "--port", "8000"]
