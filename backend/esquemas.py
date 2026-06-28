from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from uuid import UUID

def evitar_html_y_scripts(v: Optional[str]) -> Optional[str]:
    if v is not None:
        # Validación de caracteres peligrosos para HTML/Scripts
        if "<" in v or ">" in v or "javascript:" in v.lower() or "onerror" in v.lower() or "onload" in v.lower():
            raise ValueError("No se permiten caracteres HTML o patrones de script (<, >, javascript:, onerror, onload).")
        return v.strip()
    return v

# --- ESQUEMAS DE USUARIO ---
class UsuarioCrear(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=4)
    rol: str = Field("staff", pattern="^(admin|staff)$")

    @field_validator('username')
    @classmethod
    def validar_username(cls, v: str) -> str:
        res = evitar_html_y_scripts(v)
        if res is None:
            raise ValueError("El nombre de usuario no puede estar vacío.")
        return res


class UsuarioRespuesta(BaseModel):
    id: UUID
    username: str
    rol: str

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class DatosToken(BaseModel):
    username: Optional[str] = None
    rol: Optional[str] = None

class CambiarUsername(BaseModel):
    password_actual: str = Field(..., min_length=1)
    username_nuevo: str = Field(..., min_length=3, max_length=50)

    @field_validator('username_nuevo')
    @classmethod
    def validar_username_nuevo(cls, v: str) -> str:
        res = evitar_html_y_scripts(v)
        if res is None:
            raise ValueError("El nuevo nombre de usuario no puede estar vacío.")
        return res


class CambiarPassword(BaseModel):
    password_actual: str = Field(..., min_length=1)
    password_nueva: str = Field(..., min_length=4)


# --- ESQUEMAS DE CATEGORIA ---
class CategoriaCrear(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)

    @field_validator('nombre')
    @classmethod
    def validar_nombre_categoria(cls, v: Optional[str]) -> Optional[str]:
        return evitar_html_y_scripts(v)

# Reutilizar: CategoriaActualizar tiene los mismos campos que CategoriaCrear
CategoriaActualizar = CategoriaCrear

class CategoriaRespuesta(BaseModel):
    id: UUID
    nombre: str

    model_config = ConfigDict(from_attributes=True)


# --- ESQUEMAS DE CLIENTE ---
class ClienteCrear(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    telefono: Optional[str] = Field(None, max_length=20)

    @field_validator('nombre', 'telefono')
    @classmethod
    def validar_campos_crear(cls, v: Optional[str]) -> Optional[str]:
        return evitar_html_y_scripts(v)

class ClienteActualizar(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    telefono: Optional[str] = Field(None, max_length=20)
    estado: Optional[str] = Field(None, pattern="^(activo|inactivo)$")

    @field_validator('nombre', 'telefono')
    @classmethod
    def validar_campos_actualizar(cls, v: Optional[str]) -> Optional[str]:
        return evitar_html_y_scripts(v)


class ClienteRespuesta(BaseModel):
    id: UUID
    nombre: str
    telefono: Optional[str] = None
    estado: str
    deuda: Decimal
    estado_pago: str

    model_config = ConfigDict(from_attributes=True)

# --- ESQUEMAS DE PRODUCTO ---
class ProductoCrear(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    precio_actual: Decimal = Field(..., gt=0)
    stock_actual: int = Field(0, ge=0)
    categoria_id: Optional[UUID] = None

    @field_validator('nombre')
    @classmethod
    def validar_nombre_producto(cls, v: str) -> str:
        res = evitar_html_y_scripts(v)
        if res is None:
            raise ValueError("El nombre del producto no puede estar vacío.")
        return res


class ProductoActualizar(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    precio_actual: Optional[Decimal] = Field(None, gt=0)
    stock_actual: Optional[int] = Field(None, ge=0)
    categoria_id: Optional[UUID] = None

    @field_validator('nombre')
    @classmethod
    def validar_nombre_producto(cls, v: Optional[str]) -> Optional[str]:
        return evitar_html_y_scripts(v)


class ProductoRespuesta(BaseModel):
    id: UUID
    nombre: str
    precio_actual: Decimal
    stock_actual: int
    categoria_id: Optional[UUID] = None
    categoria: Optional[CategoriaRespuesta] = None

    model_config = ConfigDict(from_attributes=True)

# --- ESQUEMAS DE TRANSACCION ---
class TransaccionCrear(BaseModel):
    producto_id: UUID
    cantidad: int = Field(1, ge=1)

class PedidoPersonalizadoCrear(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    precio: Decimal = Field(..., gt=0)
    cantidad: int = Field(1, ge=1)

    @field_validator('nombre')
    @classmethod
    def validar_nombre_pedido(cls, v: str) -> str:
        res = evitar_html_y_scripts(v)
        if res is None:
            raise ValueError("El nombre del pedido no puede estar vacío.")
        return res

class TransaccionRespuesta(BaseModel):
    id: UUID
    cuenta_mensual_id: UUID
    producto_id: Optional[UUID] = None
    producto_nombre: Optional[str] = None # Agregado para facilitar lectura en la interfaz
    cantidad: int
    precio_historico: Decimal
    fecha_hora: datetime

    model_config = ConfigDict(from_attributes=True)

# --- ESQUEMAS DE CUENTA MENSUAL ---
class CuentaMensualCrear(BaseModel):
    cliente_id: UUID
    mes: int = Field(..., ge=1, le=12)
    anio: int

class PagoCuentaRequest(BaseModel):
    monto_pagado: Optional[float] = Field(None, description="Monto que el cliente está pagando. Si es nulo, se paga el total.")

class CuentaMensualRespuesta(BaseModel):
    id: UUID
    cliente_id: UUID
    mes: int
    anio: int
    porcentaje_descuento: Decimal
    estado: str
    transacciones: List[TransaccionRespuesta] = []
    
    # Campos calculados en tiempo real
    total_original: Decimal = Decimal("0.00")
    total_con_descuento: Decimal = Decimal("0.00")
    
    # Datos agregados de cuentas previamente pagadas en el mismo mes
    transacciones_pagadas: List[TransaccionRespuesta] = []
    total_ya_pagado: Decimal = Decimal("0.00")

    model_config = ConfigDict(from_attributes=True)

# Esquemas para la vista de Balances (Dashboard)
class ProductoTop(BaseModel):
    nombre: str
    cantidad_vendida: int

class ClienteTop(BaseModel):
    nombre: str
    total_gastado: Decimal

class BalancesMesRespuesta(BaseModel):
    total_pagado: Decimal
    total_pendiente: Decimal
    productos_top: List[ProductoTop]
    clientes_top: List[ClienteTop]
