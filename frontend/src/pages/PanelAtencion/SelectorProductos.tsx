import { Producto } from '../../types';
import { formatoDinero } from '../../utils/formato';
import Boton from '../../components/ui/Boton';

interface SelectorProductosProps {
  productos: Producto[];
  busqueda: string;
  onBusqueda: (v: string) => void;
  productosEnVuelo: Set<string>;
  bloqueado: boolean;
  onAgregar: (productoId: string) => void;
  onPedidoLibre: () => void;
}

/**
 * Columna de carga: buscar y tocar el producto lo anota en la cuenta.
 * Escribir y presionar Enter agrega el primero de la lista, para poder cargar
 * sin soltar el teclado mientras hay gente esperando.
 */
function SelectorProductos({
  productos,
  busqueda,
  onBusqueda,
  productosEnVuelo,
  bloqueado,
  onAgregar,
  onPedidoLibre,
}: SelectorProductosProps) {
  // La API ya excluye los productos sintéticos de arrastre, así que acá solo
  // queda filtrar por lo que el usuario escribe.
  const filtrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  );

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-borde bg-superficie-elevada">
      <div className="shrink-0 border-b border-borde p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (filtrados.length > 0) {
              onAgregar(filtrados[0].id);
              onBusqueda('');
            }
          }}
        >
          <input
            type="text"
            placeholder="Buscar producto…"
            value={busqueda}
            onChange={(e) => onBusqueda(e.target.value)}
            className="campo"
            aria-label="Buscar producto. Enter agrega el primero de la lista."
          />
        </form>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtrados.length === 0 ? (
          <p className="px-3 py-6 text-sm text-tinta-tenue">
            {productos.length === 0 ? 'No hay productos cargados.' : 'Ningún producto coincide.'}
          </p>
        ) : (
          <ul className="list-none p-0">
            {filtrados.map((prod) => {
              const enVuelo = productosEnVuelo.has(prod.id);
              return (
                <li key={prod.id}>
                  <button
                    type="button"
                    onClick={() => onAgregar(prod.id)}
                    disabled={bloqueado || enVuelo}
                    className="flex w-full items-baseline justify-between gap-3 border-b border-borde px-3 py-2
                      text-left transition-colors duration-rapida
                      hover:bg-superficie-sutil
                      disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-tinta">{prod.nombre}</span>
                    <span className="cifra shrink-0 text-sm text-tinta-suave">
                      {formatoDinero(Number(prod.precio_actual))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-borde p-3">
        <Boton variante="secundario" ancho tamano="sm" onClick={onPedidoLibre} disabled={bloqueado}>
          Pedido con precio libre
        </Boton>
      </div>
    </div>
  );
}

export default SelectorProductos;
