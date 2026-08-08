import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { VentaDia } from '../../types';
import { formatoDinero, formatoDineroCompacto } from '../../utils/formato';
import { SERIE, ejeProps, grillaProps, tooltipProps } from '../../utils/paletaGraficos';
import Tarjeta from '../../components/ui/Tarjeta';
import EstadoVacio from './EstadoVacio';

interface GraficoVentasDiariasProps {
  datos: VentaDia[];
  /** Consumo del mes cuya fecha cae fuera del rango (no se puede ubicar en un día) */
  fueraDeRango: number;
}

const GraficoVentasDiarias = ({ datos, fueraDeRango }: GraficoVentasDiariasProps) => {
  const hayDatos = datos.some((d) => d.monto > 0);
  // Con 28-31 días no caben todas las etiquetas: se muestra ~1 de cada 3
  const intervalo = Math.max(0, Math.ceil(datos.length / 10) - 1);

  return (
    <Tarjeta className="h-full">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-tinta">Ventas por día</h2>
        <p className="text-xs text-tinta-tenue">Según la fecha registrada de cada consumo</p>
        {fueraDeRango > 0 && (
          <p className="mt-1 text-xs text-acento">
            No incluye {formatoDinero(fueraDeRango)} con fecha fuera del mes
          </p>
        )}
      </div>

      {!hayDatos ? (
        <EstadoVacio mensaje="No hay ventas registradas en este mes" altura="h-56 sm:h-64" />
      ) : (
        <div className="h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datos} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid {...grillaProps} />
              <XAxis dataKey="dia" {...ejeProps} interval={intervalo} />
              <YAxis {...ejeProps} tickFormatter={(v: number) => formatoDineroCompacto(v)} width={62} />
              <Tooltip
                {...tooltipProps}
                formatter={(valor) => [formatoDinero(Number(valor ?? 0)), 'Ventas']}
                labelFormatter={(dia) => `Día ${dia}`}
              />
              {/* Una serie = un color. Nada de un color por barra. */}
              <Bar dataKey="monto" name="Ventas" fill={SERIE[0]} radius={[3, 3, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Tarjeta>
  );
};

export default GraficoVentasDiarias;
