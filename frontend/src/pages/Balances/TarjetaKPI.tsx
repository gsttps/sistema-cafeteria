import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MetricaKPI } from '../../types';
import { formatoDinero, formatoPorcentaje } from '../../utils/formato';
import Tarjeta from '../../components/ui/Tarjeta';

interface TarjetaKPIProps {
  etiqueta: string;
  metrica: MetricaKPI;
  /** Si subir es bueno (ventas) o malo (deuda por cobrar) */
  sentido: 'masEsMejor' | 'menosEsMejor';
  formato?: 'dinero' | 'entero';
  icono?: ReactNode;
  nota?: string;
}

const TarjetaKPI = ({
  etiqueta,
  metrica,
  sentido,
  formato = 'dinero',
  icono,
  nota,
}: TarjetaKPIProps) => {
  const formatear = (v: number) =>
    formato === 'dinero' ? formatoDinero(v) : Math.round(v).toLocaleString('es-CL');

  const pct = metrica.variacion_pct;
  const subio = pct !== null && pct > 0;
  const sinCambio = pct === null || pct === 0;
  // El color depende de si el movimiento es favorable para el negocio,
  // no de si el número subió.
  const esFavorable = sentido === 'masEsMejor' ? subio : !subio;

  const claseBadge = sinCambio
    ? 'text-tinta-tenue bg-superficie-sutil border-borde-fuerte'
    : esFavorable
      ? 'text-pagado bg-pagado-suave border-pagado-borde'
      : 'text-deuda bg-deuda-suave border-deuda-borde';

  const Icono = sinCambio ? Minus : subio ? TrendingUp : TrendingDown;

  return (
    <Tarjeta>
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-tinta-tenue">{etiqueta}</p>
        {icono && <span className="shrink-0 text-tinta-tenue">{icono}</span>}
      </div>

      <p className="cifra text-2xl text-tinta">{formatear(metrica.actual)}</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs font-medium ${claseBadge}`}
          title={pct === null ? 'Sin datos del mes anterior para comparar' : undefined}
        >
          <Icono size={11} />
          {formatoPorcentaje(pct)}
        </span>
        <span className="cifra text-xs text-tinta-tenue">antes {formatear(metrica.anterior)}</span>
      </div>

      {nota && <p className="mt-2 text-[0.6875rem] text-tinta-tenue">{nota}</p>}
    </Tarjeta>
  );
};

export default TarjetaKPI;
