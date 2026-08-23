# ── Stage 1: Build React/Vite Frontend ──────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app

# Install frontend dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy frontend source
COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY .oxlintrc.json ./
COPY styles.css ./
COPY src/ src/
COPY public/ public/

# Build frontend
RUN npm run build

# ── Stage 2: Python/FastAPI Backend ─────────────────────────────────
FROM python:3.12-slim AS production

WORKDIR /app

# Install system dependencies for psycopg2-binary
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ backend/

# Copy built frontend from Stage 1
COPY --from=frontend-build /app/dist dist/

# Create startup script
RUN echo '#!/bin/bash\n\
set -e\n\
echo "LIFEGRID Starting..."\n\
# Run database migrations\n\
cd /app/backend && python -m alembic upgrade head 2>/dev/null || echo "Alembic migrations skipped (tables may already exist)"\n\
cd /app\n\
# Seed database (idempotent)\n\
python -m backend.scripts.seed_database\n\
echo "Starting FastAPI on port ${PORT:-8000}"\n\
exec uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1\n\
' > /app/start.sh && chmod +x /app/start.sh

EXPOSE ${PORT:-8000}

CMD ["/app/start.sh"]
