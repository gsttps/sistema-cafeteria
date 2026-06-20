import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, DollarSign, AlertCircle } from 'lucide-react';

interface ModalPagoParcialProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (montoPagado: number) => void;
  totalCuenta: number;
}

export default function ModalPagoParcial({ isOpen, onClose, onConfirm, totalCuenta }: ModalPagoParcialProps) {
  const [monto, setMonto] = useState<string>(totalCuenta.toString());

  useEffect(() => {
    if (isOpen) {
      setMonto(totalCuenta.toString());
    }
  }, [isOpen, totalCuenta]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const numMonto = parseInt(monto) || 0;
    if (numMonto < 0) return;
    if (numMonto > totalCuenta) {
      onConfirm(totalCuenta); // No permitimos pagar más del total
    } else {
      onConfirm(numMonto);
    }
  };

  const numMonto = parseInt(monto) || 0;
  const deuda = totalCuenta - numMonto;

  const modalContent = (
    <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 anim-fade-in">
      <div className="bg-[#0b1120] border border-slate-700/50 rounded-3xl w-full max-w-lg shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/30">
          <div className="flex items-center gap-3 text-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
              <DollarSign size={20} className="text-emerald-400" />
            </div>
            <h3 className="font-bold text-xl">Cerrar Cuenta</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
            <span className="text-slate-400 font-semibold text-sm">Total de la Cuenta</span>
            <span className="text-2xl font-bold text-slate-100">${totalCuenta.toLocaleString('es-CL')}</span>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2 ml-1">
              ¿Cuánto paga el cliente?
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-emerald-400 font-bold">$</span>
              </div>
              <input
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="input-premium !pl-10 text-lg font-bold"
                placeholder="Monto a pagar..."
                min="0"
                max={totalCuenta}
              />
            </div>
          </div>

          {deuda > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 anim-fade-in">
              <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-amber-400 font-bold text-sm">Pago Parcial</h4>
                <p className="text-amber-200/80 text-sm mt-1 leading-relaxed">
                  El saldo pendiente de <strong className="text-amber-300">${deuda.toLocaleString('es-CL')}</strong> será traspasado automáticamente como "Deuda anterior" al próximo mes.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 px-4 rounded-xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3.5 px-4 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all duration-300 transform hover:scale-[1.02]"
          >
            Confirmar Pago
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
