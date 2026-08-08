import { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTeclaEscape } from '../../hooks/useTeclaEscape';

type Ancho = 'sm' | 'md' | 'lg';

interface ModalProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  /** Texto bajo el título. */
  descripcion?: string;
  ancho?: Ancho;
  /** Botones del pie, alineados a la derecha. */
  pie?: ReactNode;
  /** Anida sobre otro modal (confirmaciones). */
  anidado?: boolean;
  children: ReactNode;
}

const ANCHOS: Record<Ancho, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

/**
 * Anatomía única de modal. Antes convivían tres distintas (overlay hermano,
 * overlay contenedor, y una variante propia) con fondos y radios diferentes.
 */
function Modal({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  ancho = 'md',
  pie,
  anidado = false,
  children,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useTeclaEscape(abierto, onCerrar);

  // Mueve el foco al panel al abrir, para que Escape y el tabulado funcionen
  // sin tener que clickear primero.
  useEffect(() => {
    if (abierto) panelRef.current?.focus();
  }, [abierto]);

  if (!abierto) return null;

  return createPortal(
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 ${
        anidado ? 'z-modal-nested' : 'z-modal'
      }`}
    >
      <div
        className="absolute inset-0 bg-velo"
        onClick={onCerrar}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        className={`relative z-10 w-full ${ANCHOS[ancho]} animate-aparecer rounded-lg
          border border-borde-fuerte bg-superficie-alta shadow-2xl shadow-black/50 focus:outline-none`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-borde px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-tinta">{titulo}</h2>
            {descripcion && <p className="mt-1 text-sm text-tinta-suave">{descripcion}</p>}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="-mr-1 rounded p-1 text-tinta-tenue transition-colors duration-rapida hover:bg-superficie-sutil hover:text-tinta"
          >
            <X size={18} />
          </button>
        </header>

        <div className="px-5 py-4">{children}</div>

        {pie && (
          <footer className="flex justify-end gap-2 border-t border-borde px-5 py-3">{pie}</footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
