from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from backend.base_datos import obtener_db, obtener_usuario_actual
from backend.modelos import Cliente, Usuario
from backend.esquemas import ClienteCrear, ClienteActualizar, ClienteRespuesta

router = APIRouter(prefix="/clientes", tags=["Clientes"])

@router.get("/", response_model=List[ClienteRespuesta])
def leer_clientes(
    buscar: Optional[str] = None,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    consulta = db.query(Cliente)
    if buscar:
        consulta = consulta.filter(Cliente.nombre.ilike(f"%{buscar}%"))
    return consulta.all()

@router.post("/", response_model=ClienteRespuesta, status_code=status.HTTP_201_CREATED)
def crear_cliente(
    cliente_in: ClienteCrear,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    db_cliente = Cliente(
        nombre=cliente_in.nombre,
        telefono=cliente_in.telefono,
        estado="activo"
    )
    db.add(db_cliente)
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

@router.get("/{cliente_id}", response_model=ClienteRespuesta)
def leer_cliente(
    cliente_id: UUID,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado"
        )
    return cliente

@router.put("/{cliente_id}", response_model=ClienteRespuesta)
def actualizar_cliente(
    cliente_id: UUID,
    cliente_in: ClienteActualizar,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado"
        )
    
    datos_actualizacion = cliente_in.model_dump(exclude_unset=True)
    for campo, valor in datos_actualizacion.items():
        setattr(cliente, campo, valor)
        
    db.commit()
    db.refresh(cliente)
    return cliente

@router.delete("/{cliente_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_cliente(
    cliente_id: UUID,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado"
        )
    db.delete(cliente)
    db.commit()
    return None

