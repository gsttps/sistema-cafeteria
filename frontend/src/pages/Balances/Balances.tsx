import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import SelectorMes from '../../components/SelectorMes';
import { servicioBalances } from '../../services/api';
import { formatoDinero } from '../../utils/formato';

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

interface ProductoTop {
  nombre: string;
  cantidad_vendida: number;
}

interface ClienteTop {
  nombre: string;
  total_gastado: number;
}

interface BalancesData {
  total_pagado: number;
  total_pendiente: number;
  productos_top: ProductoTop[];
  clientes_top: ClienteTop[];
}

const COLORS = ['#34d399', '#60a5fa', '#f87171', '#fbbf24', '#a78bfa'];

const Balances = () => {
  const [cargando, setCargando] = useState(false);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [data, setData] = useState<BalancesData | null>(null);

  useEffect(() => {
    const fetchBalances = async () => {
      setCargando(true);
      try {
        const respuesta = await servicioBalances.obtenerBalancesMes(mes, anio);
        setData(respuesta.data);
      } catch (error) {
        console.error('Error obteniendo balances:', error);
      } finally {
        setCargando(false);
      }
    };
    
    fetchBalances();
  }, [mes, anio]);



  const totalEsperado = data ? Number(data.total_pagado) + Number(data.total_pendiente) : 0;

  const descargarReporte = () => {
    if (!data) return;
    // Construye un CSV con resumen, productos top y clientes top.
    // Se usa ';' como separador (Excel en es-CL lo interpreta por columnas).
    const escapar = (valor: string | number) => {
      const texto = String(valor);
      return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
    };
    const filas: (string | number)[][] = [
      ['Reporte de Balances', `${NOMBRES_MESES[mes - 1]} ${anio}`],
      [],
      ['Resumen'],
      ['Total Pagado', Number(data.total_pagado)],
      ['Total Pendiente', Number(data.total_pendiente)],
      ['Ingreso Proyectado', totalEsperado],
      [],
      ['Productos Más Vendidos'],
      ['Producto', 'Cantidad Vendida'],
      ...data.productos_top.map((p) => [p.nombre, p.cantidad_vendida]),
      [],
      ['Mejores Clientes'],
      ['Cliente', 'Total Gastado'],
      ...data.clientes_top.map((c) => [c.nombre, Number(c.total_gastado)]),
    ];
    const csv = filas.map((fila) => fila.map(escapar).join(';')).join('\n');
    // BOM para que Excel reconozca UTF-8 (acentos)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `balances_${anio}_${String(mes).padStart(2, '0')}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
    toast.success('Reporte descargado.');
  };

  return (
    <div className="anim-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-slate-100 text-2xl sm:text-3xl" style={{ fontWeight: '800', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>
            Balances Mensuales
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            Resumen financiero y métricas clave
          </p>
        </div>
        
        {/* Selector de Mes reutilizado del Panel de Atención */}
        <div className="relative z-dropdown w-full sm:w-[300px]">
          <SelectorMes 
            mes={mes} 
            anio={anio} 
            onChange={async (nuevoMes, nuevoAnio) => {
              setMes(nuevoMes);
              setAnio(nuevoAnio);
            }} 
          />
        </div>
      </div>

      {cargando ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-4xl animate-pulse">☕</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
          
          {/* Left Column (Charts and Metrics) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Top Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-slate-800/80 backdrop-blur-md border border-white/10 shadow-lg shadow-black/40 rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:bg-slate-800/90">
                <p className="text-emerald-400/80 text-xs sm:text-sm font-semibold mb-1 uppercase tracking-wider">Total Pagado</p>
                <p className="text-emerald-400 text-2xl sm:text-3xl font-bold">{formatoDinero(Number(data?.total_pagado || 0))}</p>
              </div>
              <div className="bg-slate-800/80 backdrop-blur-md border border-white/10 shadow-lg shadow-black/40 rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:bg-slate-800/90">
                <p className="text-rose-400/80 text-xs sm:text-sm font-semibold mb-1 uppercase tracking-wider">Total Pendiente</p>
                <p className="text-rose-400 text-2xl sm:text-3xl font-bold">{formatoDinero(Number(data?.total_pendiente || 0))}</p>
              </div>
              <div className="bg-slate-800/80 backdrop-blur-md border border-blue-500/20 shadow-lg shadow-black/40 rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:bg-slate-800/90">
                <p className="text-blue-400/80 text-xs sm:text-sm font-semibold mb-1 uppercase tracking-wider">Ingreso Proyectado</p>
                <p className="text-blue-400 text-2xl sm:text-3xl font-bold">{formatoDinero(totalEsperado)}</p>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-slate-800/80 backdrop-blur-md border border-white/10 shadow-lg shadow-black/40 rounded-2xl p-4 sm:p-6 transition-all duration-300 hover:bg-slate-800/90">
              <h2 className="text-slate-100 text-lg sm:text-xl font-bold mb-4 sm:mb-6">Productos Más Vendidos</h2>
              <div className="h-56 sm:h-72">
                {data?.productos_top && data.productos_top.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.productos_top}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="nombre" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9' }}
                      />
                      <Bar dataKey="cantidad_vendida" name="Cantidad Vendida" radius={[4, 4, 0, 0]}>
                        {data.productos_top.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center border border-dashed border-slate-600 rounded-xl bg-slate-900/50">
                    <p className="text-slate-400 font-medium">No hay ventas registradas en este mes</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column (Top Customers List) */}
          <div className="bg-slate-800/80 backdrop-blur-md border border-white/10 shadow-lg shadow-black/40 rounded-2xl p-4 sm:p-6 flex flex-col h-full transition-all duration-300 hover:bg-slate-800/90">
            <h2 className="text-slate-100 text-lg sm:text-xl font-bold mb-4 sm:mb-6">Mejores Clientes</h2>
            
            <div className="space-y-4 flex-1">
              {data?.clientes_top && data.clientes_top.length > 0 ? (
                data.clientes_top.map((cliente, index) => (
                  <div key={index} className="flex justify-between items-center p-4 bg-slate-900/50 rounded-xl border border-white/5 hover:bg-slate-900/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs border border-white/10">
                        {index + 1}
                      </div>
                      <span className="text-slate-200 font-medium">{cliente.nombre}</span>
                    </div>
                    <span className="text-emerald-400 font-semibold">{formatoDinero(Number(cliente.total_gastado))}</span>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5 text-center">
                  <span className="text-slate-500 text-sm">No hay clientes con gastos este mes</span>
                </div>
              )}
            </div>

            <button
              onClick={descargarReporte}
              disabled={!data}
              className="mt-6 w-full py-3 bg-blue-600/20 hover:bg-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed text-blue-400 font-semibold rounded-xl border border-blue-500/30 transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Descargar Reporte Detallado
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default Balances;
