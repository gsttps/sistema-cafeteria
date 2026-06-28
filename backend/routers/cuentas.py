import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from decimal import Decimal

from backend.base_datos import obtener_db, obtener_usuario_actual
from backend.modelos import CuentaMensual, Transaccion, Producto, Cliente, Usuario
from backend.esquemas import TransaccionCrear, PedidoPersonalizadoCrear, CuentaMensualRespuesta, TransaccionRespuesta, PagoCuentaRequest

router = APIRouter(prefix="/cuentas", tags=["Cuentas Mensuales"])

def ayudante_calcular_cuenta(cuenta: CuentaMensual, db: Optional[Session] = None) -> dict:
    """Función de ayuda para calcular totales de la cuenta en tiempo real y enriquecer nombres de productos."""
    total_original = Decimal("0.00")
    transacciones_data = []
    
    for t in cuenta.transacciones:
        subtotal = Decimal(str(t.cantidad)) * t.precio_historico
        total_original += subtotal
        
        transacciones_data.append({
            "id": t.id,
            "cuenta_mensual_id": t.cuenta_mensual_id,
            "producto_id": t.producto_id,
            "producto_nombre": t.producto.nombre if t.producto else "Producto Eliminado",
            "cantidad": t.cantidad,
            "precio_historico": t.precio_historico,
            "fecha_hora": t.fecha_hora
        })
        
    descuento = (cuenta.porcentaje_descuento / Decimal("100.00")) * total_original
    total_con_descuento = total_original - descuento
    
    # Cargar datos pagados si se proporciona la sesión de base de datos
    transacciones_pagadas = []
    total_ya_pagado = Decimal("0.00")
    
    if db:
        cuentas_pagadas = db.query(CuentaMensual).filter(
            CuentaMensual.cliente_id == cuenta.cliente_id,
            CuentaMensual.mes == cuenta.mes,
            CuentaMensual.anio == cuenta.anio,
            CuentaMensual.estado == "pagada"
        ).all()
        
        for cp in cuentas_pagadas:
            # Calcular el total de esta cuenta pagada
            tot_orig_cp = Decimal("0.00")
            for t in cp.transacciones:
                tot_orig_cp += Decimal(str(t.cantidad)) * t.precio_historico
                transacciones_pagadas.append({
                    "id": t.id,
                    "cuenta_mensual_id": t.cuenta_mensual_id,
                    "producto_id": t.producto_id,
                    "producto_nombre": t.producto.nombre if t.producto else "Producto Eliminado",
                    "cantidad": t.cantidad,
                    "precio_historico": t.precio_historico,
                    "fecha_hora": t.fecha_hora
                })
            desc_cp = (cp.porcentaje_descuento / Decimal("100.00")) * tot_orig_cp
            total_ya_pagado += (tot_orig_cp - desc_cp)

    # Ordenar transacciones pagadas por fecha de forma ascendente
    transacciones_pagadas.sort(key=lambda x: x["fecha_hora"])

    return {
        "id": cuenta.id,
        "cliente_id": cuenta.cliente_id,
        "mes": cuenta.mes,
        "anio": cuenta.anio,
        "porcentaje_descuento": cuenta.porcentaje_descuento,
        "estado": cuenta.estado,
        "transacciones": transacciones_data,
        "total_original": total_original,
        "total_con_descuento": total_con_descuento,
        "transacciones_pagadas": transacciones_pagadas,
        "total_ya_pagado": total_ya_pagado
    }

