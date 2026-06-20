import os
import shutil
from contextlib import asynccontextmanager

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from backend.core.configuracion import configuracion, obtener_hash_contrasena, verificar_contrasena, crear_token_acceso
from backend.base_datos import obtener_db, obtener_usuario_actual, SesionLocal, _extraer_token
from backend.modelos import Usuario
from backend.esquemas import UsuarioCrear, UsuarioRespuesta, Token, CambiarUsername, CambiarPassword
from backend.routers import clientes, productos, cuentas, balances, categorias

# Directorio para almacenar el logo personalizado
LOGO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")


# --- EVENTO DE INICIO: crear usuario por defecto cafe/cafe ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SesionLocal()
    try:
        usuario_defecto = db.query(Usuario).filter(Usuario.username == "cafe").first()
        if not usuario_defecto:
            usuario_defecto = Usuario(
                username="cafe",
                password_hash=obtener_hash_contrasena("cafe"),
                rol="admin"
            )
            db.add(usuario_defecto)
            db.commit()
            print("✅ Usuario por defecto creado: cafe / cafe (rol: admin)")
        else:
            print("✅ Usuario por defecto 'cafe' ya existe.")
    finally:
        db.close()
    yield


app = FastAPI(
    title=configuracion.PROJECT_NAME,
    openapi_url=f"{configuracion.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Configuración oficial y segura de CORS
origenes_permitidos = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://192.168.100.12:5173", # IP local de desarrollo, ajustar para producción
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origenes_permitidos,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

# Middleware para añadir Cabeceras de Seguridad (Mitigación XSS, Clickjacking, MIME-sniffing)
@app.middleware("http")
async def agregar_cabeceras_seguridad(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' data: data: https://fonts.gstatic.com; "
        "img-src 'self' data: blob: /api/v1/auth/logo; "
        "connect-src 'self' http://localhost:8000 ws://localhost:8000 http://127.0.0.1:8000 ws://127.0.0.1:8000 http://192.168.100.12:8000 ws://192.168.100.12:8000;"
    )
    return response


# Router de Autenticación
auth_router = APIRouter(prefix="/auth", tags=["Autenticación"])


def _establecer_cookie_sesion(response: Response, username: str, rol: str):
    """Helper: genera JWT y establece cookie HttpOnly."""
    token = crear_token_acceso(datos={"sub": username, "rol": rol})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=configuracion.SECURE_COOKIE,
        samesite="lax",
        max_age=configuracion.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    return token


@auth_router.post("/login", response_model=Token)
def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(obtener_db)
):
    usuario = db.query(Usuario).filter(Usuario.username == form_data.username).first()
    if not usuario or not verificar_contrasena(form_data.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
        )
    token_acceso = _establecer_cookie_sesion(response, usuario.username, usuario.rol)
    return {"access_token": token_acceso, "token_type": "bearer"}


@auth_router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    return {"mensaje": "Sesión cerrada exitosamente"}


