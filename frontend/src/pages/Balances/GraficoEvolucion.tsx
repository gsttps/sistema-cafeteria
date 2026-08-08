import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { PuntoEvolucion } from '../../types';
import { formatoDinero, formatoDineroCompacto } from '../../utils/formato';
import { SERIE, ejeProps, grillaProps, tooltipProps, TINTA } from '../../utils/paletaGraficos';
import Tarjeta from '../../components/ui/Tarjeta';
import EstadoVacio from './EstadoVacio';

interface GraficoEvolucionProps {
  puntos: PuntoEvolucion[] | null;
  meses: number;
  onCambiarMeses: (meses: number) => void;
}

const GraficoEvolucion = ({ puntos, meses, onCambiarMeses }: GraficoEvolucionProps) => {
  const hayDatos = puntos?.some((p) => p.ventas || p.cobrado || p.por_cobrar) ?? false;

  return (
    <Tarjeta>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-tinta">Evolución</h2>
          <p className="text-xs text-tinta-tenue">Ventas, cobros y deuda mes a mes</p>
        </div>
        <div className="flex gap-1 rounded border border-borde p-0.5">
          {[6, 12].map((n) => (
            <button
              key={n}
              onClick={() => onCambiarMeses(n)}
              className={`rounded-sm px-2.5 py-1 text-xs transition-colors duration-rapida ${
                meses === n ? 'bg-acento-suave text-acento' : 'text-tinta-tenue hover:text-tinta'
              }`}
            >
              {n} meses
            </button>
          ))}
        </div>
      </div>

      {!puntos || !hayDatos ? (
        <EstadoVacio mensaje="Todavía no hay historial suficiente para mostrar la evolución" altura="h-64" />
      ) : (
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={puntos} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid {...grillaProps} />
              <XAxis dataKey="etiqueta" {...ejeProps} />
              <YAxis {...ejeProps} tickFormatter={(v: number) => formatoDineroCompacto(v)} width={62} />
              <Tooltip {...tooltipProps} formatter={(valor) => formatoDinero(Number(valor ?? 0))} />
              <Legend
                verticalAlign="top"
                height={32}
                iconType="plainline"
                wrapperStyle={{ fontSize: '12px', color: TINTA.secundaria }}
              />
              <Line type="monotone" dataKey="ventas" name="Ventas" stroke={SERIE[0]} strokeWidth={2}
                    dot={{ r: 3, strokeWidth: 0, fill: SERIE[0] }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="cobrado" name="Cobrado" stroke={SERIE[1]} strokeWidth={2}
                    dot={{ r: 3, strokeWidth: 0, fill: SERIE[1] }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="por_cobrar" name="Por cobrar" stroke={SERIE[2]} strokeWidth={2}
                    dot={{ r: 3, strokeWidth: 0, fill: SERIE[2] }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Tarjeta>
  );
};

export default GraficoEvolucion;
