import { useState, useEffect } from 'react';
import { ProductoImpacto } from '../../types';
import { formatoDinero } from '../../utils/formato';
import Boton from '../../components/ui/Boton';
import Modal from '../../components/ui/Modal';

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
    <div className="space-y-1.5 rounded border border-borde bg-superficie px-3 py-2.5 text-sm text-tinta-suave">
      {abiertas.transacciones > 0 && (
        <p>
          Aparece en cuentas <span className="text-tinta">abiertas</span> de{' '}
          <span className="text-tinta">{abiertas.clientes}</span>{' '}
          {abiertas.clientes === 1 ? 'cliente' : 'clientes'} ({abiertas.transacciones}{' '}
          {abiertas.transacciones === 1 ? 'consumo' : 'consumos'})
        </p>
      )}
      {pagadas.transacciones > 0 && (
        <p>
          Aparece en el historial <span className="text-tinta">pagado</span> de{' '}
          <span className="text-tinta">{pagadas.clientes}</span>{' '}
          {pagadas.clientes === 1 ? 'cliente' : 'clientes'} ({pagadas.transacciones}{' '}
          {pagadas.transacciones === 1 ? 'consumo' : 'consumos'})
        </p>
      )}
      {perdidas > 0 && (
        <p>
          Tiene <span className="text-tinta">{perdidas}</span>{' '}
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

  if (!impacto) return null;

  const hayConsumosAbiertos = impacto.cuentas_abiertas.transacciones > 0;

  return (
    <Modal
      abierto={isOpen}
      onCerrar={onCancelar}
      titulo={modo === 'eliminar' ? `Archivar "${impacto.nombre}"` : `Cambiar precio de "${impacto.nombre}"`}
      ancho="sm"
      anidado={nested}
      pie={
        <>
          <Boton variante="sutil" onClick={onCancelar} disabled={cargando}>
            Cancelar
          </Boton>
          <Boton
            variante={modo === 'eliminar' ? 'peligro' : 'primario'}
            onClick={() => onConfirmar(modo === 'editar-precio' && opcionPrecio === 'actualizar')}
            cargando={cargando}
            textoCargando="Procesando…"
          >
            {modo === 'eliminar' ? 'Archivar producto' : 'Guardar cambios'}
          </Boton>
        </>
      }
    >
      <div className="space-y-4">
        <ResumenImpacto impacto={impacto} />

        {modo === 'eliminar' ? (
          <p className="text-sm text-tinta-suave">
            El producto se archiva: desaparece del inventario y de las búsquedas, pero el historial de
            los clientes se mantiene intacto. Si más adelante creás un producto con el mismo nombre, se
            reactiva automáticamente.
          </p>
        ) : hayConsumosAbiertos ? (
          <div className="space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded border border-borde px-3 py-2.5 transition-colors duration-rapida hover:bg-superficie-sutil">
              <input
                type="radio"
                name="opcion-precio"
                checked={opcionPrecio === 'mantener'}
                onChange={() => setOpcionPrecio('mantener')}
                className="mt-1 accent-acento"
              />
              <span className="text-sm text-tinta-suave">
                <span className="block text-tinta">Mantener los precios ya anotados</span>
                Los consumos abiertos conservan{' '}
                {precioAnterior != null ? formatoDinero(precioAnterior) : 'su precio actual'}.
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded border border-borde px-3 py-2.5 transition-colors duration-rapida hover:bg-superficie-sutil">
              <input
                type="radio"
                name="opcion-precio"
                checked={opcionPrecio === 'actualizar'}
                onChange={() => setOpcionPrecio('actualizar')}
                className="mt-1 accent-acento"
              />
              <span className="text-sm text-tinta-suave">
                <span className="block text-tinta">
                  Actualizar los {impacto.cuentas_abiertas.transacciones} consumos abiertos
                </span>
                Pasan a {precioNuevo != null ? formatoDinero(precioNuevo) : 'el precio nuevo'}. Las
                cuentas ya pagadas nunca se modifican.
              </span>
            </label>
          </div>
        ) : (
          <p className="text-sm text-tinta-suave">
            No hay consumos en cuentas abiertas, así que el precio nuevo no afecta ningún historial.
          </p>
        )}
      </div>
    </Modal>
  );
};

export default ModalImpactoProducto;
