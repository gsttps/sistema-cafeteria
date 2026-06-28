import { AlertTriangle } from 'lucide-react';
import { useTeclaEscape } from '../hooks/useTeclaEscape';

interface ModalConfirmacionProps {
  isOpen: boolean;
  titulo?: string;
  mensaje: string;
  textoConfirmar?: string;
  peligroso?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

function ModalConfirmacion({
  isOpen,
  titulo = 'Confirmar acción',
  mensaje,
  textoConfirmar = 'Confirmar',
  peligroso = false,
  onConfirmar,
  onCancelar,
}: ModalConfirmacionProps) {
  useTeclaEscape(isOpen, onCancelar);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-modal-nested flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
        onClick={onCancelar}
      />
      <div className="relative z-10 bg-[#0b1120] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6 anim-slide-in">
        <div className="flex items-center gap-3 mb-3">
          {peligroso && <AlertTriangle size={20} className="text-red-400 shrink-0" />}
          <h3 className="text-slate-100 font-bold text-lg m-0">{titulo}</h3>
        </div>
        <p className="text-slate-400 text-sm mb-6">{mensaje}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancelar}
            className="px-4 py-2 rounded-xl text-slate-300 hover:text-slate-100 hover:bg-white/5 border border-white/10 font-semibold text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
              peligroso
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
            }`}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalConfirmacion;
