from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from uuid import UUID

from backend.base_datos import obtener_db, obtener_usuario_actual, verificar_rol_admin
from backend.modelos import PerdidaInventario, Producto, Usuario
from backend.esquemas import PerdidaCrear, PerdidaRespuesta
from backend.zona_horaria import ahora_negocio, fecha_hora_negocio

router = APIRouter(prefix="/perdidas", tags=["Pérdidas de Inventario"])

@router.get("/", response_model=List[PerdidaRespuesta])
def leer_perdidas(
    producto_id: Optional[UUID] = None,
    skip: int = Query(0, ge=0, description="Registros a omitir"),
    limit: int = Query(100, ge=1, le=500, description="Máximo de registros a retornar"),
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    consulta = db.query(PerdidaInventario).options(joinedload(PerdidaInventario.producto))
    if producto_id:
        consulta = consulta.filter(PerdidaInventario.producto_id == producto_id)
    perdidas = (
        consulta.order_by(PerdidaInventario.fecha_hora.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    for perdida in perdidas:
        perdida.producto_nombre = perdida.producto.nombre if perdida.producto else None
    return perdidas

@router.post("/", response_model=PerdidaRespuesta, status_code=status.HTTP_201_CREATED)
def registrar_perdida(
    perdida_in: PerdidaCrear,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    """Registra una merma (producto roto, vencido, derramado, etc.) y descuenta el stock."""
    producto = db.query(Producto).filter(Producto.id == perdida_in.producto_id).first()
    if not producto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
    if producto.estado == "archivado":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El producto está archivado")

    # Ancla la fecha al mediodía UTC del día de negocio (Chile), igual que las
    # transacciones: sin esto, una merma cargada entre las 20:00 y medianoche
    # hora Chile quedaba fechada (y por lo tanto reportada en Balances) en el
    # día/mes siguiente, porque el servidor corre en UTC.
    ahora = ahora_negocio()
    db_perdida = PerdidaInventario(
        producto_id=producto.id,
        cantidad=perdida_in.cantidad,
        motivo=perdida_in.motivo,
        costo_historico=producto.precio_actual,
        fecha_hora=fecha_hora_negocio(ahora.year, ahora.month, ahora.day),
    )
    # El stock nunca queda negativo: se puede registrar la pérdida de algo
    # que no estaba contabilizado en el stock
    producto.stock_actual = max(0, producto.stock_actual - perdida_in.cantidad)
    db.add(db_perdida)
    db.commit()
    db.refresh(db_perdida)

    db_perdida.producto_nombre = producto.nombre
    return db_perdida

@router.delete("/{perdida_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_perdida(
    perdida_id: UUID,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(verificar_rol_admin),
):
    """Elimina un registro de pérdida (corrección) y repone su cantidad al stock."""
    perdida = db.query(PerdidaInventario).filter(PerdidaInventario.id == perdida_id).first()
    if not perdida:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro de pérdida no encontrado")

    if perdida.producto:
        perdida.producto.stock_actual += perdida.cantidad
    db.delete(perdida)
    db.commit()
    return None
