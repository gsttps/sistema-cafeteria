import { PackageX } from 'lucide-react';
import { MermaAgrupada, MetricaKPI } from '../../types';
import { formatoDinero, formatoPorcentaje } from '../../utils/formato';
import { SERIE } from '../../utils/paletaGraficos';
import Monto from '../../components/ui/Monto';
import Tarjeta from '../../components/ui/Tarjeta';
import EstadoVacio from './EstadoVacio';
import GraficoRankingHorizontal from './GraficoRankingHorizontal';

interface PanelMermasProps {
  valorMermas: MetricaKPI;
  porMotivo: MermaAgrupada[];
  porProducto: MermaAgrupada[];
}

const PanelMermas = ({ valorMermas, porMotivo, porProducto }: PanelMermasProps) => {
  const hayMermas = porMotivo.length > 0 || porProducto.length > 0;

  return (
    <Tarjeta className="h-full">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-tinta">
            <PackageX size={15} className="text-tinta-tenue" />
            Mermas del mes
          </h2>
          {/* El sistema no registra costo de compra: no se puede hablar de margen */}
          <p className="text-xs text-tinta-tenue">Valorizadas a precio de venta</p>
        </div>
        <div className="shrink-0 text-right">
          <Monto valor={valorMermas.actual} tono="deuda" grande />
          <p className="text-xs text-tinta-tenue">
            antes {formatoDinero(valorMermas.anterior)}
            {valorMermas.variacion_pct !== null && ` · ${formatoPorcentaje(valorMermas.variacion_pct)}`}
          </p>
        </div>
      </div>

      {!hayMermas ? (
        <EstadoVacio mensaje="Sin mermas registradas en este período" altura="h-48" />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-tinta-tenue">Por motivo</p>
            <GraficoRankingHorizontal
              datos={porMotivo.map((m) => ({ etiqueta: m.etiqueta, valor: m.valor }))}
              color={SERIE[7]}
              nombreSerie="Valor perdido"
              altura="h-48"
              mensajeVacio="Sin motivos registrados"
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-tinta-tenue">Por producto</p>
            <ul className="list-none space-y-1 p-0">
              {porProducto.slice(0, 5).map((m) => (
                <li
                  key={m.etiqueta}
                  className="flex items-center justify-between gap-3 rounded px-2 py-1.5 transition-colors duration-rapida hover:bg-superficie-sutil"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-tinta">{m.etiqueta}</p>
                    <p className="text-xs text-tinta-tenue">{m.unidades} unidades</p>
                  </div>
                  <Monto valor={m.valor} tono="deuda" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Tarjeta>
  );
};

export default PanelMermas;
