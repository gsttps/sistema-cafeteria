from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from backend.base_datos import obtener_db, obtener_usuario_actual, verificar_rol_admin
from backend.modelos import Producto, Transaccion, Usuario
from backend.esquemas import ProductoCrear, ProductoActualizar, ProductoRespuesta

router = APIRouter(prefix="/productos", tags=["Productos"])

@router.get("/", response_model=List[ProductoRespuesta])
def leer_productos(
    buscar: Optional[str] = None,
    skip: int = Query(0, ge=0, description="Registros a omitir"),
    limit: int = Query(100, ge=1, le=500, description="Máximo de registros a retornar"),
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    consulta = db.query(Producto)
    if buscar:
        consulta = consulta.filter(Producto.nombre.ilike(f"%{buscar}%"))
    return consulta.offset(skip).limit(limit).all()

@router.post("/", response_model=ProductoRespuesta, status_code=status.HTTP_201_CREATED)
def crear_producto(
    producto_in: ProductoCrear,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(verificar_rol_admin),
):
    producto_existente = db.query(Producto).filter(Producto.nombre == producto_in.nombre).first()
    if producto_existente:
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
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe otro producto con este nombre")

    if producto_in.nombre is not None:
        producto.nombre = producto_in.nombre
    if producto_in.precio_actual is not None:
        producto.precio_actual = producto_in.precio_actual
    if producto_in.stock_actual is not None:
        producto.stock_actual = producto_in.stock_actual
    if producto_in.categoria_id is not None:
        producto.categoria_id = producto_in.categoria_id

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe otro producto con este nombre")
    db.refresh(producto)
    return producto

@router.delete("/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_producto(
    producto_id: UUID,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(verificar_rol_admin),
):
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
    tiene_transacciones = db.query(Transaccion).filter(Transaccion.producto_id == producto_id).first()
    if tiene_transacciones:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar el producto porque tiene transacciones registradas"
        )
    db.delete(producto)
    db.commit()
    return None
