from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt
from passlib.context import CryptContext
from pydantic_settings import BaseSettings
from pydantic import Field

class Configuracion(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Sistema de Gestión de Cuentas y Fiados"
    
    # Clave secreta para JWT
    SECRET_KEY: str = Field(default="super_secret_cryptographic_key_for_jwt_auth_1234567890")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 horas

    # Seguridad de Cookies (HttpOnly se aplica siempre, Secure se puede desactivar para desarrollo local)
    SECURE_COOKIE: bool = Field(default=True)

    # Base de Datos
    POSTGRES_USER: str = "cafe"
    POSTGRES_PASSWORD: str = "cafe"
    POSTGRES_DB: str = "cafe"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: str = "5432"

    @property
    def database_url(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    class Config:
        env_file = ".env"
        case_sensitive = True

configuracion = Configuracion()

if configuracion.SECRET_KEY == "super_secret_cryptographic_key_for_jwt_auth_1234567890":
    raise ValueError("CRÍTICO: No se ha configurado la variable de entorno 'SECRET_KEY'. El uso de la clave por defecto es una vulnerabilidad grave. Configure SECRET_KEY en el archivo .env.")


# --- HELPERS DE SEGURIDAD ---
import bcrypt

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
