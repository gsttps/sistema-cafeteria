import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import Boton from '../../components/ui/Boton';
import Campo from '../../components/ui/Campo';
import Modal from '../../components/ui/Modal';
import ModalConfirmacion from '../../components/ModalConfirmacion';
import { Categoria } from '../../types';
import { servicioCategoria } from '../../services/api';

interface ModalCategoriasProps {
  isOpen: boolean;
  onClose: () => void;
}

const ModalCategorias = ({ isOpen, onClose }: ModalCategoriasProps) => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoNombre, setEditandoNombre] = useState('');
  const [pendienteEliminarId, setPendienteEliminarId] = useState<string | null>(null);

  const cargarCategorias = async () => {
    setCargando(true);
    try {
      const resp = await servicioCategoria.obtenerTodos();
      setCategorias(resp.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar categorías');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      cargarCategorias();
      setError(null);
      setNuevaCategoria('');
      setEditandoId(null);
    }
  }, [isOpen]);

  const handleCrear = async () => {
    if (!nuevaCategoria.trim()) return;
    try {
      setError(null);
      await servicioCategoria.crear({ nombre: nuevaCategoria });
      setNuevaCategoria('');
      cargarCategorias();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al crear categoría');
    }
  };

  const handleActualizar = async (id: string) => {
    if (!editandoNombre.trim()) return;
    try {
      setError(null);
      await servicioCategoria.actualizar(id, { nombre: editandoNombre });
      setEditandoId(null);
      cargarCategorias();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al actualizar categoría');
    }
  };

  const confirmarEliminar = async () => {
    if (!pendienteEliminarId) return;
    try {
      setError(null);
      await servicioCategoria.eliminar(pendienteEliminarId);
      cargarCategorias();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al eliminar. Asegúrate que no haya productos usándola.');
    } finally {
      setPendienteEliminarId(null);
    }
  };

  return (
    <>
      <ModalConfirmacion
        isOpen={!!pendienteEliminarId}
        titulo="Eliminar categoría"
        mensaje="¿Seguro que deseas eliminar esta categoría? Los productos asociados quedarán sin categoría."
        textoConfirmar="Eliminar"
        peligroso
        onConfirmar={confirmarEliminar}
        onCancelar={() => setPendienteEliminarId(null)}
      />

      <Modal abierto={isOpen} onCerrar={onClose} titulo="Categorías" ancho="sm">
        <div className="space-y-4">
          {error && (
            <p className="border-l-2 border-deuda bg-deuda-suave px-3 py-2 text-sm text-tinta">{error}</p>
          )}

          <div className="flex gap-2">
            <Campo
              placeholder="Nueva categoría…"
              value={nuevaCategoria}
              onChange={(e) => setNuevaCategoria(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCrear()}
              contenedorClassName="flex-1"
            />
            <Boton variante="primario" onClick={handleCrear} disabled={!nuevaCategoria.trim()}>
              <Plus size={15} /> Añadir
            </Boton>
          </div>

          <div className="max-h-64 space-y-1 overflow-y-auto">
            {cargando && categorias.length === 0 ? (
              <p className="py-4 text-center text-sm text-tinta-tenue">Cargando…</p>
            ) : categorias.length === 0 ? (
              <p className="py-4 text-center text-sm text-tinta-tenue">No hay categorías todavía.</p>
            ) : (
              categorias.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between gap-2 rounded border border-borde px-3 py-2"
                >
                  {editandoId === cat.id ? (
                    <>
                      <input
                        type="text"
                        value={editandoNombre}
                        onChange={(e) => setEditandoNombre(e.target.value)}
                        className="campo flex-1 !py-1 text-sm"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleActualizar(cat.id)}
                      />
                      <button
                        onClick={() => handleActualizar(cat.id)}
                        aria-label="Guardar cambios"
                        className="rounded p-1 text-pagado transition-colors duration-rapida hover:bg-pagado-suave"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => setEditandoId(null)}
                        aria-label="Cancelar edición"
                        className="rounded p-1 text-tinta-tenue transition-colors duration-rapida hover:bg-superficie-sutil"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-tinta">{cat.nombre}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setEditandoId(cat.id); setEditandoNombre(cat.nombre); }}
                          aria-label={`Editar ${cat.nombre}`}
                          className="rounded p-1 text-tinta-tenue transition-colors duration-rapida hover:bg-superficie-sutil hover:text-tinta"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setPendienteEliminarId(cat.id)}
                          aria-label={`Eliminar ${cat.nombre}`}
                          className="rounded p-1 text-tinta-tenue transition-colors duration-rapida hover:bg-deuda-suave hover:text-deuda"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ModalCategorias;
