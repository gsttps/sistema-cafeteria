import { ArrowLeft, Pencil } from 'lucide-react';
import { Cliente, CuentaMensual, Producto } from '../../types';
import SelectorMes from '../../components/SelectorMes';
import Libreta from './Libreta';
import SelectorProductos from './SelectorProductos';

interface CuentaClienteProps {
  cliente: Cliente;
  cuenta: CuentaMensual | null;
  cargandoCuenta: boolean;
  dia: number | null;
  onCambiarDia: (d: number | null) => void;
  onCambiarPeriodo: (mes: number, anio: number) => void;
  onVolver: () => void;
  onEditarCliente: () => void;
  onQuitarConsumo: (transaccionId: string) => void;
  onCuentaCambiada: () => void;
  productos: Producto[];
  busquedaProducto: string;
  onBusquedaProducto: (v: string) => void;
  productosEnVuelo: Set<string>;
  onAgregarConsumo: (productoId: string) => void;
  onPedidoLibre: () => void;
}

function CuentaCliente({
  cliente,
  cuenta,
  cargandoCuenta,
  dia,
  onCambiarDia,
  onCambiarPeriodo,
  onVolver,
  onEditarCliente,
  onQuitarConsumo,
  onCuentaCambiada,
  productos,
  busquedaProducto,
  onBusquedaProducto,
  productosEnVuelo,
  onAgregarConsumo,
  onPedidoLibre,
}: CuentaClienteProps) {
  const ahora = new Date();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onVolver}
          aria-label="Volver a la lista de cuentas"
          className="rounded p-1.5 text-tinta-suave transition-colors duration-rapida hover:bg-superficie-sutil hover:text-tinta"
        >
          <ArrowLeft size={18} />
        </button>

        <h1 className="min-w-0 truncate text-xl font-semibold tracking-tight text-tinta">
          {cliente.nombre}
        </h1>

        <button
          type="button"
          onClick={onEditarCliente}
          aria-label="Editar cliente"
          className="rounded p-1.5 text-tinta-tenue transition-colors duration-rapida hover:bg-superficie-sutil hover:text-tinta"
        >
          <Pencil size={15} />
        </button>

        <div className="ml-auto">
          <SelectorMes
            mes={cuenta?.mes ?? ahora.getMonth() + 1}
            anio={cuenta?.anio ?? ahora.getFullYear()}
            dia={dia}
            onChangeDia={onCambiarDia}
            onChange={onCambiarPeriodo}
          />
        </div>
      </div>

      {/* Dos columnas: se carga a la izquierda, se anota a la derecha.
          La cuenta es el objeto principal, así que se lleva el ancho. */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(240px,320px)_1fr]">
        <div className="flex min-h-0 max-h-[45vh] flex-col lg:max-h-none">
          <SelectorProductos
            productos={productos}
            busqueda={busquedaProducto}
            onBusqueda={onBusquedaProducto}
            productosEnVuelo={productosEnVuelo}
            bloqueado={cuenta?.estado === 'pagada'}
            onAgregar={onAgregarConsumo}
            onPedidoLibre={onPedidoLibre}
          />
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-borde bg-superficie-elevada">
          <Libreta
            cuenta={cuenta}
            cargando={cargandoCuenta}
            onCuentaCambiada={onCuentaCambiada}
            onQuitarConsumo={onQuitarConsumo}
          />
        </div>
      </div>
    </div>
  );
}

export default CuentaCliente;
