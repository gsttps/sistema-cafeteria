import { useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { useClickAfuera } from '../hooks/useClickAfuera';

interface Opcion {
  value: string;
  label: string;
}

interface SelectorPremiumProps {
  value: string;
  opciones: Opcion[];
  onChange: (value: string) => void;
  className?: string;
  anchoPopup?: string;
}

function SelectorPremium({ value, opciones, onChange, className = '', anchoPopup = 'w-[200px]' }: SelectorPremiumProps) {
  const [mostrarPopup, setMostrarPopup] = useState(false);
  const containerRef = useClickAfuera<HTMLDivElement>(useCallback(() => setMostrarPopup(false), []));

  const opcionSeleccionada = opciones.find(opt => opt.value === value) || opciones[0];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setMostrarPopup(!mostrarPopup)}
        aria-haspopup="listbox"
        aria-expanded={mostrarPopup}
        className="w-full px-5 py-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 text-blue-400 font-bold text-sm flex justify-between items-center shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:bg-blue-500/20 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all duration-300"
      >
        <span>{opcionSeleccionada?.label}</span>
        <ChevronDown size={16} className="text-blue-300 ml-3" />
      </button>

      {mostrarPopup && (
        <div role="listbox" className={`absolute top-full right-0 ${anchoPopup} bg-[#0b1120]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-3 mt-3 z-dropdown shadow-[0_0_50px_rgba(0,0,0,0.7)] anim-fade-in flex flex-col gap-2`}>
          {opciones.map((opcion) => {
            const esSeleccionado = opcion.value === value;
            return (
              <button
                key={opcion.value}
                type="button"
                role="option"
                aria-selected={esSeleccionado}
                onClick={() => { onChange(opcion.value); setMostrarPopup(false); }}
                className={`py-2 px-4 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer border text-left ${
                  esSeleccionado 
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)] scale-[1.02] ml-2 mr-2' 
                    : 'bg-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200 border-transparent hover:border-white/10 hover:scale-[1.02] ml-1 mr-1'
                }`}
              >
                {opcion.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SelectorPremium;
