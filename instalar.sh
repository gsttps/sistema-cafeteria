#!/bin/bash

# Colores para la terminal
VERDE='\033[0;32m'
AZUL='\033[0;34m'
ROJO='\033[0;31m'
NC='\033[0m' # Sin color

echo -e "${AZUL}====================================================${NC}"
echo -e "${AZUL}   Instalador de Dependencias - Sistema Cafetería   ${NC}"
echo -e "${AZUL}====================================================${NC}\n"

# 1. Backend (Python/FastAPI)
echo -e "${VERDE}[1/2] Configurando el Backend (Python)...${NC}"

# Chequear si existe la carpeta backend
if [ ! -d "backend" ]; then
    echo -e "${ROJO}Error: No se encuentra la carpeta 'backend'${NC}"
    exit 1
fi

cd backend || exit

# Crear entorno virtual si no existe
if [ ! -d ".venv" ]; then
    echo "Creando entorno virtual de Python (.venv)..."
    python3 -m venv .venv
fi

# Activar e instalar dependencias
echo "Instalando librerías desde requirements.txt..."
source .venv/bin/activate
pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt
deactivate

cd ..
echo -e "${VERDE}✅ Backend listo.${NC}\n"

# 2. Frontend (React/Vite)
echo -e "${VERDE}[2/2] Configurando el Frontend (React/Node.js)...${NC}"

# Chequear si existe la carpeta frontend
if [ ! -d "frontend" ]; then
    echo -e "${ROJO}Error: No se encuentra la carpeta 'frontend'${NC}"
    exit 1
fi

cd frontend || exit

# Instalar módulos de node
echo "Instalando paquetes de NPM..."
npm install

cd ..
echo -e "\n${VERDE}✅ Frontend listo.${NC}\n"

echo -e "${AZUL}====================================================${NC}"
echo -e "${VERDE} 🎉 ¡Todas las dependencias han sido instaladas! 🎉 ${NC}"
echo -e "${AZUL}====================================================${NC}"
echo "Para iniciar el proyecto puedes usar comandos como:"
echo " Backend: cd backend && source .venv/bin/activate && uvicorn main:app --reload"
echo " Frontend: cd frontend && npm run dev"
echo " (O levantar los contenedores de Docker si lo prefieres)"
