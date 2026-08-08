import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar } from 'lucide-react';
import { useClickAfuera } from '../hooks/useClickAfuera';

interface SelectorMesProps {
  mes: number; // 1-12
  anio: number;
  onChange: (mes: number, anio: number) => void;
  dia?: number | null; // día específico para las transacciones nuevas; null = "todo el mes"
  onChangeDia?: (dia: number | null) => void;
}

const NOMBRES_MESES_COMPLETOS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const NOMBRES_MESES_ABREV = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

function SelectorMes({ mes, anio, onChange, dia = null, onChangeDia }: SelectorMesProps) {
  const [mostrarPopup, setMostrarPopup] = useState(false);
  const [anioTemp, setAnioTemp] = useState(anio);
  const containerRef = useClickAfuera<HTMLDivElement>(useCallback(() => setMostrarPopup(false), []));

  // Sincronizar el año local cuando cambia la prop de año
  useEffect(() => {
    setAnioTemp(anio);
  }, [anio]);

  const seleccionarMes = (mesIdx: number) => {
    onChange(mesIdx + 1, anioTemp);
    // El popup permanece abierto para poder elegir el día del nuevo mes
  };

  // Cantidad de días del mes actualmente visible (mes/anio de la cuenta seleccionada)
  const diasEnMes = new Date(anio, mes, 0).getDate();

  // Se permite un año hacia adelante (para el arrastre de deuda de diciembre),
  // pero no más: sin tope se podía anotar consumo en 2099 por error.
  const ANIO_MIN = 2022;
  const ANIO_MAX = new Date().getFullYear() + 1;

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setMostrarPopup(!mostrarPopup)}
        aria-haspopup="dialog"
        aria-expanded={mostrarPopup}
        className="flex w-full items-center justify-between gap-2 rounded border border-borde-fuerte bg-superficie-elevada px-3 py-2 text-sm text-tinta transition-colors duration-rapida hover:border-tinta-tenue"
      >
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-tinta-tenue" />
          <span>
            {NOMBRES_MESES_COMPLETOS[mes - 1]} {anio}
            {dia != null && <span className="text-acento"> · día {dia}</span>}
          </span>
        </div>
        <ChevronDown size={14} className="shrink-0 text-tinta-tenue" />
      </button>

      {mostrarPopup && (
        <div className="absolute top-full right-0 w-[300px] mt-1 z-dropdown animate-aparecer rounded border border-borde-fuerte bg-superficie-alta p-4 shadow-xl shadow-black/50">
          {/* Cabecera del popup: Selección de Año */}
          <div className="mb-3 flex items-center justify-between border-b border-borde pb-2">
            <button
              type="button"
              onClick={() => setAnioTemp(prev => Math.max(ANIO_MIN, prev - 1))}
              disabled={anioTemp <= ANIO_MIN}
              aria-label="Año anterior"
              className="rounded p-1 text-tinta-suave transition-colors duration-rapida hover:bg-superficie-sutil hover:text-tinta disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="cifra select-none text-sm font-medium text-tinta">{anioTemp}</span>

            <button
              type="button"
              onClick={() => setAnioTemp(prev => Math.min(ANIO_MAX, prev + 1))}
              disabled={anioTemp >= ANIO_MAX}
              aria-label="Año siguiente"
              className="rounded p-1 text-tinta-suave transition-colors duration-rapida hover:bg-superficie-sutil hover:text-tinta disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Grilla 3x4 de meses */}
          <div className="grid grid-cols-3 gap-1">
            {NOMBRES_MESES_ABREV.map((m, idx) => {
              const esSeleccionado = (idx + 1 === mes) && (anioTemp === anio);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => seleccionarMes(idx)}
                  className={`rounded-sm py-1.5 text-sm transition-colors duration-rapida ${
                    esSeleccionado
                      ? 'bg-acento-suave text-acento'
                      : 'text-tinta-suave hover:bg-superficie-sutil hover:text-tinta'
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>

          {/* Selección de día (opcional) para las transacciones nuevas */}
          {onChangeDia && (
            <div className="mt-3 border-t border-borde pt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-tinta-tenue">
                  Día
                </span>
                <button
                  type="button"
                  onClick={() => onChangeDia(null)}
                  className={`rounded-sm px-2 py-1 text-xs transition-colors duration-rapida ${
                    dia == null
                      ? 'bg-acento-suave text-acento'
                      : 'text-tinta-suave hover:bg-superficie-sutil hover:text-tinta'
                  }`}
                >
                  Todo el mes
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: diasEnMes }, (_, i) => i + 1).map((d) => {
                  const esSeleccionado = dia === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => onChangeDia(d)}
                      className={`cifra rounded-sm py-1 text-xs transition-colors duration-rapida ${
                        esSeleccionado
                          ? 'bg-acento-suave text-acento'
                          : 'text-tinta-suave hover:bg-superficie-sutil hover:text-tinta'
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SelectorMes;
