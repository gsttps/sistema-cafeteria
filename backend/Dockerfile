FROM python:3.10-slim

WORKDIR /app

# Instalar dependencias necesarias para compilar/ejecutar psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements usando el contexto de la raíz del proyecto
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copiar el módulo backend completo
COPY backend ./backend

# Exponer el puerto de FastAPI
EXPOSE 8000

# Configurar PYTHONPATH para que encuentre 'backend'
ENV PYTHONPATH=/app

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
