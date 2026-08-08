import { AlertTriangle } from 'lucide-react';
import { ProductoStockBajo } from '../../types';
import Insignia from '../../components/ui/Insignia';
import Monto from '../../components/ui/Monto';
import Tarjeta from '../../components/ui/Tarjeta';
import EstadoVacio from './EstadoVacio';

interface TarjetaStockBajoProps {
  productos: ProductoStockBajo[];
}

const TarjetaStockBajo = ({ productos }: TarjetaStockBajoProps) => (
  <Tarjeta className="h-full">
    <div className="mb-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-tinta">
        <AlertTriangle size={15} className="text-tinta-tenue" />
        Stock bajo
      </h2>
      <p className="text-xs text-tinta-tenue">Estado actual del inventario, no del mes seleccionado</p>
    </div>

    {!productos.length ? (
      <EstadoVacio mensaje="Todo el stock está sobre el umbral" altura="h-40" />
    ) : (
      <ul className="max-h-[280px] list-none space-y-1 overflow-auto p-0">
        {productos.map((p) => (
          <li
            key={p.nombre}
            className="flex items-center justify-between gap-3 rounded px-2 py-1.5 transition-colors duration-rapida hover:bg-superficie-sutil"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-tinta">{p.nombre}</p>
              <Monto valor={Number(p.precio_actual)} tono="suave" />
            </div>
            {p.stock_actual === 0 ? (
              <Insignia tono="deuda">agotado</Insignia>
            ) : (
              <Insignia>{p.stock_actual} u.</Insignia>
            )}
          </li>
        ))}
      </ul>
    )}
  </Tarjeta>
);

export default TarjetaStockBajo;
