import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Check, AlertCircle } from 'lucide-react';
import ModalConfirmacion from '../../components/ModalConfirmacion';
import { Categoria } from '../../types';
import { servicioCategoria } from '../../services/api';
import { useTeclaEscape } from '../../hooks/useTeclaEscape';

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

  // Escape cierra el modal, salvo que haya una confirmación anidada abierta
  // (en ese caso Escape lo maneja la propia ModalConfirmacion).
  useTeclaEscape(isOpen && !pendienteEliminarId, onClose);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Gestionar categorías">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="bg-[#0b1120] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative z-10 anim-slide-in">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
          <h2 className="text-xl font-bold text-slate-100">Gestionar Categorías</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2">
            <input 
              type="text"
              placeholder="Nueva categoría..."
              value={nuevaCategoria}
              onChange={(e) => setNuevaCategoria(e.target.value)}
              className="input-premium flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleCrear()}
            />
            <button 
              onClick={handleCrear}
              disabled={!nuevaCategoria.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl transition-colors font-medium flex items-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <Plus size={18} />
              Añadir
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {cargando && categorias.length === 0 ? (
              <p className="text-slate-500 text-center py-4">Cargando...</p>
            ) : categorias.length === 0 ? (
              <p className="text-slate-500 text-center py-4 text-sm">No hay categorías. Crea una.</p>
            ) : (
              categorias.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-white/5 hover:bg-slate-800/80 transition-colors">
                  {editandoId === cat.id ? (
                    <div className="flex flex-1 gap-2 mr-2">
                      <input 
                        type="text"
                        value={editandoNombre}
                        onChange={(e) => setEditandoNombre(e.target.value)}
                        className="input-premium py-1 text-sm flex-1"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleActualizar(cat.id)}
                      />
                      <button onClick={() => handleActualizar(cat.id)} aria-label="Guardar cambios" className="text-emerald-400 hover:text-emerald-300 p-1">
                        <Check size={18} />
                      </button>
                      <button onClick={() => setEditandoId(null)} aria-label="Cancelar edición" className="text-slate-400 hover:text-slate-300 p-1">
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-slate-200 font-medium">{cat.nombre}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setEditandoId(cat.id); setEditandoNombre(cat.nombre); }}
                          aria-label={`Editar ${cat.nombre}`}
                          className="text-blue-400 hover:text-blue-300 p-1.5 rounded-lg hover:bg-blue-400/10 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setPendienteEliminarId(cat.id)}
                          aria-label={`Eliminar ${cat.nombre}`}
                          className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-400/10 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default ModalCategorias;