@auth_router.get("/me", response_model=UsuarioRespuesta)
def obtener_perfil(usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    return usuario_actual


# --- CAMBIO DE CREDENCIALES ---

@auth_router.put("/cambiar-username", response_model=UsuarioRespuesta)
def cambiar_username(
    datos: CambiarUsername,
    response: Response,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    # Verificar contraseña actual
    if not verificar_contrasena(datos.password_actual, usuario_actual.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta"
        )
    # Verificar que el nuevo nombre no esté en uso
    existente = db.query(Usuario).filter(Usuario.username == datos.username_nuevo).first()
    if existente and existente.id != usuario_actual.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de usuario ya está en uso por otra cuenta"
        )

    usuario_actual.username = datos.username_nuevo
    db.commit()
    db.refresh(usuario_actual)

    # Re-emitir cookie con el nuevo username en el JWT
    _establecer_cookie_sesion(response, usuario_actual.username, usuario_actual.rol)

    return usuario_actual


@auth_router.put("/cambiar-password")
def cambiar_password(
    datos: CambiarPassword,
    response: Response,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    # Verificar contraseña actual
    if not verificar_contrasena(datos.password_actual, usuario_actual.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta"
        )

    usuario_actual.password_hash = obtener_hash_contrasena(datos.password_nueva)
    db.commit()

    # Re-emitir cookie con nuevo token
    _establecer_cookie_sesion(response, usuario_actual.username, usuario_actual.rol)

    return {"mensaje": "Contraseña actualizada exitosamente"}


# --- LOGO PERSONALIZADO ---

@auth_router.post("/logo")
async def subir_logo(
    archivo: UploadFile = File(...),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    """Sube una imagen (JPG/PNG) para mostrar en la pantalla de login."""
    if archivo.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se permiten archivos JPG o PNG"
        )

    ext = ".jpg" if "jpeg" in archivo.content_type else ".png"
    os.makedirs(LOGO_DIR, exist_ok=True)

    # Eliminar logos anteriores
    for f in os.listdir(LOGO_DIR):
        if f.startswith("logo"):
            os.remove(os.path.join(LOGO_DIR, f))

    ruta_logo = os.path.join(LOGO_DIR, f"logo{ext}")
    with open(ruta_logo, "wb") as buffer:
        shutil.copyfileobj(archivo.file, buffer)

    return {"mensaje": "Logo actualizado exitosamente", "ruta": "/api/v1/auth/logo"}


@auth_router.get("/logo")
def obtener_logo():
    """Sirve el logo personalizado (público, no requiere autenticación)."""
    for ext in [".png", ".jpg"]:
        ruta = os.path.join(LOGO_DIR, f"logo{ext}")
        if os.path.exists(ruta):
            media_type = "image/png" if ext == ".png" else "image/jpeg"
            return FileResponse(ruta, media_type=media_type)
    raise HTTPException(status_code=404, detail="No hay logo configurado")


@auth_router.delete("/logo")
def eliminar_logo(
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    """Elimina el logo personalizado."""
    eliminado = False
    for ext in [".png", ".jpg"]:
        ruta = os.path.join(LOGO_DIR, f"logo{ext}")
        if os.path.exists(ruta):
            os.remove(ruta)
            eliminado = True
    if not eliminado:
        raise HTTPException(status_code=404, detail="No hay logo para eliminar")
    return {"mensaje": "Logo eliminado exitosamente"}


# --- REGISTRO DE USUARIOS ---

@auth_router.post("/register", response_model=UsuarioRespuesta)
def registrar_usuario(
    usuario_in: UsuarioCrear,
    request: Request,
    db: Session = Depends(obtener_db),
):
    # Comprobar si el usuario ya existe
    usuario_existente = db.query(Usuario).filter(Usuario.username == usuario_in.username).first()
    if usuario_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de usuario ya está registrado"
        )

    # Permitir registrar el primer usuario sin token de administrador
    total_usuarios = db.query(Usuario).count()
    if total_usuarios > 0:
        token = _extraer_token(request)
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Se requiere token de administrador para registrar nuevos usuarios"
            )
        try:
            payload = jwt.decode(token, configuracion.SECRET_KEY, algorithms=[configuracion.ALGORITHM])
            nombre_usuario: str | None = payload.get("sub")
            rol: str | None = payload.get("rol")
            if not nombre_usuario or rol != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Solo los administradores pueden registrar nuevos usuarios"
                )
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido o expirado"
            )

    db_usuario = Usuario(
        username=usuario_in.username,
        password_hash=obtener_hash_contrasena(usuario_in.password),
        rol=usuario_in.rol
    )
    db.add(db_usuario)
    db.commit()
    db.refresh(db_usuario)
    return db_usuario

# Incluir routers
app.include_router(auth_router, prefix=configuracion.API_V1_STR)
app.include_router(clientes.router, dependencies=[Depends(obtener_usuario_actual)], prefix=configuracion.API_V1_STR)
app.include_router(productos.router, dependencies=[Depends(obtener_usuario_actual)], prefix=configuracion.API_V1_STR)
app.include_router(cuentas.router, dependencies=[Depends(obtener_usuario_actual)], prefix=configuracion.API_V1_STR)
app.include_router(balances.router, dependencies=[Depends(obtener_usuario_actual)], prefix=configuracion.API_V1_STR)
app.include_router(categorias.router, dependencies=[Depends(obtener_usuario_actual)], prefix=configuracion.API_V1_STR)

@app.get("/")
def raiz():
    return {"mensaje": "La API de Gestión de Cafetería está ejecutándose"}
