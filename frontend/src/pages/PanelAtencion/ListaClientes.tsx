import { AlertCircle, ArrowDownAZ, Coins, Phone, Plus } from 'lucide-react';
import { Cliente } from '../../types';
import Boton from '../../components/ui/Boton';
import Insignia from '../../components/ui/Insignia';
import Monto from '../../components/ui/Monto';
import Menu from '../../components/ui/Menu';

type FiltroEstado = 'todos' | 'activos' | 'inactivos';
type CriterioOrden = 'nombre' | 'deuda' | 'estado';

interface ListaClientesProps {
  clientes: Cliente[];
  cargando: boolean;
  busqueda: string;
  onBusqueda: (v: string) => void;
  filtroEstado: FiltroEstado;
  onFiltroEstado: (v: FiltroEstado) => void;
  criterioOrden: CriterioOrden;
  onCriterioOrden: (v: CriterioOrden) => void;
  onSeleccionar: (c: Cliente) => void;
  onNuevoCliente: () => void;
}

function ListaClientes({
  clientes,
  cargando,
  busqueda,
  onBusqueda,
  filtroEstado,
  onFiltroEstado,
  criterioOrden,
  onCriterioOrden,
  onSeleccionar,
  onNuevoCliente,
}: ListaClientesProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-tinta">Cuentas</h1>
        <Boton variante="primario" onClick={onNuevoCliente}>
          <Plus size={16} /> Nuevo cliente
        </Boton>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Buscar por nombre…"
          value={busqueda}
          onChange={(e) => onBusqueda(e.target.value)}
          className="campo sm:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Menu
            value={filtroEstado}
            onChange={(v) => onFiltroEstado(v as FiltroEstado)}
            opciones={[
              { value: 'todos', label: 'Todos' },
              { value: 'activos', label: 'Activos' },
              { value: 'inactivos', label: 'Inactivos' },
            ]}
            className="min-w-[130px]"
            anchoPopup="w-[150px]"
          />
          <Menu
            value={criterioOrden}
            onChange={(v) => onCriterioOrden(v as CriterioOrden)}
            className="min-w-[220px]"
            opciones={[
              { value: 'nombre', label: 'Nombre (A–Z)', icono: ArrowDownAZ },
              { value: 'deuda', label: 'Mayor deuda', icono: Coins },
              { value: 'estado', label: 'Con deuda primero', icono: AlertCircle },
            ]}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-borde bg-superficie-elevada">
        <div className="hidden shrink-0 items-center gap-4 border-b border-borde-fuerte px-4 py-2 text-[0.6875rem] font-medium uppercase tracking-wide text-tinta-tenue sm:flex">
          <span className="flex-1">Cliente</span>
          <span className="w-24">Estado</span>
          <span className="w-28 text-right">Debe</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {cargando ? (
            <p className="px-4 py-8 text-sm text-tinta-tenue">Cargando clientes…</p>
          ) : clientes.length === 0 ? (
            <p className="px-4 py-8 text-sm text-tinta-tenue">
              No hay clientes que coincidan. Probá con otro nombre o creá uno nuevo.
            </p>
          ) : (
            <ul className="list-none p-0">
              {clientes.map((c) => {
                const debe = Number(c.deuda) > 0;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onSeleccionar(c)}
                      className={`flex w-full items-center gap-4 border-b border-borde px-4 py-2.5 text-left
                        transition-colors duration-rapida hover:bg-superficie-sutil
                        ${c.estado === 'inactivo' ? 'opacity-50' : ''}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-tinta">{c.nombre}</span>
                        {c.telefono && (
                          <span className="mt-0.5 flex items-center gap-1 text-xs text-tinta-tenue">
                            <Phone size={11} /> {c.telefono}
                          </span>
                        )}
                      </span>
                      <span className="hidden w-24 sm:block">
                        {c.estado === 'inactivo' ? (
                          <Insignia>inactivo</Insignia>
                        ) : debe ? (
                          <Insignia tono="deuda">debe</Insignia>
                        ) : (
                          <Insignia tono="pagado">al día</Insignia>
                        )}
                      </span>
                      <span className="w-28 shrink-0 text-right">
                        <Monto valor={Number(c.deuda)} tono={debe ? 'deuda' : 'suave'} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default ListaClientes;
