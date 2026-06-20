from fastapi import Depends, HTTPException, Request, status
from jose import jwt, JWTError
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from typing import TYPE_CHECKING
from backend.core.configuracion import configuracion

if TYPE_CHECKING:
    from backend.modelos import Usuario

# Crear motor
motor = create_engine(configuracion.database_url, pool_pre_ping=True)

# Clase SesionLocal
SesionLocal = sessionmaker(autocommit=False, autoflush=False, bind=motor)

# Base declarativa
Base = declarative_base()

# Dependencia para obtener la sesión de base de datos
def obtener_db():
    db = SesionLocal()
    try:
        yield db
    finally:
        db.close()

def _extraer_token(request: Request) -> str | None:
    """Extrae el token JWT de la cookie HttpOnly o del header Authorization."""
    # Prioridad 1: Cookie HttpOnly (más seguro)
    token = request.cookies.get("access_token")
    if token:
        return token
    # Prioridad 2: Header Authorization (para API externa / testing)
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None

def obtener_usuario_actual(request: Request, db: Session = Depends(obtener_db)) -> "Usuario":
    """Dependencia que valida la sesión del usuario mediante cookie o header JWT."""
    from backend.modelos import Usuario

    token = _extraer_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado. Inicie sesión.",
        )

    try:
        payload = jwt.decode(token, configuracion.SECRET_KEY, algorithms=[configuracion.ALGORITHM])
        nombre_usuario: str | None = payload.get("sub")
        if nombre_usuario is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido: sin nombre de usuario.",
            )
        usuario = db.query(Usuario).filter(Usuario.username == nombre_usuario).first()
        if usuario is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario del token no encontrado.",
            )
        return usuario
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado. Inicie sesión nuevamente.",
        )

def verificar_rol_admin(usuario_actual: "Usuario" = Depends(obtener_usuario_actual)) -> "Usuario":
    if usuario_actual.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permisos insuficientes para realizar esta acción (se requiere rol de administrador)"
        )
    return usuario_actual
