import { useState, useEffect } from 'react';
import { AlertTriangle, Archive } from 'lucide-react';
import { ProductoImpacto } from '../../types';
import { formatoDinero } from '../../utils/formato';
import { useTeclaEscape } from '../../hooks/useTeclaEscape';

interface ModalImpactoProductoProps {
  isOpen: boolean;
  modo: 'eliminar' | 'editar-precio';
  impacto: ProductoImpacto | null;
  precioAnterior?: number;
  precioNuevo?: number;
  cargando?: boolean;
  /** true cuando se abre encima de otro modal ya abierto (ej. ModalProducto) */
  nested?: boolean;
  onConfirmar: (actualizarPreciosAbiertos: boolean) => void;
  onCancelar: () => void;
}

function ResumenImpacto({ impacto }: { impacto: ProductoImpacto }) {
  const { cuentas_abiertas: abiertas, cuentas_pagadas: pagadas, perdidas } = impacto;
  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4 space-y-2 text-sm">
      {abiertas.transacciones > 0 && (
        <p className="text-slate-300">
          Aparece en cuentas <span className="text-amber-400 font-semibold">abiertas</span> de{' '}
          <span className="font-semibold text-slate-100">{abiertas.clientes}</span>{' '}
          {abiertas.clientes === 1 ? 'cliente' : 'clientes'} ({abiertas.transacciones}{' '}
          {abiertas.transacciones === 1 ? 'consumo' : 'consumos'})
        </p>
      )}
      {pagadas.transacciones > 0 && (
        <p className="text-slate-300">
          Aparece en el historial <span className="text-emerald-400 font-semibold">pagado</span> de{' '}
          <span className="font-semibold text-slate-100">{pagadas.clientes}</span>{' '}
          {pagadas.clientes === 1 ? 'cliente' : 'clientes'} ({pagadas.transacciones}{' '}
          {pagadas.transacciones === 1 ? 'consumo' : 'consumos'})
        </p>
      )}
      {perdidas > 0 && (
        <p className="text-slate-300">
          Tiene <span className="font-semibold text-slate-100">{perdidas}</span>{' '}
          {perdidas === 1 ? 'pérdida registrada' : 'pérdidas registradas'}
        </p>
      )}
    </div>
  );
}

const ModalImpactoProducto = ({
  isOpen,
  modo,
  impacto,
  precioAnterior,
  precioNuevo,
  cargando = false,
  nested = false,
  onConfirmar,
  onCancelar,
}: ModalImpactoProductoProps) => {
  const [opcionPrecio, setOpcionPrecio] = useState<'mantener' | 'actualizar'>('mantener');

  useEffect(() => {
    if (isOpen) setOpcionPrecio('mantener');
  }, [isOpen]);

  useTeclaEscape(isOpen, onCancelar);

  if (!isOpen || !impacto) return null;

  const hayConsumosAbiertos = impacto.cuentas_abiertas.transacciones > 0;

  return (
    <div
      className={`fixed inset-0 ${nested ? 'z-modal-nested' : 'z-modal'} flex items-center justify-center p-4`}
      role="dialog"
      aria-modal="true"
      aria-label={modo === 'eliminar' ? 'Confirmar archivado de producto' : 'Confirmar cambio de precio'}
    >
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onCancelar} />

      <div className="relative z-10 bg-[#0b1120] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 anim-slide-in">
        <div className="flex items-center gap-3 mb-4">
          {modo === 'eliminar' ? (
            <Archive size={20} className="text-red-400 shrink-0" />
          ) : (
            <AlertTriangle size={20} className="text-amber-400 shrink-0" />
          )}
          <h3 className="text-slate-100 font-bold text-lg m-0">
            {modo === 'eliminar' ? `Archivar "${impacto.nombre}"` : `Cambiar precio de "${impacto.nombre}"`}
          </h3>
        </div>

        <div className="mb-4">
          <ResumenImpacto impacto={impacto} />
        </div>

        {modo === 'eliminar' ? (
          <p className="text-slate-400 text-sm mb-6">
            El producto se archivará: desaparecerá del inventario y de las búsquedas, pero el historial de
            los clientes se mantiene intacto. Si más adelante creas un producto con el mismo nombre, se
            reactivará automáticamente.
          </p>
        ) : (
          <div className="space-y-3 mb-6">
            {hayConsumosAbiertos ? (
              <>
                <label className="flex items-start gap-3 p-3 rounded-xl border border-white/10 cursor-pointer hover:bg-white/5 transition-colors">
                  <input
                    type="radio"
                    name="opcion-precio"
                    checked={opcionPrecio === 'mantener'}
                    onChange={() => setOpcionPrecio('mantener')}
                    className="mt-1"
                  />
                  <span className="text-sm text-slate-300">
                    <span className="block font-semibold text-slate-100">Mantener los precios ya anotados</span>
                    Los consumos de cuentas abiertas conservan {precioAnterior != null ? formatoDinero(precioAnterior) : 'su precio actual'}.
                  </span>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-xl border border-white/10 cursor-pointer hover:bg-white/5 transition-colors">
                  <input
                    type="radio"
                    name="opcion-precio"
                    checked={opcionPrecio === 'actualizar'}
                    onChange={() => setOpcionPrecio('actualizar')}
                    className="mt-1"
                  />
                  <span className="text-sm text-slate-300">
                    <span className="block font-semibold text-slate-100">
                      Actualizar los {impacto.cuentas_abiertas.transacciones} consumos abiertos
                    </span>
                    Pasarán a {precioNuevo != null ? formatoDinero(precioNuevo) : 'el precio nuevo'}. Las cuentas ya
                    pagadas nunca se modifican.
                  </span>
                </label>
              </>
            ) : (
              <p className="text-slate-400 text-sm">
                No hay consumos en cuentas abiertas, así que el precio nuevo no afecta ningún historial.
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancelar}
            disabled={cargando}
            className="px-4 py-2 rounded-xl text-slate-300 hover:text-slate-100 hover:bg-white/5 border border-white/10 font-semibold text-sm transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirmar(modo === 'editar-precio' && opcionPrecio === 'actualizar')}
            disabled={cargando}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 ${
              modo === 'eliminar'
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
            }`}
          >
            {cargando ? 'Procesando...' : modo === 'eliminar' ? 'Archivar producto' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalImpactoProducto;
