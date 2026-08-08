import { useState, useEffect } from 'react';
import { PackageX, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PerdidaInventario } from '../../types';
import { servicioPerdida } from '../../services/api';
import Modal from '../../components/ui/Modal';
import Monto from '../../components/ui/Monto';
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
      toast.error('No se pudo cargar el historial de pérdidas.');
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

  return (
    <>
      <Modal abierto={isOpen} onCerrar={onClose} titulo="Historial de pérdidas" ancho="lg">
        <div className="max-h-[60vh] overflow-y-auto">
          {cargando ? (
            <p className="py-8 text-center text-sm text-tinta-tenue">Cargando…</p>
          ) : perdidas.length === 0 ? (
            <div className="py-12 text-center text-tinta-tenue">
              <PackageX className="mx-auto mb-3 opacity-30" size={36} />
              No hay pérdidas registradas.
            </div>
          ) : (
            <ul className="list-none space-y-2 p-0">
              {perdidas.map((p) => (
                <li
                  key={p.id}
                  className="flex items-start justify-between gap-3 rounded border border-borde px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-tinta">
                      {p.cantidad} × {p.producto_nombre || 'Producto eliminado'}
                    </p>
                    <p className="mt-0.5 text-xs text-tinta-suave">
                      {p.motivo || <span className="italic text-tinta-tenue">Sin motivo registrado</span>}
                    </p>
                    <p className="mt-1 text-xs text-tinta-tenue">
                      {new Date(p.fecha_hora).toLocaleDateString('es-CL', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Monto valor={-(p.cantidad * Number(p.costo_historico))} tono="deuda" />
                    <button
                      onClick={() => setPendienteEliminarId(p.id)}
                      className="rounded p-1 text-tinta-tenue transition-colors duration-rapida hover:bg-deuda-suave hover:text-deuda"
                      title="Eliminar registro (repone el stock)"
                      aria-label="Eliminar registro de pérdida"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {perdidas.length > 0 && (
          <div className="mt-4 flex items-center justify-between border-t border-borde pt-3 text-sm">
            <span className="text-tinta-tenue">
              {perdidas.length} {perdidas.length === 1 ? 'registro' : 'registros'}
            </span>
            <span className="text-tinta-suave">
              Total perdido <Monto valor={totalPerdido} tono="deuda" />
            </span>
          </div>
        )}
      </Modal>

      <ModalConfirmacion
        isOpen={!!pendienteEliminarId}
        titulo="Eliminar registro de pérdida"
        mensaje="Se elimina el registro y la cantidad perdida se repone al stock del producto. ¿Continuar?"
        textoConfirmar="Eliminar"
        peligroso
        onConfirmar={confirmarEliminar}
        onCancelar={() => setPendienteEliminarId(null)}
      />
    </>
  );
};

export default ModalHistorialPerdidas;
