import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatoDinero, formatoDineroCompacto } from '../../utils/formato';
import { ejeProps, grillaProps, tooltipProps } from '../../utils/paletaGraficos';
import EstadoVacio from './EstadoVacio';

export interface FilaRanking {
  etiqueta: string;
  valor: number;
}

interface GraficoRankingHorizontalProps {
  datos: FilaRanking[];
  /** Color único de la serie (slot de la paleta) */
  color: string;
  formato?: 'dinero' | 'entero';
  nombreSerie?: string;
  mensajeVacio?: string;
  altura?: string;
}

const truncar = (texto: string, max = 18) =>
  texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;

/**
 * Ranking en barras horizontales, reutilizado por productos, categorías y mermas.
 * Barras horizontales porque las etiquetas son nombres largos y variables.
 */
const GraficoRankingHorizontal = ({
  datos,
  color,
  formato = 'dinero',
  nombreSerie = 'Total',
  mensajeVacio = 'Sin datos para mostrar',
  altura = 'h-64 sm:h-72',
}: GraficoRankingHorizontalProps) => {
  if (!datos.length) return <EstadoVacio mensaje={mensajeVacio} altura={altura} />;

  const formatear = (v: number) =>
    formato === 'dinero' ? formatoDinero(v) : Math.round(v).toLocaleString('es-CL');
  const formatearEje = (v: number) =>
    formato === 'dinero' ? formatoDineroCompacto(v) : Math.round(v).toLocaleString('es-CL');

  return (
    <div className={altura}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid {...grillaProps} horizontal={false} vertical />
          <XAxis type="number" {...ejeProps} tickFormatter={formatearEje} />
          <YAxis
            type="category"
            dataKey="etiqueta"
            {...ejeProps}
            width={110}
            tickFormatter={(v: string) => truncar(v)}
          />
          <Tooltip
            {...tooltipProps}
            formatter={(valor) => [formatear(Number(valor ?? 0)), nombreSerie]}
          />
          <Bar dataKey="valor" name={nombreSerie} fill={color} radius={[0, 4, 4, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GraficoRankingHorizontal;
