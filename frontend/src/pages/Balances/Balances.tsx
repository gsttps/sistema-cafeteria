import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { AlertCircle, Coins, PiggyBank, Receipt, TrendingUp } from 'lucide-react';
import SelectorMes from '../../components/SelectorMes';
import { servicioBalances } from '../../services/api';
import { BalancesMes, PuntoEvolucion } from '../../types';
import { SERIE } from '../../utils/paletaGraficos';
import Boton from '../../components/ui/Boton';
import Tarjeta from '../../components/ui/Tarjeta';
import BarraEstadisticas from './BarraEstadisticas';
import BotonExportar from './BotonExportar';
import EstadoVacio from './EstadoVacio';
import GraficoEvolucion from './GraficoEvolucion';
import GraficoRankingHorizontal from './GraficoRankingHorizontal';
import GraficoVentasDiarias from './GraficoVentasDiarias';
import ListaClientesTop from './ListaClientesTop';
import PanelMermas from './PanelMermas';
import TablaDeudores from './TablaDeudores';
import TarjetaKPI from './TarjetaKPI';
import TarjetaStockBajo from './TarjetaStockBajo';

const Balances = () => {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [datos, setDatos] = useState<BalancesMes | null>(null);
  const [evolucion, setEvolucion] = useState<PuntoEvolucion[] | null>(null);
  const [mesesEvolucion, setMesesEvolucion] = useState(6);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reintento, setReintento] = useState(0);
  // Ordenar el top de productos por monto vendido o por unidades
  const [ordenProductos, setOrdenProductos] = useState<'monto' | 'unidades'>('monto');

  useEffect(() => {
    const controlador = new AbortController();
    // Solo la primera carga muestra el splash; los cambios de mes mantienen el
    // render anterior atenuado, para evitar el parpadeo y el salto de layout.
    setDatos((actuales) => {
      if (actuales === null) setCargando(true);
      else setRefrescando(true);
      return actuales;
    });

    (async () => {
      const [resBalance, resEvolucion] = await Promise.allSettled([
        servicioBalances.obtenerBalancesMes(mes, anio, controlador.signal),
        servicioBalances.obtenerEvolucion(mes, anio, mesesEvolucion, controlador.signal),
      ]);

      if (controlador.signal.aborted) return;

      if (resBalance.status === 'fulfilled') {
        setDatos(resBalance.value.data);
        setError(null);
      } else if (!axios.isCancel(resBalance.reason)) {
        console.error('Error al cargar balances:', resBalance.reason);
        setError('No se pudieron cargar los balances.');
      }

      // Si falla solo la evolución, los KPIs igual se muestran
      if (resEvolucion.status === 'fulfilled') setEvolucion(resEvolucion.value.data.puntos);
      else if (!axios.isCancel(resEvolucion.reason)) setEvolucion(null);

      setCargando(false);
      setRefrescando(false);
    })();

    return () => controlador.abort();
  }, [mes, anio, mesesEvolucion, reintento]);

  const cambiarPeriodo = useCallback((nuevoMes: number, nuevoAnio: number) => {
    setMes(nuevoMes);
    setAnio(nuevoAnio);
  }, []);

  if (cargando && datos === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-borde-fuerte border-t-acento" />
        <p className="text-sm text-tinta-tenue">Cargando balances…</p>
      </div>
    );
  }

  if (error && datos === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
        <AlertCircle size={28} className="text-deuda" />
        <div>
          <p className="text-sm text-tinta">{error}</p>
          <p className="mt-1 text-xs text-tinta-tenue">Revisá la conexión e intentá de nuevo.</p>
        </div>
        <Boton variante="secundario" onClick={() => setReintento((n) => n + 1)}>
          Reintentar
        </Boton>
      </div>
    );
  }

  if (!datos) return null;

  const r = datos.resumen;
  const productosOrdenados = [...datos.productos_top].sort((a, b) =>
    ordenProductos === 'monto'
      ? b.monto_vendido - a.monto_vendido
      : b.cantidad_vendida - a.cantidad_vendida,
  );
  // Con una sola categoría el gráfico no aporta nada (hoy los productos no
  // tienen categorías asignadas): se muestra un mensaje que lo explica.
  const hayCategoriasUtiles = datos.ventas_por_categoria.length >= 2;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 pb-2">
      {/* Fila de filtros: única, arriba de todo lo que scopea */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-tinta">Balances</h1>
          <p className="text-sm text-tinta-tenue">Resumen financiero y métricas del negocio</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative z-dropdown w-full sm:w-64">
            <SelectorMes mes={mes} anio={anio} onChange={cambiarPeriodo} />
          </div>
          <BotonExportar mes={mes} anio={anio} />
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 border-l-2 border-acento bg-acento-suave px-3 py-2 text-sm text-tinta">
          <span className="flex items-center gap-2">
            <AlertCircle size={15} className="text-acento" />
            No se pudo actualizar. Mostrando los últimos datos cargados.
          </span>
          <button
            onClick={() => setReintento((n) => n + 1)}
            className="shrink-0 font-medium underline decoration-acento/50 underline-offset-2"
          >
            Reintentar
          </button>
        </div>
      )}

      <div
        className={`flex flex-col gap-4 transition-opacity duration-entrada ${
          refrescando ? 'pointer-events-none opacity-50' : 'opacity-100'
        }`}
      >
        {/* 1. KPIs principales */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <TarjetaKPI etiqueta="Ventas del mes" metrica={r.ventas} sentido="masEsMejor"
                      icono={<TrendingUp size={14} />} nota="Consumo real, sin arrastres de deuda" />
          <TarjetaKPI etiqueta="Cobrado" metrica={r.cobrado} sentido="masEsMejor"
                      icono={<PiggyBank size={14} />} />
          <TarjetaKPI etiqueta="Por cobrar" metrica={r.por_cobrar} sentido="menosEsMejor"
                      icono={<Coins size={14} />} />
          <TarjetaKPI etiqueta="Gasto promedio por cliente" metrica={r.ticket_promedio} sentido="masEsMejor"
                      icono={<Receipt size={14} />} />
        </div>

        {/* 2. Estadísticas secundarias */}
        <BarraEstadisticas resumen={r} />

        {/* 3. Evolución multi-mes */}
        <GraficoEvolucion puntos={evolucion} meses={mesesEvolucion} onCambiarMeses={setMesesEvolucion} />

        {/* 4. Ventas por día + categorías */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <GraficoVentasDiarias datos={datos.ventas_por_dia} fueraDeRango={datos.consumo_fuera_de_rango} />
          </div>
          <Tarjeta>
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-tinta">Por categoría</h2>
              <p className="text-xs text-tinta-tenue">Distribución de las ventas del mes</p>
            </div>
            {hayCategoriasUtiles ? (
              <GraficoRankingHorizontal
                datos={datos.ventas_por_categoria.map((c) => ({ etiqueta: c.nombre, valor: c.monto }))}
                color={SERIE[4]}
                nombreSerie="Vendido"
                altura="h-56 sm:h-64"
              />
            ) : (
              <EstadoVacio
                mensaje={
                  datos.ventas_por_categoria.length === 1
                    ? 'Asigná categorías a tus productos en Inventario para ver esta distribución'
                    : 'No hay ventas registradas en este mes'
                }
                altura="h-56 sm:h-64"
              />
            )}
          </Tarjeta>
        </div>

        {/* 5. Top productos + mejores clientes */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Tarjeta className="lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-tinta">Productos más vendidos</h2>
                <p className="text-xs text-tinta-tenue">Top 10 del mes</p>
              </div>
              <div className="flex gap-1 rounded border border-borde p-0.5">
                {(['monto', 'unidades'] as const).map((modo) => (
                  <button
                    key={modo}
                    onClick={() => setOrdenProductos(modo)}
                    className={`rounded-sm px-2.5 py-1 text-xs transition-colors duration-rapida ${
                      ordenProductos === modo
                        ? 'bg-acento-suave text-acento'
                        : 'text-tinta-tenue hover:text-tinta'
                    }`}
                  >
                    Por {modo}
                  </button>
                ))}
              </div>
            </div>
            <GraficoRankingHorizontal
              datos={productosOrdenados.map((p) => ({
                etiqueta: p.nombre,
                valor: ordenProductos === 'monto' ? p.monto_vendido : p.cantidad_vendida,
              }))}
              color={SERIE[1]}
              formato={ordenProductos === 'monto' ? 'dinero' : 'entero'}
              nombreSerie={ordenProductos === 'monto' ? 'Vendido' : 'Unidades'}
              mensajeVacio="No hay ventas registradas en este mes"
              altura="h-72 sm:h-80"
            />
          </Tarjeta>
          <ListaClientesTop clientes={datos.clientes_top} />
        </div>

        {/* 6. Deudores */}
        <TablaDeudores deudores={datos.deudores} />

        {/* 7. Mermas + stock bajo */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PanelMermas
              valorMermas={r.valor_mermas}
              porMotivo={datos.mermas_por_motivo}
              porProducto={datos.mermas_por_producto}
            />
          </div>
          <TarjetaStockBajo productos={datos.stock_bajo} />
        </div>
      </div>
    </div>
  );
};

export default Balances;