@router.get("/cliente/{cliente_id}", response_model=CuentaMensualRespuesta)
def leer_cuenta_actual(
    cliente_id: UUID,
    mes: Optional[int] = None,
    anio: Optional[int] = None,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    # Verificar que el cliente existe
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
        
    # Obtener mes y año local actual si no vienen especificados
    ahora = datetime.datetime.now()
    if mes is None:
        mes = ahora.month
    if anio is None:
        anio = ahora.year
    
    # Intentar buscar una cuenta abierta para el mes solicitado
    cuenta = db.query(CuentaMensual).filter(
        CuentaMensual.cliente_id == cliente_id,
        CuentaMensual.mes == mes,
        CuentaMensual.anio == anio,
        CuentaMensual.estado == "abierta"
    ).first()
    
    # Si no hay cuenta abierta, crear una nueva (incluso si hay una pagada)
    if not cuenta:
        cuenta = CuentaMensual(
            cliente_id=cliente_id,
            mes=mes,
            anio=anio,
            porcentaje_descuento=Decimal("0.00"),
            estado="abierta"
        )
        db.add(cuenta)
        db.commit()
        db.refresh(cuenta)
        
    return ayudante_calcular_cuenta(cuenta, db=db)

@router.post("/cliente/{cliente_id}/agregar_item", response_model=TransaccionRespuesta)
def agregar_transaccion(
    cliente_id: UUID,
    item_in: TransaccionCrear,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    # Verificar que el producto existe
    producto = db.query(Producto).filter(Producto.id == item_in.producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
        
    # Obtener mes y año local actual
    ahora = datetime.datetime.now()
    mes = ahora.month
    anio = ahora.year
    
    # Obtener o crear cuenta abierta para este mes
    cuenta = db.query(CuentaMensual).filter(
        CuentaMensual.cliente_id == cliente_id,
        CuentaMensual.mes == mes,
        CuentaMensual.anio == anio,
        CuentaMensual.estado == "abierta"
    ).first()
    
    if not cuenta:
        cuenta = CuentaMensual(
            cliente_id=cliente_id,
            mes=mes,
            anio=anio,
            porcentaje_descuento=Decimal("0.00"),
            estado="abierta"
        )
        db.add(cuenta)
        db.commit()
        db.refresh(cuenta)
        
    # CRITICO: Congelar precio histórico
    db_transaccion = Transaccion(
        cuenta_mensual_id=cuenta.id,
        producto_id=producto.id,
        cantidad=item_in.cantidad,
        precio_historico=producto.precio_actual
    )
    db.add(db_transaccion)
    db.commit()
    db.refresh(db_transaccion)
    
    # Agregar nombre del producto para la representación de la respuesta
    db_transaccion.producto_nombre = producto.nombre
    return db_transaccion

@router.post("/cliente/{cliente_id}/pedido_personalizado", response_model=TransaccionRespuesta)
def agregar_pedido_personalizado(
    cliente_id: UUID,
    pedido: PedidoPersonalizadoCrear,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    """Registra un pedido de nombre y precio libre en la cuenta abierta del mes actual.
    Si ya existe un producto con ese nombre, se reutiliza actualizando su precio.
    Si no existe, se crea uno nuevo.
    """
    # Buscar o crear el producto con ese nombre
    producto = db.query(Producto).filter(Producto.nombre == pedido.nombre).first()
    if not producto:
        producto = Producto(
            nombre=pedido.nombre,
            precio_actual=pedido.precio,
            stock_actual=0
        )
        db.add(producto)
        db.flush()
    else:
        # Actualizar precio si cambió
        producto.precio_actual = pedido.precio

    # Obtener mes y año local actual
    ahora = datetime.datetime.now()
    mes = ahora.month
    anio = ahora.year

    # Obtener o crear cuenta abierta para este mes
    cuenta = db.query(CuentaMensual).filter(
        CuentaMensual.cliente_id == cliente_id,
        CuentaMensual.mes == mes,
        CuentaMensual.anio == anio,
        CuentaMensual.estado == "abierta"
    ).first()

    if not cuenta:
        cuenta = CuentaMensual(
            cliente_id=cliente_id,
            mes=mes,
            anio=anio,
            porcentaje_descuento=Decimal("0.00"),
            estado="abierta"
        )
        db.add(cuenta)
        db.flush()

    # CRÍTICO: Congelar precio histórico al momento del pedido
    db_transaccion = Transaccion(
        cuenta_mensual_id=cuenta.id,
        producto_id=producto.id,
        cantidad=pedido.cantidad,
        precio_historico=pedido.precio
    )
    db.add(db_transaccion)
    db.commit()
    db.refresh(db_transaccion)

    db_transaccion.producto_nombre = producto.nombre
    return db_transaccion

@router.put("/{cuenta_id}/descuento", response_model=CuentaMensualRespuesta)
def actualizar_descuento_cuenta(
    cuenta_id: UUID,
    porcentaje_descuento: Decimal,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    if porcentaje_descuento < Decimal("0.00") or porcentaje_descuento > Decimal("100.00"):
        raise HTTPException(status_code=400, detail="El descuento debe estar entre 0 y 100%")
        
    cuenta = db.query(CuentaMensual).filter(CuentaMensual.id == cuenta_id).first()
    if not cuenta:
        raise HTTPException(status_code=404, detail="Cuenta mensual no encontrada")
        
    cuenta.porcentaje_descuento = porcentaje_descuento
    db.commit()
    db.refresh(cuenta)
    return ayudante_calcular_cuenta(cuenta, db=db)

@router.put("/{cuenta_id}/cerrar", response_model=CuentaMensualRespuesta)
def cerrar_cuenta(
    cuenta_id: UUID,
    pago: PagoCuentaRequest,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    cuenta = db.query(CuentaMensual).filter(CuentaMensual.id == cuenta_id).first()
    if not cuenta:
        raise HTTPException(status_code=404, detail="Cuenta mensual no encontrada")
        
    if cuenta.estado == "pagada":
        raise HTTPException(status_code=400, detail="La cuenta ya está pagada")

    datos_cuenta = ayudante_calcular_cuenta(cuenta, db=db)
    total_con_descuento = Decimal(str(datos_cuenta["total_con_descuento"]))
    
    monto_pagado = Decimal(str(pago.monto_pagado)) if pago.monto_pagado is not None else total_con_descuento
    
    if monto_pagado < Decimal("0.00"):
        raise HTTPException(status_code=400, detail="El monto pagado no puede ser negativo")
        
    deuda = total_con_descuento - monto_pagado
    
    if deuda > Decimal("0.00"):
        # Asegurar que existen los productos especiales
        prod_deuda_anterior = db.query(Producto).filter(Producto.nombre == "Deuda anterior").first()
        if not prod_deuda_anterior:
            prod_deuda_anterior = Producto(nombre="Deuda anterior", precio_actual=0)
            db.add(prod_deuda_anterior)
            
        prod_traspaso = db.query(Producto).filter(Producto.nombre == "Traspaso de deuda").first()
        if not prod_traspaso:
            prod_traspaso = Producto(nombre="Traspaso de deuda", precio_actual=0)
            db.add(prod_traspaso)
            
        db.flush()
        
        # Insertar transacción negativa en el mes actual
        t_traspaso = Transaccion(
            cuenta_mensual_id=cuenta.id,
            producto_id=prod_traspaso.id,
            cantidad=1,
            precio_historico=-deuda
        )
        db.add(t_traspaso)
        
        # Buscar o crear la cuenta del mes siguiente
        next_mes = cuenta.mes + 1 if cuenta.mes < 12 else 1
        next_anio = cuenta.anio if cuenta.mes < 12 else cuenta.anio + 1
        
        cuenta_siguiente = db.query(CuentaMensual).filter(
            CuentaMensual.cliente_id == cuenta.cliente_id,
            CuentaMensual.mes == next_mes,
            CuentaMensual.anio == next_anio
        ).first()
        
        if not cuenta_siguiente:
            cuenta_siguiente = CuentaMensual(
                cliente_id=cuenta.cliente_id,
                mes=next_mes,
                anio=next_anio,
                estado="abierta",
                porcentaje_descuento=0
            )
            db.add(cuenta_siguiente)
            db.flush()
            
        # Insertar la deuda en el mes siguiente
        t_deuda = Transaccion(
            cuenta_mensual_id=cuenta_siguiente.id,
            producto_id=prod_deuda_anterior.id,
            cantidad=1,
            precio_historico=deuda
        )
        db.add(t_deuda)
        
    cuenta.estado = "pagada"
    db.commit()
    db.refresh(cuenta)
    return ayudante_calcular_cuenta(cuenta, db=db)

@router.get("/cliente/{cliente_id}/historial", response_model=List[CuentaMensualRespuesta])
def leer_historial_cuentas(
    cliente_id: UUID,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    cuentas = db.query(CuentaMensual).filter(
        CuentaMensual.cliente_id == cliente_id
    ).order_by(CuentaMensual.anio.desc(), CuentaMensual.mes.desc()).all()
    
    return [ayudante_calcular_cuenta(c, db=db) for c in cuentas]

@router.delete("/transaccion/{transaccion_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_transaccion(
    transaccion_id: UUID,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    # Verificar que la transacción existe
    t = db.query(Transaccion).filter(Transaccion.id == transaccion_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Consumo no encontrado")
        
    # Verificar que la cuenta de la transacción esté abierta
    if t.cuenta_mensual.estado == "pagada":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pueden eliminar consumos de una cuenta ya pagada/cerrada"
        )
        
    db.delete(t)
    db.commit()
    return None
