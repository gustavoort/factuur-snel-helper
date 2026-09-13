FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libgobject-2.0-0 \
    libglib2.0-0 \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    fonts-dejavu-core \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

ENV SSL_CERT_FILE=/usr/local/lib/python3.13/site-packages/certifi/cacert.pem
ENV REQUESTS_CA_BUNDLE=/usr/local/lib/python3.13/site-packages/certifi/cacert.pem

COPY . .

# Apply production application fixes kept as an auditable patch script.
RUN python patch_server.py

# Force Python/PyMongo to use the current certifi CA bundle.
RUN python - <<'PY'
from pathlib import Path

path = Path("server.py")
source = path.read_text(encoding="utf-8")

if "import certifi" not in source:
    source = source.replace("import stripe\n", "import stripe\nimport certifi\n", 1)

old = "client = AsyncIOMotorClient(MONGO_URL)"
new = "client = AsyncIOMotorClient(MONGO_URL, tls=True, tlsCAFile=certifi.where())"

if old in source:
    source = source.replace(old, new, 1)
elif new not in source:
    raise RuntimeError("MongoDB client line not found; refusing unsafe patch")

path.write_text(source, encoding="utf-8")
PY

CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"]
