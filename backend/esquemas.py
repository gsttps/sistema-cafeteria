from pydantic import BaseModel, Field, ConfigDict, field_validator, PlainSerializer
from typing import Annotated, Optional, List
from datetime import datetime
from decimal import Decimal
from uuid import UUID

# Los montos se calculan como Decimal (precisión financiera) pero se emiten como
# número JSON: Pydantic v2 serializa Decimal como string por defecto, lo que
# obligaba al frontend a envolver cada valor en Number().
Dinero = Annotated[Decimal, PlainSerializer(float, return_type=float, when_used="json")]

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
    actualizar_precios_abiertos: bool = Field(
        False, description="Si el precio cambió, aplicarlo también a los consumos de cuentas abiertas (las pagadas nunca se tocan)"
    )

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
    estado: str

    model_config = ConfigDict(from_attributes=True)


class ImpactoCuentas(BaseModel):
    clientes: int
    transacciones: int
    unidades: int


class ProductoImpactoRespuesta(BaseModel):
    producto_id: UUID
    nombre: str
    estado: str
    cuentas_abiertas: ImpactoCuentas
    cuentas_pagadas: ImpactoCuentas
    perdidas: int
    tiene_uso: bool


class EliminarProductoRespuesta(BaseModel):
    resultado: str # 'archivado' o 'eliminado'

# --- ESQUEMAS DE PERDIDA DE INVENTARIO ---
class PerdidaCrear(BaseModel):
    producto_id: UUID
    cantidad: int = Field(1, ge=1)
    motivo: Optional[str] = Field(None, max_length=200)

    @field_validator('motivo')
    @classmethod
    def validar_motivo(cls, v: Optional[str]) -> Optional[str]:
        return evitar_html_y_scripts(v)


class PerdidaRespuesta(BaseModel):
    id: UUID
    producto_id: UUID
    producto_nombre: Optional[str] = None # Agregado para facilitar lectura en la interfaz
    cantidad: int
    motivo: Optional[str] = None
    costo_historico: Decimal
    fecha_hora: datetime

    model_config = ConfigDict(from_attributes=True)


# --- ESQUEMAS DE TRANSACCION ---
class TransaccionCrear(BaseModel):
    producto_id: UUID
    cantidad: int = Field(1, ge=1)
    # Período/fecha opcionales: permiten agregar el consumo a un mes anterior
    # y/o a un día específico. Si se omiten, se usa el mes/día actual.
    mes: Optional[int] = Field(None, ge=1, le=12)
    anio: Optional[int] = Field(None, ge=2000, le=2100)
    dia: Optional[int] = Field(None, ge=1, le=31)

