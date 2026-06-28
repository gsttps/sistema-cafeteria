import os

# Deben setearse ANTES de cualquier import del backend
# (configuracion.py lee env vars al momento de importarse)
os.environ.setdefault("SECRET_KEY", "test_secret_key_for_pytest_only_not_for_production_abcdef12")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")
os.environ.setdefault("BACKEND_PUBLIC_URL", "http://localhost:8000")
os.environ.setdefault("ADMIN_INITIAL_PASSWORD", "testpassword123")

# Monkey-patch: reemplaza el tipo UUID de PostgreSQL por uno compatible con SQLite
# (debe hacerse ANTES de importar los modelos)
import uuid as _uuid_mod
from sqlalchemy.types import TypeDecorator, String
import sqlalchemy.dialects.postgresql as _pg


class _UUIDCompat(TypeDecorator):
    """Almacena UUID como VARCHAR(36) para poder usar SQLite en tests."""
    impl = String(36)
    cache_ok = True

    def __init__(self, *args, **kwargs):
        kwargs.pop("as_uuid", None)
        super().__init__(*args, **kwargs)

    def process_bind_param(self, value, dialect):
        return str(value) if value is not None else None

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return value if isinstance(value, _uuid_mod.UUID) else _uuid_mod.UUID(str(value))


_pg.UUID = _UUIDCompat

import pytest
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

import backend.modelos  # registrar modelos antes de create_all
from backend.base_datos import Base, obtener_db
from backend.main import app

# StaticPool: fuerza una única conexión compartida para que el in-memory SQLite
# sea visible desde todas las sesiones (sin él, cada conexión ve una BD vacía)
SQLITE_URL = "sqlite:///"


@pytest.fixture(scope="function")
def db_engine():
    engine = create_engine(
        SQLITE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # SQLite no aplica FK constraints por defecto; habilitarlo para que
    # el test de DELETE con transacciones existentes devuelva IntegrityError.
    # Se registra el evento Y se aplica explícitamente (StaticPool puede
    # no disparar "connect" en usos posteriores de la misma conexión).
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, _):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    with engine.connect() as conn:
        conn.execute(text("PRAGMA foreign_keys=ON"))

    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


TEST_ADMIN_PASSWORD = "testpassword123"


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    """Resetea los contadores del rate limiter (slowapi) antes de cada test.

    Sin esto, después de 5 intentos de login en la misma sesión de pytest
    todos los tests siguientes reciben 429 Too Many Requests.
    """
    from backend.main import limiter
    limiter.reset()
    yield


@pytest.fixture(scope="function")
def client(db_engine):
    """TestClient con la BD sobreescrita a SQLite en memoria."""
    from backend.modelos import Usuario
    from backend.core.configuracion import obtener_hash_contrasena

    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)

    def _override_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    # Reemplazar también el SesionLocal que usa el lifespan para crear el usuario admin
    import backend.base_datos as bd
    original = bd.SesionLocal
    bd.SesionLocal = TestingSession

    app.dependency_overrides[obtener_db] = _override_db

    with TestClient(app, raise_server_exceptions=True) as tc:
        # Garantizar que el admin existe con la contraseña conocida del test,
        # independientemente del valor de ADMIN_INITIAL_PASSWORD en .env
        session = TestingSession()
        user = session.query(Usuario).filter(Usuario.username == "admin").first()
        if user is None:
            user = Usuario(
                username="admin",
                password_hash=obtener_hash_contrasena(TEST_ADMIN_PASSWORD),
                rol="admin",
            )
            session.add(user)
        else:
            user.password_hash = obtener_hash_contrasena(TEST_ADMIN_PASSWORD)
        session.commit()
        session.close()
        yield tc

    app.dependency_overrides.clear()
    bd.SesionLocal = original


@pytest.fixture()
def auth_headers(client):
    """Hace login como admin y devuelve headers vacíos (TestClient mantiene cookies automáticamente)."""
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": "admin", "password": TEST_ADMIN_PASSWORD},
    )
    assert resp.status_code == 200, f"Login falló: {resp.json()}"
    return {}
