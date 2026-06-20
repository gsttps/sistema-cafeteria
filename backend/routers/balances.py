from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from decimal import Decimal

from backend.base_datos import obtener_db, obtener_usuario_actual
from backend.modelos import CuentaMensual, Transaccion, Producto, Cliente
from backend.esquemas import BalancesMesRespuesta, ProductoTop, ClienteTop

router = APIRouter(prefix="/balances", tags=["Balances y Estadísticas"])

@router.get("/", response_model=BalancesMesRespuesta)
def obtener_balances(mes: int, anio: int, db: Session = Depends(obtener_db), usuario_actual = Depends(obtener_usuario_actual)):
    # Obtener todas las cuentas del mes
    cuentas = db.query(CuentaMensual).filter(CuentaMensual.mes == mes, CuentaMensual.anio == anio).all()
    
    total_pagado = Decimal("0.00")
    total_pendiente = Decimal("0.00")
    
    gastos_por_cliente = {}

    for cuenta in cuentas:
        total_cuenta = Decimal("0.00")
        for t in cuenta.transacciones:
            total_cuenta += Decimal(str(t.cantidad)) * t.precio_historico
        
        descuento = (cuenta.porcentaje_descuento / Decimal("100.00")) * total_cuenta
        total_final = total_cuenta - descuento
        
        if cuenta.estado == "pagada":
            total_pagado += total_final
        else:
            total_pendiente += total_final
            
        # Acumular gastos por cliente
        cliente_nombre = cuenta.cliente.nombre if cuenta.cliente else "Desconocido"
        if cliente_nombre not in gastos_por_cliente:
            gastos_por_cliente[cliente_nombre] = Decimal("0.00")
        gastos_por_cliente[cliente_nombre] += total_final
        
    # Top Productos
    productos_vendidos = db.query(
        Producto.nombre, func.sum(Transaccion.cantidad).label("total_vendido")
    ).join(Transaccion, Producto.id == Transaccion.producto_id)\
     .join(CuentaMensual, Transaccion.cuenta_mensual_id == CuentaMensual.id)\
     .filter(CuentaMensual.mes == mes, CuentaMensual.anio == anio)\
     .group_by(Producto.nombre)\
     .order_by(func.sum(Transaccion.cantidad).desc())\
     .limit(5).all()
     
    productos_top = [ProductoTop(nombre=p.nombre, cantidad_vendida=p.total_vendido or 0) for p in productos_vendidos]
    
    # Top Clientes
    clientes_ordenados = sorted(gastos_por_cliente.items(), key=lambda item: item[1], reverse=True)[:5]
    clientes_top = [ClienteTop(nombre=c[0], total_gastado=c[1]) for c in clientes_ordenados]
    
    return BalancesMesRespuesta(
        total_pagado=total_pagado,
        total_pendiente=total_pendiente,
        productos_top=productos_top,
        clientes_top=clientes_top
    )
