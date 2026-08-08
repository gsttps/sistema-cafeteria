import { ResumenBalance } from '../../types';
import { formatoDinero } from '../../utils/formato';
import { ESTADO } from '../../utils/paletaGraficos';

interface BarraEstadisticasProps {
  resumen: ResumenBalance;
}

const Dato = ({ etiqueta, valor, detalle }: { etiqueta: string; valor: string; detalle?: string }) => (
  <div className="min-w-0 px-4 py-3 sm:py-0">
    <p className="truncate text-[0.6875rem] font-medium uppercase tracking-wide text-tinta-tenue">{etiqueta}</p>
    <p className="cifra mt-0.5 truncate text-base text-tinta">{valor}</p>
    {detalle && <p className="truncate text-[0.6875rem] text-tinta-tenue">{detalle}</p>}
  </div>
);

const BarraEstadisticas = ({ resumen }: BarraEstadisticasProps) => {
  const tasa = resumen.tasa_cobro_pct;
  const colorTasa =
    tasa === null ? ESTADO.advertencia : tasa >= 70 ? ESTADO.bueno : tasa >= 40 ? ESTADO.advertencia : ESTADO.critico;

  return (
    <div className="rounded-lg border border-borde bg-superficie-elevada">
      <div className="grid grid-cols-2 divide-x divide-y divide-borde sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-5">
        <Dato
          etiqueta="Clientes activos"
          valor={Math.round(resumen.clientes_activos.actual).toLocaleString('es-CL')}
          detalle="con consumo este mes"
        />
        <Dato
          etiqueta="Cuentas"
          valor={`${resumen.cuentas_abiertas} / ${resumen.cuentas_pagadas}`}
          detalle="abiertas / pagadas"
        />
        <Dato
          etiqueta="Unidades vendidas"
          valor={Math.round(resumen.unidades_vendidas.actual).toLocaleString('es-CL')}
        />
        <Dato etiqueta="Descuentos" valor={formatoDinero(resumen.descuentos.actual)} detalle="otorgados" />

        <div className="col-span-2 min-w-0 px-4 py-3 sm:col-span-1 sm:py-0">
          <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-tinta-tenue">Tasa de cobro</p>
          <p className="cifra mt-0.5 text-base text-tinta">{tasa === null ? '—' : `${tasa.toFixed(1)}%`}</p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-superficie">
            <div
              className="h-full rounded-full transition-all duration-entrada"
              style={{ width: `${Math.min(100, Math.max(0, tasa ?? 0))}%`, backgroundColor: colorTasa }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarraEstadisticas;
