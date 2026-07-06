import { useState, useEffect } from 'react';
import { X, PackageX, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PerdidaInventario } from '../../types';
import { servicioPerdida } from '../../services/api';
import { formatoDinero } from '../../utils/formato';
import { useTeclaEscape } from '../../hooks/useTeclaEscape';
import ModalConfirmacion from '../../components/ModalConfirmacion';

interface ModalHistorialPerdidasProps {
  isOpen: boolean;
  onClose: () => void;
  onCambio: () => void;
}

const ModalHistorialPerdidas = ({ isOpen, onClose, onCambio }: ModalHistorialPerdidasProps) => {
  const [perdidas, setPerdidas] = useState<PerdidaInventario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pendienteEliminarId, setPendienteEliminarId] = useState<string | null>(null);

  const cargarPerdidas = async () => {
    setCargando(true);
    try {
      const resp = await servicioPerdida.obtenerTodas();
      setPerdidas(resp.data);
    } catch (err) {
      console.error('Error al cargar pérdidas:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (isOpen) cargarPerdidas();
  }, [isOpen]);

  const confirmarEliminar = async () => {
    if (!pendienteEliminarId) return;
    try {
      await servicioPerdida.eliminar(pendienteEliminarId);
      toast.success('Registro eliminado. El stock fue repuesto.');
      cargarPerdidas();
      onCambio();
    } catch (err: any) {
      const detalle = err.response?.data?.detail || 'Error al eliminar el registro';
      toast.error(detalle);
    } finally {
      setPendienteEliminarId(null);
    }
  };

  const totalPerdido = perdidas.reduce((acc, p) => acc + p.cantidad * Number(p.costo_historico), 0);

  useTeclaEscape(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Historial de pérdidas">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="bg-[#0b1120] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative z-10 anim-slide-in flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <PackageX size={20} className="text-amber-400" />
            Historial de Pérdidas
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-auto flex-1">
          {cargando ? (
            <p className="p-8 text-center text-slate-500">Cargando...</p>
          ) : perdidas.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <PackageX className="mx-auto mb-3 opacity-20" size={48} />
              No hay pérdidas registradas
            </div>
          ) : (
            <div className="space-y-3">
              {perdidas.map((p) => (
                <div key={p.id} className="bg-slate-900/40 border border-white/5 rounded-xl p-4 flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-slate-100 font-semibold">
                      {p.cantidad} x {p.producto_nombre || 'Producto eliminado'}
                    </p>
                    <p className="text-slate-400 text-sm mt-1">
                      {p.motivo || <span className="italic text-slate-500">Sin motivo registrado</span>}
                    </p>
                    <p className="text-slate-500 text-xs mt-1.5">
                      {new Date(p.fecha_hora).toLocaleDateString('es-CL', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-amber-400 font-semibold text-sm">
                      -{formatoDinero(p.cantidad * Number(p.costo_historico))}
                    </span>
                    <button
                      onClick={() => setPendienteEliminarId(p.id)}
                      className="p-1.5 bg-slate-800 text-red-400 hover:text-red-300 hover:bg-slate-700 rounded-lg transition-colors border border-white/5"
                      title="Eliminar registro (repone el stock)"
                      aria-label="Eliminar registro de pérdida"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {perdidas.length > 0 && (
          <div className="p-6 border-t border-white/5 bg-slate-900/30 flex justify-between items-center">
            <span className="text-slate-400 text-sm font-semibold">
              {perdidas.length} {perdidas.length === 1 ? 'registro' : 'registros'}
            </span>
            <span className="text-slate-200 font-bold">
              Total perdido: <span className="text-amber-400">{formatoDinero(totalPerdido)}</span>
            </span>
          </div>
        )}
      </div>

      <ModalConfirmacion
        isOpen={!!pendienteEliminarId}
        titulo="Eliminar registro de pérdida"
        mensaje="Se eliminará el registro y la cantidad perdida se repondrá al stock del producto. ¿Continuar?"
        textoConfirmar="Eliminar"
        peligroso
        onConfirmar={confirmarEliminar}
        onCancelar={() => setPendienteEliminarId(null)}
      />
    </div>
  );
};

export default ModalHistorialPerdidas;
