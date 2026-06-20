import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar } from 'lucide-react';

interface SelectorMesProps {
  mes: number; // 1-12
  anio: number;
  onChange: (mes: number, anio: number) => void;
}

const NOMBRES_MESES_COMPLETOS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const NOMBRES_MESES_ABREV = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

function SelectorMes({ mes, anio, onChange }: SelectorMesProps) {
  const [mostrarPopup, setMostrarPopup] = useState(false);
  const [anioTemp, setAnioTemp] = useState(anio);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sincronizar el año local cuando cambia la prop de año
  useEffect(() => {
    setAnioTemp(anio);
  }, [anio]);

  // Cerrar popup al hacer clic afuera del componente
  useEffect(() => {
    const handleClickAfuera = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setMostrarPopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickAfuera);
    return () => document.removeEventListener('mousedown', handleClickAfuera);
  }, []);

  const seleccionarMes = (mesIdx: number) => {
    onChange(mesIdx + 1, anioTemp);
    setMostrarPopup(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setMostrarPopup(!mostrarPopup)}
        className="w-full px-5 py-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 text-blue-400 font-bold text-sm flex justify-between items-center shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:bg-blue-500/20 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all duration-300"
      >
        <div className="flex items-center gap-2">
          <Calendar size={16} />
          <span>{NOMBRES_MESES_COMPLETOS[mes - 1]} {anio}</span>
        </div>
        <ChevronDown size={16} className="text-blue-300" />
      </button>

      {mostrarPopup && (
        <div className="absolute top-full right-0 w-[300px] bg-[#0b1120]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 mt-3 z-50 shadow-[0_0_50px_rgba(0,0,0,0.7)] anim-fade-in">
          {/* Cabecera del popup: Selección de Año */}
          <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
            <button
              type="button"
              onClick={() => setAnioTemp(prev => Math.max(2022, prev - 1))}
              disabled={anioTemp <= 2022}
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 border ${
                anioTemp <= 2022 
                  ? 'bg-transparent text-slate-600 border-transparent cursor-not-allowed' 
                  : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-300 cursor-pointer shadow-inner'
              }`}
            >
              <ChevronLeft size={18} />
            </button>
            
            <span className="text-lg font-bold text-slate-100 select-none tracking-tight">
              {anioTemp}
            </span>

            <button
              type="button"
              onClick={() => setAnioTemp(prev => prev + 1)}
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 cursor-pointer transition-all duration-300 shadow-inner"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Grilla 3x4 de meses */}
          <div className="grid grid-cols-3 gap-3">
            {NOMBRES_MESES_ABREV.map((m, idx) => {
              const esSeleccionado = (idx + 1 === mes) && (anioTemp === anio);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => seleccionarMes(idx)}
                  className={`py-3 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer border ${
                    esSeleccionado 
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)] scale-105' 
                      : 'bg-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200 border-transparent hover:border-white/10 hover:scale-105'
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default SelectorMes;
