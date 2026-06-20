import { useState, useEffect } from 'react';
import { CuentaMensual } from '../types';
import { servicioCuenta } from '../services/api';
import ModalPagoParcial from '../pages/PanelAtencion/ModalPagoParcial';
import { formatoDinero } from '../utils/formato';

interface ResumenPestanasProps {
  cuentaSeleccionada: CuentaMensual | null;
  onCuentaCambiada: () => void;
  clienteEstado: 'activo' | 'inactivo';
}

function ResumenPestanas({ cuentaSeleccionada, onCuentaCambiada, clienteEstado }: ResumenPestanasProps) {
  const [descuentoInput, setDescuentoInput] = useState<string>('0');
  const [guardandoDescuento, setGuardandoDescuento] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

  // Sincronizar el descuento cuando cambia la cuenta seleccionada desde la DB (solo al cambiar de cuenta/periodo)
  useEffect(() => {
    if (cuentaSeleccionada) {
      setDescuentoInput(String(Number(cuentaSeleccionada.porcentaje_descuento)));
    } else {
      setDescuentoInput('0');
    }
  }, [cuentaSeleccionada]);

  // Guardar descuento de forma asíncrona con Debounce (500ms tras dejar de teclear)
  useEffect(() => {
    if (!cuentaSeleccionada) return;
    
    const dbDesc = Number(cuentaSeleccionada.porcentaje_descuento);
    const localDesc = descuentoInput === '' ? 0 : Number(descuentoInput);
    
    // Si coincide con lo guardado en BD, no hacemos nada
    if (localDesc === dbDesc) return;

    const delayDebounce = setTimeout(async () => {
      setGuardandoDescuento(true);
      try {
        await servicioCuenta.actualizarDescuento(cuentaSeleccionada.id, localDesc);
        onCuentaCambiada();
      } catch (error) {
        console.error('Error al actualizar descuento:', error);
      } finally {
        setGuardandoDescuento(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [descuentoInput, cuentaSeleccionada, onCuentaCambiada]);

  if (!cuentaSeleccionada) {
    return (
      <div className="bg-[#0b1120]/60 backdrop-blur-xl p-8 rounded-2xl border border-white/5 text-center text-slate-400 shadow-2xl shadow-black/40">
        <h3 className="mt-0 text-slate-300 text-lg font-semibold mb-2">Resumen de Cuenta</h3>
        <p className="text-sm">Seleccione un cliente para ver el resumen.</p>
      </div>
    );
  }

  const cerrarCuenta = async (montoPagado: number) => {
    try {
      await servicioCuenta.cerrar(cuentaSeleccionada.id, montoPagado);
      setMostrarConfirmar(false);
      onCuentaCambiada();
    } catch (error) {
      console.error('Error al cerrar cuenta', error);
    }
  };



  // Cálculos dinámicos al instante en el frontend
  const subtotal = Number(cuentaSeleccionada.total_original || 0);
  const porcentajeDescuento = descuentoInput === '' ? 0 : Math.min(100, Math.max(0, Number(descuentoInput)));
  const totalCalculado = subtotal - (subtotal * porcentajeDescuento / 100);

  return (
    <div className="bg-[#0b1120]/60 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-2xl shadow-black/40">
      <h3 className="mt-0 mb-6 text-slate-100 border-b border-slate-700/50 pb-3 text-lg font-bold">
        Resumen de cuenta
      </h3>

      <div className="flex flex-col gap-4">
        <div className="flex justify-between text-slate-400 text-sm">
          <span>Subtotal:</span>
          <span className="font-semibold text-slate-200">{formatoDinero(subtotal)}</span>
        </div>

        {cuentaSeleccionada.estado === 'abierta' && (
          <div className="flex justify-between items-center">
            <label className="text-slate-400 text-sm">Descuento (%):</label>
            <input
              type="number"
              min="0"
              max="100"
              value={descuentoInput}
              onChange={(e) => setDescuentoInput(e.target.value)}
              disabled={guardandoDescuento}
              className="input-premium !w-20 !p-2 text-right text-sm disabled:opacity-50"
            />
          </div>
        )}

        <div className="flex justify-between border-t border-dashed border-slate-600 pt-4 text-lg">
          <span className="font-bold text-slate-200">Total:</span>
          <span className="font-extrabold text-rose-400">{formatoDinero(totalCalculado)}</span>
        </div>

        <div className={`inline-block px-3 py-1.5 rounded-full text-xs font-semibold text-center mt-2 border ${
          clienteEstado === 'activo' 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
            : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
        }`}>
          Estado de cuenta: {clienteEstado === 'activo' ? 'Activo' : 'Inactivo'}
        </div>

        {cuentaSeleccionada.estado === 'abierta' && (
          <button
            onClick={() => setMostrarConfirmar(true)}
            className="w-full p-3.5 bg-emerald-500 hover:bg-emerald-600 text-white border-none rounded-xl cursor-pointer font-semibold text-base mt-4 shadow-lg shadow-emerald-500/20 transition-colors"
          >
            💵 Cerrar/Pagar Cuenta
          </button>
        )}
      </div>

      <ModalPagoParcial 
        isOpen={mostrarConfirmar}
        onClose={() => setMostrarConfirmar(false)}
        onConfirm={cerrarCuenta}
        totalCuenta={totalCalculado}
      />
    </div>
  );
}

export default ResumenPestanas;
