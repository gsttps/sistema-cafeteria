from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from backend.base_datos import obtener_db, verificar_rol_admin
from backend.modelos import Categoria, Usuario
from backend.esquemas import CategoriaCrear, CategoriaActualizar, CategoriaRespuesta

router = APIRouter(prefix="/categorias", tags=["Categorias"])

@router.get("/", response_model=List[CategoriaRespuesta])
def listar_categorias(db: Session = Depends(obtener_db), usuario_actual: Usuario = Depends(verificar_rol_admin)):
    return db.query(Categoria).order_by(Categoria.nombre).all()

@router.post("/", response_model=CategoriaRespuesta, status_code=status.HTTP_201_CREATED)
def crear_categoria(
    categoria: CategoriaCrear,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(verificar_rol_admin),
):
    cat_existente = db.query(Categoria).filter(Categoria.nombre.ilike(categoria.nombre)).first()
    if cat_existente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe una categoría con ese nombre")

    nueva_categoria = Categoria(nombre=categoria.nombre)
    db.add(nueva_categoria)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe una categoría con ese nombre")
    db.refresh(nueva_categoria)
    return nueva_categoria

@router.put("/{categoria_id}", response_model=CategoriaRespuesta)
def actualizar_categoria(
    categoria_id: UUID,
    categoria: CategoriaActualizar,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(verificar_rol_admin),
):
    cat_bd = db.query(Categoria).filter(Categoria.id == categoria_id).first()
    if not cat_bd:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada")

    cat_existente = db.query(Categoria).filter(
        Categoria.nombre.ilike(categoria.nombre),
        Categoria.id != categoria_id
    ).first()
    if cat_existente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe otra categoría con ese nombre")

    cat_bd.nombre = categoria.nombre
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe otra categoría con ese nombre")
    db.refresh(cat_bd)
    return cat_bd

@router.delete("/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_categoria(
    categoria_id: UUID,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(verificar_rol_admin),
):
    cat_bd = db.query(Categoria).filter(Categoria.id == categoria_id).first()
    if not cat_bd:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada")

    db.delete(cat_bd)
    db.commit()
    return None
