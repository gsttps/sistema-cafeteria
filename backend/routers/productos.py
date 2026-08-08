from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from uuid import UUID

from backend.base_datos import obtener_db, obtener_usuario_actual, verificar_rol_admin
from backend.constantes import PRODUCTOS_ARRASTRE
from backend.modelos import CuentaMensual, PerdidaInventario, Producto, Transaccion, Usuario
from backend.esquemas import (
    EliminarProductoRespuesta,
    ImpactoCuentas,
    ProductoActualizar,
    ProductoCrear,
    ProductoImpactoRespuesta,
    ProductoRespuesta,
)

router = APIRouter(prefix="/productos", tags=["Productos"])

@router.get("/", response_model=List[ProductoRespuesta])
def leer_productos(
    buscar: Optional[str] = None,
    incluir_archivados: bool = False,
    skip: int = Query(0, ge=0, description="Registros a omitir"),
    limit: int = Query(100, ge=1, le=500, description="Máximo de registros a retornar"),
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    # joinedload: la respuesta serializa la categoría de cada producto (N+1)
    consulta = db.query(Producto).options(joinedload(Producto.categoria))
    # Los productos sintéticos de traspaso de deuda existen solo para colgar las
    # líneas de arrastre: no son vendibles ni inventariables. Sin este filtro
    # aparecen en Inventario como productos de $0 que el usuario puede editar.
    consulta = consulta.filter(Producto.nombre.notin_(PRODUCTOS_ARRASTRE))
    if not incluir_archivados:
        consulta = consulta.filter(Producto.estado == "activo")
    if buscar:
        consulta = consulta.filter(Producto.nombre.ilike(f"%{buscar}%"))
    return consulta.offset(skip).limit(limit).all()

@router.get("/{producto_id}/impacto", response_model=ProductoImpactoRespuesta)
def leer_impacto_producto(
    producto_id: UUID,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(verificar_rol_admin),
):
    """Cuántos clientes/consumos referencian este producto, separado por cuentas
    abiertas (afectables) y pagadas (historial inmutable), más pérdidas registradas.
    Usado por el frontend para avisar el impacto antes de editar o eliminar."""
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

    filas = (
        db.query(
            CuentaMensual.estado,
            func.count(func.distinct(CuentaMensual.cliente_id)),
            func.count(Transaccion.id),
            func.coalesce(func.sum(Transaccion.cantidad), 0),
        )
        .select_from(Transaccion)
        .join(CuentaMensual, Transaccion.cuenta_mensual_id == CuentaMensual.id)
        .filter(Transaccion.producto_id == producto_id)
        .group_by(CuentaMensual.estado)
        .all()
    )
    por_estado = {estado: (clientes, transacciones, unidades) for estado, clientes, transacciones, unidades in filas}
    abiertas = por_estado.get("abierta", (0, 0, 0))
    pagadas = por_estado.get("pagada", (0, 0, 0))

    num_perdidas = (
        db.query(func.count(PerdidaInventario.id))
        .filter(PerdidaInventario.producto_id == producto_id)
        .scalar()
    )

    return ProductoImpactoRespuesta(
        producto_id=producto.id,
        nombre=producto.nombre,
        estado=producto.estado,
        cuentas_abiertas=ImpactoCuentas(clientes=abiertas[0], transacciones=abiertas[1], unidades=abiertas[2]),
        cuentas_pagadas=ImpactoCuentas(clientes=pagadas[0], transacciones=pagadas[1], unidades=pagadas[2]),
        perdidas=num_perdidas,
        tiene_uso=(abiertas[1] + pagadas[1] + num_perdidas) > 0,
    )

@router.post("/", response_model=ProductoRespuesta, status_code=status.HTTP_201_CREATED)
def crear_producto(
    producto_in: ProductoCrear,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(verificar_rol_admin),
):
    producto_existente = db.query(Producto).filter(Producto.nombre == producto_in.nombre).first()
    if producto_existente:
        if producto_existente.estado == "archivado":
            # Reactivar: mismo UUID (conserva el vínculo con su historial de transacciones)
            producto_existente.estado = "activo"
            producto_existente.precio_actual = producto_in.precio_actual
            producto_existente.stock_actual = producto_in.stock_actual
            producto_existente.categoria_id = producto_in.categoria_id
            db.commit()
            db.refresh(producto_existente)
            return producto_existente
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un producto con este nombre")

    db_producto = Producto(
        nombre=producto_in.nombre,
        precio_actual=producto_in.precio_actual,
        stock_actual=producto_in.stock_actual,
        categoria_id=producto_in.categoria_id
    )
    db.add(db_producto)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un producto con este nombre")
    db.refresh(db_producto)
    return db_producto

@router.put("/{producto_id}", response_model=ProductoRespuesta)
def actualizar_producto(
    producto_id: UUID,
    producto_in: ProductoActualizar,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(verificar_rol_admin),
):
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

    if producto_in.nombre is not None and producto_in.nombre != producto.nombre:
        existente = db.query(Producto).filter(Producto.nombre == producto_in.nombre).first()
        if existente:
            detalle = "Ya existe otro producto con este nombre"
            if existente.estado == "archivado":
                detalle = "Ya existe un producto archivado con este nombre. Créalo de nuevo para reactivarlo."
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detalle)

    precio_anterior = producto.precio_actual

    if producto_in.nombre is not None:
        producto.nombre = producto_in.nombre
    if producto_in.precio_actual is not None:
        producto.precio_actual = producto_in.precio_actual
    if producto_in.stock_actual is not None:
        producto.stock_actual = producto_in.stock_actual
    if producto_in.categoria_id is not None:
        producto.categoria_id = producto_in.categoria_id

    if (
        producto_in.actualizar_precios_abiertos
        and producto_in.precio_actual is not None
        and producto_in.precio_actual != precio_anterior
    ):
        subq_abiertas = db.query(CuentaMensual.id).filter(CuentaMensual.estado == "abierta")
        db.query(Transaccion).filter(
            Transaccion.producto_id == producto_id,
            Transaccion.cuenta_mensual_id.in_(subq_abiertas),
        ).update({Transaccion.precio_historico: producto_in.precio_actual}, synchronize_session=False)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe otro producto con este nombre")
    db.refresh(producto)
    return producto

@router.delete("/{producto_id}", response_model=EliminarProductoRespuesta)
def eliminar_producto(
    producto_id: UUID,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(verificar_rol_admin),
):
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

    tiene_transacciones = db.query(Transaccion.id).filter(Transaccion.producto_id == producto_id).first()
    tiene_perdidas = db.query(PerdidaInventario.id).filter(PerdidaInventario.producto_id == producto_id).first()

    if tiene_transacciones or tiene_perdidas:
        # Soft-delete: el historial de clientes conserva nombre y precios;
        # el producto desaparece del inventario y las búsquedas
        producto.estado = "archivado"
        producto.stock_actual = 0
        db.commit()
        return EliminarProductoRespuesta(resultado="archivado")

    db.delete(producto)
    db.commit()
    return EliminarProductoRespuesta(resultado="eliminado")
