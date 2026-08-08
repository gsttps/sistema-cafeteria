import { useEffect, useState } from 'react';
import { formatoDinero } from '../../utils/formato';
import Boton from '../../components/ui/Boton';
import Modal from '../../components/ui/Modal';
import Monto from '../../components/ui/Monto';

interface ModalPagoParcialProps {
  abierto: boolean;
  onCerrar: () => void;
  onConfirmar: (montoPagado: number) => void;
  totalCuenta: number;
}

/**
 * Registra el pago y cierra el mes. Si el cliente paga menos del total, el
 * saldo se arrastra al mes siguiente.
 */
export default function ModalPagoParcial({
  abierto,
  onCerrar,
  onConfirmar,
  totalCuenta,
}: ModalPagoParcialProps) {
  const [monto, setMonto] = useState(String(totalCuenta));

  useEffect(() => {
    if (abierto) setMonto(String(totalCuenta));
  }, [abierto, totalCuenta]);

  const montoNumero = parseInt(monto) || 0;
  const saldo = totalCuenta - montoNumero;

  const confirmar = () => {
    if (montoNumero < 0) return;
    // No se admite cobrar de más: el excedente no tiene dónde registrarse.
    onConfirmar(Math.min(montoNumero, totalCuenta));
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Registrar pago"
      ancho="sm"
      pie={
        <>
          <Boton variante="sutil" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton variante="primario" onClick={confirmar}>
            Registrar pago
          </Boton>
        </>
      }
    >
      <div className="flex items-baseline justify-between gap-4 border-b border-borde pb-3">
        <span className="text-sm text-tinta-suave">Total del mes</span>
        <Monto valor={totalCuenta} tono="total" grande />
      </div>

      <div className="mt-4">
        <label htmlFor="monto-pago" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-tinta-tenue">
          ¿Cuánto paga?
        </label>
        <input
          id="monto-pago"
          type="number"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          min="0"
          max={totalCuenta}
          autoFocus
          className="cifra w-full rounded border border-borde-fuerte bg-superficie px-3 py-2
            text-lg text-tinta transition-colors duration-rapida focus:border-acento focus:outline-none"
        />
      </div>

      {saldo > 0 && (
        <p className="mt-3 border-l-2 border-deuda bg-deuda-suave px-3 py-2 text-sm text-tinta-suave">
          Quedan <span className="cifra text-deuda">{formatoDinero(saldo)}</span> pendientes. El saldo
          pasa al mes siguiente como deuda anterior.
        </p>
      )}
    </Modal>
  );
}
