import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from backend.base_datos import Base

# Función de ayuda para obtener la fecha y hora UTC actual con zona horaria
def utc_ahora():
    return datetime.now(timezone.utc)

class Usuario(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(String(20), default="staff", nullable=False) # 'admin' o 'staff'

class Cliente(Base):
    __tablename__ = "clients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(100), index=True, nullable=False)
    telefono = Column(String(20), nullable=True)
    estado = Column(String(20), default="activo", nullable=False) # 'activo' o 'inactivo'

    # Relaciones
    cuentas = relationship("CuentaMensual", back_populates="cliente", cascade="all, delete-orphan")

    @property
    def deuda(self):
        from decimal import Decimal
        total_deuda = Decimal("0.00")
        for cuenta in self.cuentas:
            if cuenta.estado == "abierta":
                total_original = sum(t.cantidad * t.precio_historico for t in cuenta.transacciones)
                descuento = (cuenta.porcentaje_descuento / Decimal("100.00")) * total_original
                total_deuda += (total_original - descuento)
        return total_deuda

    @property
    def estado_pago(self):
        return "deuda" if self.deuda > 0 else "pagado"

class Categoria(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(100), unique=True, index=True, nullable=False)

    # Relaciones
    productos = relationship("Producto", back_populates="categoria")

class Producto(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(100), unique=True, index=True, nullable=False)
    precio_actual = Column(Numeric(10, 2), nullable=False)
    stock_actual = Column(Integer, nullable=False, default=0)
    categoria_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)

    # Relaciones
    categoria = relationship("Categoria", back_populates="productos")
    transacciones = relationship("Transaccion", back_populates="producto", cascade="all, delete-orphan")

class CuentaMensual(Base):
    __tablename__ = "monthly_tabs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cliente_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    mes = Column(Integer, nullable=False) # 1 a 12
    anio = Column(Integer, nullable=False)
    porcentaje_descuento = Column(Numeric(5, 2), default=0.00, nullable=False) # 0.00 a 100.00
    estado = Column(String(20), default="abierta", nullable=False) # 'abierta' o 'pagada'

    # Eliminamos el UniqueConstraint para permitir múltiples cuentas (tabs) en un mismo mes
    # __table_args__ = (
    #     UniqueConstraint("cliente_id", "mes", "anio", name="uq_cliente_mes_anio"),
    # )

    # Relaciones
    cliente = relationship("Cliente", back_populates="cuentas")
    transacciones = relationship("Transaccion", back_populates="cuenta_mensual", cascade="all, delete-orphan")

class Transaccion(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cuenta_mensual_id = Column(UUID(as_uuid=True), ForeignKey("monthly_tabs.id", ondelete="CASCADE"), nullable=False)
    producto_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="RESTRICT"), nullable=True)
    cantidad = Column(Integer, default=1, nullable=False)
    precio_historico = Column(Numeric(10, 2), nullable=False) # Congela el precio al momento de la compra
    fecha_hora = Column(DateTime(timezone=True), default=utc_ahora, nullable=False)

    # Relaciones
    cuenta_mensual = relationship("CuentaMensual", back_populates="transacciones")
    producto = relationship("Producto", back_populates="transacciones")
