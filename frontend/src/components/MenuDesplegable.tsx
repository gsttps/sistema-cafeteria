import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, LucideIcon } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  color?: string;
}

interface MenuDesplegableProps {
  value: string;
  onChange: (val: string) => void;
  options: DropdownOption[];
  minWidth?: string;
}

export default function MenuDesplegable({ value, onChange, options, minWidth = '320px' }: MenuDesplegableProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value) || options[0];
  const SelectedIcon = selectedOption?.icon;

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-5 py-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 text-blue-400 font-bold text-sm shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:bg-blue-500/20 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] select-none transition-all duration-300 cursor-pointer"
        style={{ minWidth }}
      >
        <div className="flex items-center gap-2">
          {SelectedIcon && <SelectedIcon size={16} style={{ color: selectedOption.color || '#3b82f6' }} />}
          <span>{selectedOption.label}</span>
        </div>
        <ChevronDown size={16} className={`text-blue-300 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full right-0 mt-3 w-full bg-[#0b1120]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-[0_0_50px_rgba(0,0,0,0.7)] z-50 anim-fade-in flex flex-col gap-2">
          {options.map((opc) => {
            const isActivo = value === opc.value;
            const Icono = opc.icon;
            return (
              <div
                key={opc.value}
                onClick={() => { onChange(opc.value); setIsOpen(false); }}
                className={`flex items-center gap-3 py-2 px-4 rounded-xl cursor-pointer text-sm font-bold transition-all duration-300 border ${
                  isActivo 
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)] scale-[1.02] ml-2 mr-2' 
                    : 'bg-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200 border-transparent hover:border-white/10 hover:scale-[1.02] ml-1 mr-1'
                }`}
              >
                {Icono && <Icono size={16} style={{ color: opc.color || '#64748b' }} />}
                <span className={`flex-1 ${isActivo ? 'font-bold' : 'font-medium'}`}>{opc.label}</span>
                {isActivo && <Check size={16} className="text-blue-500" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
