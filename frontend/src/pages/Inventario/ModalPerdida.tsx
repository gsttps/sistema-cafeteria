import { useState, useEffect } from 'react';
import { X, PackageX, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Producto } from '../../types';
import { servicioPerdida } from '../../services/api';
import { useTeclaEscape } from '../../hooks/useTeclaEscape';

interface ModalPerdidaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  producto: Producto | null;
}

const ModalPerdida = ({ isOpen, onClose, onSuccess, producto }: ModalPerdidaProps) => {
  const [cantidad, setCantidad] = useState<number | ''>(1);
  const [motivo, setMotivo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCantidad(1);
      setMotivo('');
      setError(null);
    }
  }, [isOpen]);

  const handleRegistrar = async () => {
    if (!producto) return;
    if (cantidad === '' || Number(cantidad) < 1) {
      setError('La cantidad debe ser al menos 1');
      return;
    }

    setCargando(true);
    setError(null);

    try {
      await servicioPerdida.crear({
        producto_id: producto.id,
        cantidad: Number(cantidad),
        motivo: motivo.trim() || undefined,
      });
      toast.success(`Pérdida registrada: ${cantidad} x ${producto.nombre}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al registrar la pérdida');
    } finally {
      setCargando(false);
    }
  };

  useTeclaEscape(isOpen, onClose);

  if (!isOpen || !producto) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Registrar pérdida">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="bg-[#0b1120] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative z-10 anim-slide-in">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <PackageX size={20} className="text-amber-400" />
            Registrar Pérdida
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1">Producto</p>
            <p className="text-slate-100 font-semibold">{producto.nombre}</p>
            <p className="text-slate-500 text-xs mt-1">Stock actual: {producto.stock_actual}</p>
          </div>

          <div>
            <label className="block text-slate-400 text-sm font-semibold mb-2">
              Cantidad perdida *
            </label>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value ? Number(e.target.value) : '')}
              className="input-premium"
              placeholder="1"
              min="1"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm font-semibold mb-2">
              Motivo
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="input-premium"
              placeholder="Ej. Se rompió, vencido, derramado..."
              maxLength={200}
            />
          </div>

          <p className="text-slate-500 text-xs">
            Se descontará la cantidad del stock y quedará registrada en el historial de pérdidas.
          </p>
        </div>

        <div className="p-6 border-t border-white/5 bg-slate-900/30 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-300 font-medium hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleRegistrar}
            disabled={cargando}
            className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-xl transition-colors font-medium flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            <PackageX size={18} />
            {cargando ? 'Registrando...' : 'Registrar Pérdida'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalPerdida;
