from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from backend.base_datos import obtener_db, obtener_usuario_actual
from backend.modelos import Categoria, Usuario
from backend.esquemas import CategoriaCrear, CategoriaActualizar, CategoriaRespuesta

router = APIRouter(prefix="/categorias", tags=["Categorias"])

@router.get("/", response_model=List[CategoriaRespuesta])
def listar_categorias(db: Session = Depends(obtener_db), usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    return db.query(Categoria).order_by(Categoria.nombre).all()

@router.post("/", response_model=CategoriaRespuesta, status_code=status.HTTP_201_CREATED)
def crear_categoria(
    categoria: CategoriaCrear,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    if usuario_actual.rol != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos para crear categorías")
        
    cat_existente = db.query(Categoria).filter(Categoria.nombre.ilike(categoria.nombre)).first()
    if cat_existente:
        raise HTTPException(status_code=400, detail="Ya existe una categoría con ese nombre")
        
    nueva_categoria = Categoria(nombre=categoria.nombre)
    db.add(nueva_categoria)
    db.commit()
    db.refresh(nueva_categoria)
    return nueva_categoria

@router.put("/{categoria_id}", response_model=CategoriaRespuesta)
def actualizar_categoria(
    categoria_id: UUID,
    categoria: CategoriaActualizar,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    if usuario_actual.rol != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos para editar categorías")
        
    cat_bd = db.query(Categoria).filter(Categoria.id == categoria_id).first()
    if not cat_bd:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
        
    # Verificar si el nuevo nombre ya existe en OTRA categoría
    cat_existente = db.query(Categoria).filter(
        Categoria.nombre.ilike(categoria.nombre),
        Categoria.id != categoria_id
    ).first()
    
    if cat_existente:
        raise HTTPException(status_code=400, detail="Ya existe otra categoría con ese nombre")
        
    cat_bd.nombre = categoria.nombre
    db.commit()
    db.refresh(cat_bd)
    return cat_bd

@router.delete("/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_categoria(
    categoria_id: UUID,
    db: Session = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    if usuario_actual.rol != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos para eliminar categorías")
        
    cat_bd = db.query(Categoria).filter(Categoria.id == categoria_id).first()
    if not cat_bd:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
        
    db.delete(cat_bd)
    db.commit()
    return None
