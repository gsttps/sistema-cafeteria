#!/bin/sh
set -e

echo "Ejecutando migraciones de base de datos..."
# -c: el WORKDIR de la imagen es /app y el alembic.ini vive en backend/
alembic -c backend/alembic.ini upgrade head

echo "Iniciando servidor FastAPI..."
exec uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 1
