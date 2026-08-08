"""Constantes de negocio compartidas entre routers y exportadores."""

# Productos sintéticos que crea cuentas.py al cerrar una cuenta con pago parcial.
# NO son ventas reales: "Traspaso de deuda" lleva precio NEGATIVO en el mes que
# se cierra, y "Deuda anterior" reinyecta el positivo en el mes siguiente.
# Deben excluirse de toda métrica comercial (productos, categorías, ventas por
# día, ticket promedio) pero NO de las métricas de caja, donde el traspaso
# negativo es justamente lo que hace que la cuenta cerrada refleje lo cobrado.
PRODUCTO_DEUDA_ANTERIOR = "Deuda anterior"
PRODUCTO_TRASPASO_DEUDA = "Traspaso de deuda"
PRODUCTOS_ARRASTRE = (PRODUCTO_DEUDA_ANTERIOR, PRODUCTO_TRASPASO_DEUDA)

# Mismo umbral que usa la vista de Inventario para marcar stock en rojo
UMBRAL_STOCK_BAJO = 5

NOMBRES_MESES = (
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
)