class PedidoPersonalizadoCrear(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    precio: Decimal = Field(..., gt=0)
    cantidad: int = Field(1, ge=1)
    # Ver TransaccionCrear: período/fecha opcionales para meses anteriores y día específico.
    mes: Optional[int] = Field(None, ge=1, le=12)
    anio: Optional[int] = Field(None, ge=2000, le=2100)
    dia: Optional[int] = Field(None, ge=1, le=31)

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
    # Marca las líneas sintéticas de traspaso de deuda ("Traspaso de deuda" /
    # "Deuda anterior"). La interfaz las muestra como saldo, no como consumo:
    # sin esta marca tendría que comparar por nombre y se rompería en silencio
    # si el texto cambiara. Un consumo normal siempre es False.
    es_arrastre: bool = False

    model_config = ConfigDict(from_attributes=True)

# --- ESQUEMAS DE CUENTA MENSUAL ---
class CuentaMensualCrear(BaseModel):
    cliente_id: UUID
    mes: int = Field(..., ge=1, le=12)
    anio: int

class PagoCuentaRequest(BaseModel):
    monto_pagado: Optional[Decimal] = Field(None, ge=0, description="Monto que el cliente está pagando. Si es nulo, se paga el total. Cero traspasa toda la deuda al mes siguiente.")
    # Descuento a aplicar en el mismo request que el cierre, para que el total
    # cobrado sea siempre el que vio el cajero. Si es nulo, se respeta el que ya
    # está guardado en la cuenta.
    porcentaje_descuento: Optional[Decimal] = Field(None, ge=0, le=100)

class CuentaMensualRespuesta(BaseModel):
    # Nulo cuando la cuenta todavía no existe en la base: el GET devuelve una
    # cuenta "virtual" vacía y se materializa recién con el primer consumo.
    id: Optional[UUID] = None
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

# --- ESQUEMAS DE BALANCES (Dashboard) ---
# Convención: las métricas de CAJA (cobrado / por_cobrar) incluyen las líneas de
# arrastre de deuda; las métricas COMERCIALES (ventas, productos, categorías,
# días, ticket) las excluyen. Ver backend/constantes.py y el docstring del router.

class MetricaKPI(BaseModel):
    """Valor del mes con su comparación contra el mes anterior."""
    actual: Dinero
    anterior: Dinero
    variacion_pct: Optional[float] = None # None cuando el mes anterior es 0 (evita ∞)


class ResumenBalance(BaseModel):
    # Caja (incluyen líneas de arrastre)
    cobrado: MetricaKPI
    por_cobrar: MetricaKPI
    # Comercial (excluyen líneas de arrastre)
    ventas: MetricaKPI
    ticket_promedio: MetricaKPI
    unidades_vendidas: MetricaKPI
    descuentos: MetricaKPI
    valor_mermas: MetricaKPI # a PRECIO DE VENTA: el sistema no registra costo de compra
    clientes_activos: MetricaKPI
    # Contadores y conciliación del mes
    cuentas_abiertas: int
    cuentas_pagadas: int
    clientes_con_deuda: int
    deuda_arrastrada: Dinero # Σ "Deuda anterior" recibida este mes
    deuda_traspasada: Dinero # Σ |"Traspaso de deuda"| enviada al mes siguiente
    tasa_cobro_pct: Optional[float] = None


class ProductoTop(BaseModel):
    nombre: str
    categoria: Optional[str] = None
    cantidad_vendida: int
    monto_vendido: Dinero = Decimal("0.00")


class ClienteTop(BaseModel):
    nombre: str
    total_gastado: Dinero
    unidades: int = 0


class DeudorFila(BaseModel):
    cliente_id: UUID
    nombre: str
    telefono: Optional[str] = None
    deuda_mes: Dinero
    deuda_total: Dinero
    cuentas_abiertas: int


class CategoriaVenta(BaseModel):
    nombre: str # "Sin categoría" si el producto no tiene categoría o la transacción no tiene producto
    monto: Dinero
    unidades: int


class VentaDia(BaseModel):
    dia: int
    monto: Dinero


class MermaAgrupada(BaseModel):
    etiqueta: str # motivo ("Sin motivo") o nombre del producto
    unidades: int
    valor: Dinero


class ProductoStockBajo(BaseModel):
    nombre: str
    categoria: Optional[str] = None
    stock_actual: int
    precio_actual: Dinero


class BalancesMesRespuesta(BaseModel):
    mes: int
    anio: int
    resumen: ResumenBalance
    productos_top: List[ProductoTop] = []
    clientes_top: List[ClienteTop] = []
    deudores: List[DeudorFila] = []
    ventas_por_categoria: List[CategoriaVenta] = []
    ventas_por_dia: List[VentaDia] = []
    consumo_fuera_de_rango: Dinero = Decimal("0.00")
    mermas_por_motivo: List[MermaAgrupada] = []
    mermas_por_producto: List[MermaAgrupada] = []
    stock_bajo: List[ProductoStockBajo] = []


class PuntoEvolucion(BaseModel):
    mes: int
    anio: int
    etiqueta: str # "Abr 26"
    ventas: Dinero
    cobrado: Dinero
    por_cobrar: Dinero
    mermas: Dinero


class EvolucionRespuesta(BaseModel):
    puntos: List[PuntoEvolucion] = []
