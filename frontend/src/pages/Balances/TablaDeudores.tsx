import { useMemo, useState } from 'react';
import { ArrowUpDown, Search } from 'lucide-react';
import { DeudorFila } from '../../types';
import Monto from '../../components/ui/Monto';
import Tarjeta from '../../components/ui/Tarjeta';
import EstadoVacio from './EstadoVacio';

interface TablaDeudoresProps {
  deudores: DeudorFila[];
}

type Columna = 'nombre' | 'deuda_mes' | 'deuda_total';

const TablaDeudores = ({ deudores }: TablaDeudoresProps) => {
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<{ col: Columna; dir: 'asc' | 'desc' }>({
    col: 'deuda_total',
    dir: 'desc',
  });

  const filas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const filtradas = texto
      ? deudores.filter((d) => d.nombre.toLowerCase().includes(texto))
      : deudores;

    return [...filtradas].sort((a, b) => {
      const factor = orden.dir === 'asc' ? 1 : -1;
      if (orden.col === 'nombre') return a.nombre.localeCompare(b.nombre) * factor;
      return (a[orden.col] - b[orden.col]) * factor;
    });
  }, [deudores, busqueda, orden]);

  const cambiarOrden = (col: Columna) =>
    setOrden((prev) =>
      prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'desc' },
    );

  const totalMes = filas.reduce((acc, d) => acc + d.deuda_mes, 0);
  const totalAcumulado = filas.reduce((acc, d) => acc + d.deuda_total, 0);

  const Encabezado = ({ col, children, alinear = 'left' }: { col: Columna; children: string; alinear?: 'left' | 'right' }) => (
    <th
      className={`cursor-pointer p-3 transition-colors duration-rapida hover:text-tinta ${alinear === 'right' ? 'text-right' : ''}`}
      onClick={() => cambiarOrden(col)}
    >
      <div className={`flex items-center gap-1.5 ${alinear === 'right' ? 'justify-end' : ''}`}>
        {children}
        <ArrowUpDown size={12} className={orden.col === col ? 'text-acento' : 'text-tinta-tenue'} />
      </div>
    </th>
  );

  return (
    <Tarjeta>
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-sm font-semibold text-tinta">Deudores</h2>
          <p className="text-xs text-tinta-tenue">
            Deuda de este mes y total acumulado de todas sus cuentas abiertas
          </p>
        </div>
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tinta-tenue" size={14} />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar cliente…"
            className="campo pl-8 text-sm"
          />
        </div>
      </div>

      {!deudores.length ? (
        <EstadoVacio mensaje="Nadie tiene deuda pendiente en este período" altura="h-40" />
      ) : (
        <>
          {/* Escritorio */}
          <div className="hidden max-h-[420px] overflow-auto rounded border border-borde md:block">
            <table className="w-full min-w-[600px] border-collapse text-left">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-borde-fuerte bg-superficie-alta text-[0.6875rem] uppercase tracking-wide text-tinta-tenue">
                  <Encabezado col="nombre">Cliente</Encabezado>
                  <th className="p-3">Teléfono</th>
                  <Encabezado col="deuda_mes" alinear="right">Deuda del mes</Encabezado>
                  <Encabezado col="deuda_total" alinear="right">Deuda total</Encabezado>
                  <th className="p-3 text-center">Cuentas</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((d) => (
                  <tr key={d.cliente_id} className="border-b border-borde transition-colors duration-rapida hover:bg-superficie-sutil">
                    <td className="p-3 text-sm text-tinta">{d.nombre}</td>
                    <td className="p-3 text-sm text-tinta-tenue">{d.telefono || '—'}</td>
                    <td className="p-3 text-right"><Monto valor={d.deuda_mes} tono="suave" /></td>
                    <td className="p-3 text-right"><Monto valor={d.deuda_total} tono="deuda" /></td>
                    <td className="p-3 text-center text-sm text-tinta-tenue">{d.cuentas_abiertas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil */}
          <ul className="max-h-[420px] list-none space-y-2 overflow-auto p-0 md:hidden">
            {filas.map((d) => (
              <li key={d.cliente_id} className="rounded border border-borde p-3">
                <p className="truncate text-sm text-tinta">{d.nombre}</p>
                {d.telefono && <p className="mt-0.5 text-xs text-tinta-tenue">{d.telefono}</p>}
                <div className="mt-2.5 flex items-center justify-between border-t border-borde pt-2.5 text-sm">
                  <span className="text-tinta-tenue">
                    Del mes <Monto valor={d.deuda_mes} tono="suave" />
                  </span>
                  <Monto valor={d.deuda_total} tono="deuda" />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-borde pt-4 text-sm">
            <span className="text-tinta-tenue">
              {filas.length} {filas.length === 1 ? 'deudor' : 'deudores'}
            </span>
            <span className="text-tinta-suave">
              Total del mes <Monto valor={totalMes} tono="suave" />
              <span className="mx-2 text-tinta-tenue">·</span>
              Acumulado <Monto valor={totalAcumulado} tono="deuda" />
            </span>
          </div>
        </>
      )}
    </Tarjeta>
  );
};

export default TablaDeudores;
