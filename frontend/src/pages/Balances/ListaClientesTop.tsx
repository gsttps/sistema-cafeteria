import { ClienteTop } from '../../types';
import Monto from '../../components/ui/Monto';
import Tarjeta from '../../components/ui/Tarjeta';
import EstadoVacio from './EstadoVacio';

interface ListaClientesTopProps {
  clientes: ClienteTop[];
}

const ListaClientesTop = ({ clientes }: ListaClientesTopProps) => (
  <Tarjeta className="h-full">
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-tinta">Mejores clientes</h2>
      <p className="text-xs text-tinta-tenue">Por consumo del mes</p>
    </div>

    {!clientes.length ? (
      <EstadoVacio mensaje="Sin consumos registrados este mes" altura="h-40" />
    ) : (
      <ul className="list-none space-y-1 p-0">
        {clientes.map((c, i) => (
          <li
            key={c.nombre}
            className="flex items-center gap-3 rounded px-2 py-2 transition-colors duration-rapida hover:bg-superficie-sutil"
          >
            <span className="cifra flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-superficie text-xs text-tinta-tenue">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-tinta">{c.nombre}</p>
              <p className="text-xs text-tinta-tenue">{c.unidades} unidades</p>
            </div>
            <Monto valor={c.total_gastado} />
          </li>
        ))}
      </ul>
    )}
  </Tarjeta>
);

export default ListaClientesTop;
