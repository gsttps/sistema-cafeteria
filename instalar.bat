@echo off
chcp 65001 >nul
echo ====================================================
echo    Instalador de Dependencias - Sistema Cafetería   
echo ====================================================
echo.

:: 1. Backend (Python/FastAPI)
echo [1/2] Configurando el Backend (Python)...

if not exist "backend" (
    echo [ERROR] No se encuentra la carpeta 'backend'
    pause
    exit /b 1
)

cd backend

if not exist ".venv" (
    echo Creando entorno virtual de Python (.venv)...
    python -m venv .venv
)

echo Instalando librerias desde requirements.txt...
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip >nul 2>&1
pip install -r requirements.txt
call .venv\Scripts\deactivate.bat

cd ..
echo [OK] Backend listo.
echo.

:: 2. Frontend (React/Vite)
echo [2/2] Configurando el Frontend (React/Node.js)...

if not exist "frontend" (
    echo [ERROR] No se encuentra la carpeta 'frontend'
    pause
    exit /b 1
)

cd frontend

echo Instalando paquetes de NPM...
:: Usamos 'call' porque npm es un archivo .cmd y sin 'call' cortaria el script
call npm install

cd ..
echo.
echo [OK] Frontend listo.
echo.

echo ====================================================
echo  ¡Todas las dependencias han sido instaladas! 
echo ====================================================
echo Para iniciar el proyecto puedes usar comandos como:
echo  Backend: cd backend ^&^& call .venv\Scripts\activate.bat ^&^& uvicorn main:app --reload
echo  Frontend: cd frontend ^&^& npm run dev
echo.
pause
