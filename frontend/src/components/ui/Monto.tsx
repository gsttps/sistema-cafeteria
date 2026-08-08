import { formatoDinero } from '../../utils/formato';

type Tono = 'normal' | 'suave' | 'deuda' | 'pagado' | 'total';

interface MontoProps {
  valor: number;
  tono?: Tono;
  /** Tamaño del total al pie de la cuenta. */
  grande?: boolean;
  className?: string;
}

const TONOS: Record<Tono, string> = {
  normal: 'text-tinta',
  suave: 'text-tinta-suave',
  deuda: 'text-deuda',
  pagado: 'text-pagado',
  total: 'text-tinta font-semibold',
};

/**
 * Cifra de dinero. En una app cuyo objeto central es la plata, el monto merece
 * su propio componente: garantiza mono tabular (los montos alinean en columna),
 * el formato CLP y que el color signifique estado y no decoración.
 */
function Monto({ valor, tono = 'normal', grande = false, className = '' }: MontoProps) {
  return (
    <span
      className={`cifra tabular-nums ${TONOS[tono]} ${grande ? 'text-xl' : 'text-sm'} ${className}`}
    >
      {formatoDinero(valor)}
    </span>
  );
}

export default Monto;
