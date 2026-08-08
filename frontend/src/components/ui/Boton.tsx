import { ButtonHTMLAttributes, ReactNode } from 'react';

type Variante = 'primario' | 'secundario' | 'sutil' | 'peligro';
type Tamano = 'sm' | 'md';

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamano?: Tamano;
  /** Deshabilita y muestra el texto de progreso en su lugar. */
  cargando?: boolean;
  textoCargando?: string;
  /** Ocupa todo el ancho disponible. */
  ancho?: boolean;
  children?: ReactNode;
}

// El latón se reserva para la acción primaria. El VERDE no es una variante de
// botón: significa "al día / pagado" y solo se usa para comunicar ese estado,
// nunca para pintar un control. El rojo aparece en "peligro" porque destruir
// datos es el equivalente accionable de la deuda.
const VARIANTES: Record<Variante, string> = {
  primario:
    'bg-acento text-acento-contraste font-semibold hover:bg-acento-tenue border border-transparent',
  secundario:
    'bg-superficie-elevada text-tinta border border-borde-fuerte hover:bg-superficie-sutil hover:border-tinta-tenue',
  sutil:
    'bg-transparent text-tinta-suave border border-transparent hover:bg-superficie-sutil hover:text-tinta',
  peligro:
    'bg-transparent text-deuda border border-deuda-borde hover:bg-deuda-suave hover:border-deuda',
};

const TAMANOS: Record<Tamano, string> = {
  sm: 'px-2.5 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
};

function Boton({
  variante = 'secundario',
  tamano = 'md',
  cargando = false,
  textoCargando,
  ancho = false,
  disabled,
  className = '',
  children,
  ...props
}: BotonProps) {
  return (
    <button
      type="button"
      disabled={disabled || cargando}
      className={`inline-flex items-center justify-center rounded whitespace-nowrap
        transition-colors duration-rapida
        disabled:opacity-40 disabled:cursor-not-allowed
        ${VARIANTES[variante]} ${TAMANOS[tamano]} ${ancho ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {cargando && textoCargando ? textoCargando : children}
    </button>
  );
}

export default Boton;
