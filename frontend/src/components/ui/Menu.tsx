import { useState, useCallback } from 'react';
import { Check, ChevronDown, LucideIcon } from 'lucide-react';
import { useClickAfuera } from '../../hooks/useClickAfuera';

export interface OpcionMenu {
  value: string;
  label: string;
  /** Ícono opcional a la izquierda de la etiqueta (ej. criterios de orden) */
  icono?: LucideIcon;
}

interface MenuProps {
  value: string;
  onChange: (value: string) => void;
  opciones: OpcionMenu[];
  /** Ancho del disparador: `w-full`, `min-w-[220px]`, etc. */
  className?: string;
  /** Ancho del panel. Por defecto acompaña al disparador. */
  anchoPopup?: string;
}

/**
 * Desplegable de selección única. Reemplaza a los antiguos SelectorPremium y
 * MenuDesplegable, que eran el mismo componente duplicado salvo por el ícono.
 */
function Menu({ value, onChange, opciones, className = '', anchoPopup = 'w-full' }: MenuProps) {
  const [abierto, setAbierto] = useState(false);
  // useClickAfuera ya cierra con Escape además del clic fuera
  const contenedorRef = useClickAfuera<HTMLDivElement>(useCallback(() => setAbierto(false), []));

  const seleccionada = opciones.find((o) => o.value === value) || opciones[0];
  const IconoSeleccionado = seleccionada?.icono;

  return (
    <div className={`relative ${className}`} ref={contenedorRef}>
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-2 rounded border border-borde-fuerte bg-superficie-elevada px-3 py-2 text-sm text-tinta transition-colors duration-rapida hover:border-tinta-tenue"
      >
        <span className="flex min-w-0 items-center gap-2">
          {IconoSeleccionado && <IconoSeleccionado size={14} className="shrink-0 text-tinta-tenue" />}
          <span className="truncate">{seleccionada?.label}</span>
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-tinta-tenue transition-transform duration-rapida ${abierto ? 'rotate-180' : ''}`}
        />
      </button>

      {abierto && (
        <div
          role="listbox"
          className={`absolute right-0 top-full z-dropdown mt-1 ${anchoPopup} animate-aparecer rounded border border-borde-fuerte bg-superficie-alta p-1 shadow-xl shadow-black/50`}
        >
          {opciones.map((opcion) => {
            const activa = opcion.value === value;
            const Icono = opcion.icono;
            return (
              <button
                key={opcion.value}
                type="button"
                role="option"
                aria-selected={activa}
                onClick={() => { onChange(opcion.value); setAbierto(false); }}
                className={`flex w-full items-center gap-2.5 rounded-sm px-3 py-1.5 text-left text-sm transition-colors duration-rapida ${
                  activa ? 'bg-acento-suave text-acento' : 'text-tinta-suave hover:bg-superficie-sutil hover:text-tinta'
                }`}
              >
                {Icono && <Icono size={14} className={activa ? 'text-acento' : 'text-tinta-tenue'} />}
                <span className="flex-1 truncate">{opcion.label}</span>
                {activa && <Check size={14} className="shrink-0 text-acento" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Menu;
