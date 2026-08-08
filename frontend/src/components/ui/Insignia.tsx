import { ReactNode } from 'react';

type Tono = 'neutro' | 'deuda' | 'pagado' | 'acento';

interface InsigniaProps {
  tono?: Tono;
  children: ReactNode;
  className?: string;
}

const TONOS: Record<Tono, string> = {
  neutro: 'bg-superficie-sutil text-tinta-tenue border-borde-fuerte',
  deuda: 'bg-deuda-suave text-deuda border-deuda-borde',
  pagado: 'bg-pagado-suave text-pagado border-pagado-borde',
  acento: 'bg-acento-suave text-acento border-acento-borde',
};

/** Etiqueta de estado. Texto corto, sin iconos ni emoji. */
function Insignia({ tono = 'neutro', children, className = '' }: InsigniaProps) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-1.5 py-0.5
        text-[0.6875rem] font-medium uppercase tracking-wide
        ${TONOS[tono]} ${className}`}
    >
      {children}
    </span>
  );
}

export default Insignia;
