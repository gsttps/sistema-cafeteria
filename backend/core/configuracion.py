import bcrypt
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional
from jose import jwt
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

logger = logging.getLogger(__name__)

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"

class Configuracion(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        case_sensitive=True,
    )

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Sistema de Gestión de Cuentas y Fiados"

    # Clave secreta para JWT
    SECRET_KEY: str = Field(default="super_secret_cryptographic_key_for_jwt_auth_1234567890")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 horas

    # Seguridad de Cookies (HttpOnly se aplica siempre, Secure se puede desactivar para desarrollo local)
    SECURE_COOKIE: bool = Field(default=True)

    # CORS — orígenes permitidos (separados por coma)
    # Desarrollo: "http://localhost:5173,http://127.0.0.1:5173"
    # Producción: "https://tu-dominio.com"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # URL pública del backend (para CSP connect-src)
    # Desarrollo: "http://localhost:8000"
    # Producción: "https://tu-dominio.com" (mismo dominio, proxiado)
    BACKEND_PUBLIC_URL: str = "http://localhost:8000"

    # Contraseña inicial del usuario admin (si no se define, se genera una aleatoria al primer arranque)
    ADMIN_INITIAL_PASSWORD: str = ""

    # Base de Datos
    POSTGRES_USER: str = "cafe"
    POSTGRES_PASSWORD: str = "cafe"
    POSTGRES_DB: str = "cafe"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: str = "5432"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def database_url(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

configuracion = Configuracion()

if configuracion.SECRET_KEY == "super_secret_cryptographic_key_for_jwt_auth_1234567890":
    raise ValueError("CRÍTICO: No se ha configurado la variable de entorno 'SECRET_KEY'. El uso de la clave por defecto es una vulnerabilidad grave. Configure SECRET_KEY en el archivo .env.")

def verificar_contrasena(contrasena_plana: str, contrasena_hasheada: str) -> bool:
    return bcrypt.checkpw(contrasena_plana.encode('utf-8'), contrasena_hasheada.encode('utf-8'))

def obtener_hash_contrasena(contrasena: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(contrasena.encode('utf-8'), salt).decode('utf-8')

def crear_token_acceso(datos: dict, tiempo_expiracion: Optional[timedelta] = None) -> str:
    datos_a_codificar = datos.copy()
    if tiempo_expiracion:
        expiracion = datetime.now(timezone.utc) + tiempo_expiracion
    else:
        expiracion = datetime.now(timezone.utc) + timedelta(minutes=configuracion.ACCESS_TOKEN_EXPIRE_MINUTES)
    datos_a_codificar.update({"exp": expiracion})
    jwt_codificado = jwt.encode(datos_a_codificar, configuracion.SECRET_KEY, algorithm=configuracion.ALGORITHM)
    return jwt_codificado
