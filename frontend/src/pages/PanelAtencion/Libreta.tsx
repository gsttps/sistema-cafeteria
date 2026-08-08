import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { CuentaMensual, Transaccion } from '../../types';
import { servicioCuenta } from '../../services/api';
import { formatearDia, formatoDinero } from '../../utils/formato';
import Boton from '../../components/ui/Boton';
import Insignia from '../../components/ui/Insignia';
import Monto from '../../components/ui/Monto';
import ModalPagoParcial from './ModalPagoParcial';

interface LibretaProps {
  cuenta: CuentaMensual | null;
  cargando: boolean;
  onCuentaCambiada: () => void;
  onQuitarConsumo: (transaccionId: string) => void;
}

/**
 * La cuenta del cliente leída como una página de libro contable: una fila
 * reglada por consumo, las cifras alineadas en columna, y el total al pie
 * cerrado con filete doble. El total vive acá y no en una tarjeta aparte
 * porque en una libreta la suma va al pie de la columna que suma.
 */
function Libreta({ cuenta, cargando, onCuentaCambiada, onQuitarConsumo }: LibretaProps) {
  const [descuentoInput, setDescuentoInput] = useState('0');
  const [guardandoDescuento, setGuardandoDescuento] = useState(false);
  const [mostrarCobro, setMostrarCobro] = useState(false);

  useEffect(() => {
    setDescuentoInput(cuenta ? String(Number(cuenta.porcentaje_descuento)) : '0');
  }, [cuenta]);

  // Guardado con debounce del descuento. Si falla, se revierte y se avisa: dejar
  // en pantalla un descuento que no se guardó lleva a cobrar de menos.
  useEffect(() => {
    if (!cuenta?.id) return;
    const cuentaId = cuenta.id;
    const dbDesc = Number(cuenta.porcentaje_descuento);
    const localDesc = descuentoInput === '' ? 0 : Number(descuentoInput);
    if (localDesc === dbDesc) return;

    const t = setTimeout(async () => {
      setGuardandoDescuento(true);
      try {
        await servicioCuenta.actualizarDescuento(cuentaId, localDesc);
        onCuentaCambiada();
      } catch (error) {
        console.error('Error al actualizar descuento:', error);
        toast.error('No se pudo guardar el descuento.');
        setDescuentoInput(String(dbDesc));
      } finally {
        setGuardandoDescuento(false);
      }
    }, 500);

    return () => clearTimeout(t);
  }, [descuentoInput, cuenta, onCuentaCambiada]);

  const subtotal = Number(cuenta?.total_original || 0);
  const porcentaje = descuentoInput === '' ? 0 : Math.min(100, Math.max(0, Number(descuentoInput)));
  const descuento = (subtotal * porcentaje) / 100;
  const total = subtotal - descuento;

  const cobrar = async (montoPagado: number) => {
    if (!cuenta?.id) return;
    try {
      // El descuento viaja junto al pago: el backend cobra exactamente el total
      // que se mostró, aunque el guardado con debounce no haya llegado.
      await servicioCuenta.cerrar(cuenta.id, montoPagado, porcentaje);
      setMostrarCobro(false);
      onCuentaCambiada();
    } catch (error) {
      console.error('Error al cerrar cuenta', error);
      toast.error('No se pudo registrar el pago.');
    }
  };

  const pagadas = cuenta?.transacciones_pagadas ?? [];
  const activas = cuenta?.transacciones ?? [];
  // El saldo arrastrado encabeza la cuenta: es lo que se debía antes de empezar.
  const arrastre = activas.filter((t) => t.es_arrastre);
  const consumos = activas.filter((t) => !t.es_arrastre);
  const vacia = pagadas.length === 0 && activas.length === 0;
  const abierta = cuenta?.estado === 'abierta';

  const Fila = ({ t, pagada }: { t: Transaccion; pagada: boolean }) => (
    <li
      className={`group flex items-baseline gap-3 border-b border-borde px-4 py-2 ${
        pagada ? 'opacity-45' : ''
      }`}
    >
      <span className="cifra w-6 shrink-0 text-xs text-tinta-tenue">{formatearDia(t.fecha_hora)}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-tinta">
        {t.producto_nombre || 'Producto'}
        {pagada && (
          <Insignia tono="pagado" className="ml-2 align-middle">
            pagado
          </Insignia>
        )}
      </span>
      <span className="cifra hidden shrink-0 text-xs text-tinta-tenue sm:inline">
        {t.cantidad} × {formatoDinero(Number(t.precio_historico))}
      </span>
      <span className="w-24 shrink-0 text-right">
        <Monto valor={t.cantidad * Number(t.precio_historico)} tono={pagada ? 'suave' : 'normal'} />
      </span>
      <span className="w-6 shrink-0">
        {abierta && !pagada && (
          <button
            type="button"
            onClick={() => onQuitarConsumo(t.id)}
            title="Quitar de la cuenta"
            className="rounded p-1 text-tinta-tenue transition-colors duration-rapida hover:bg-deuda-suave hover:text-deuda sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
          >
            <Trash2 size={14} />
          </button>
        )}
      </span>
    </li>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Cabecera de columnas, como el encabezado de una hoja de libreta */}
      <div className="flex shrink-0 items-center gap-3 border-b border-borde-fuerte px-4 py-2 text-[0.6875rem] font-medium uppercase tracking-wide text-tinta-tenue">
        <span className="w-6 shrink-0">Día</span>
        <span className="min-w-0 flex-1">Detalle</span>
        <span className="hidden shrink-0 sm:inline">Cant. × Precio</span>
        <span className="w-24 shrink-0 text-right">Importe</span>
        <span className="w-6 shrink-0" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {cargando ? (
          <p className="px-4 py-6 text-sm text-tinta-tenue">Cargando la cuenta…</p>
        ) : vacia ? (
          <p className="px-4 py-6 text-sm text-tinta-tenue">
            Sin consumos este mes. Agregá un producto desde la lista de la izquierda.
          </p>
        ) : (
          <ul className="list-none p-0">
            {arrastre.map((t) => (
              <li
                key={t.id}
                className="flex items-baseline gap-3 border-b border-borde bg-superficie-sutil px-4 py-2"
              >
                <span className="cifra w-6 shrink-0 text-xs text-tinta-tenue">—</span>
                <span className="min-w-0 flex-1 truncate text-sm text-tinta-suave">
                  Saldo del mes anterior
                </span>
                <span className="w-24 shrink-0 text-right">
                  <Monto valor={t.cantidad * Number(t.precio_historico)} tono="deuda" />
                </span>
                <span className="w-6 shrink-0" />
              </li>
            ))}
            {pagadas.map((t) => (
              <Fila key={t.id} t={t} pagada />
            ))}
            {consumos.map((t) => (
              <Fila key={t.id} t={t} pagada={false} />
            ))}
          </ul>
        )}
      </div>

      {/* Pie: la suma cerrada con filete doble, la convención contable real */}
      <div className="shrink-0 border-t border-borde-fuerte px-4 pb-4 pt-3">
        <dl className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-sm text-tinta-suave">Subtotal</dt>
            <dd>
              <Monto valor={subtotal} tono="suave" />
            </dd>
          </div>

          {abierta && cuenta?.id && (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="flex items-baseline gap-2 text-sm text-tinta-suave">
                <label htmlFor="descuento">Descuento</label>
                <input
                  id="descuento"
                  type="number"
                  min="0"
                  max="100"
                  value={descuentoInput}
                  onChange={(e) => setDescuentoInput(e.target.value)}
                  disabled={guardandoDescuento}
                  className="cifra w-14 rounded border border-borde-fuerte bg-superficie px-1.5 py-0.5
                    text-right text-sm text-tinta transition-colors duration-rapida
                    focus:border-acento focus:outline-none disabled:opacity-50"
                />
                <span className="text-tinta-tenue">%</span>
              </dt>
              <dd>{descuento > 0 ? <Monto valor={-descuento} tono="suave" /> : null}</dd>
            </div>
          )}
        </dl>

        <div className="filete-doble mt-3 flex items-baseline justify-between gap-4 pt-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-tinta">Total</span>
          <Monto valor={total} tono="total" grande />
        </div>

        {abierta && cuenta?.id && (
          <Boton
            variante="primario"
            ancho
            className="mt-4"
            disabled={guardandoDescuento}
            onClick={() => setMostrarCobro(true)}
          >
            {guardandoDescuento ? 'Guardando descuento…' : 'Registrar pago'}
          </Boton>
        )}
      </div>

      <ModalPagoParcial
        abierto={mostrarCobro}
        onCerrar={() => setMostrarCobro(false)}
        onConfirmar={cobrar}
        totalCuenta={total}
      />
    </div>
  );
}

export default Libreta;
