#!/bin/sh
set -e

echo "Ejecutando migraciones de base de datos..."
alembic upgrade head

echo "Iniciando servidor FastAPI..."
exec uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 2
