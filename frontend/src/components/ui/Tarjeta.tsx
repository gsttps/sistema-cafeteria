import { ReactNode } from 'react';

interface TarjetaProps {
  /** Encabezado con filete inferior. */
  titulo?: string;
  /** Contenido alineado a la derecha del título (acciones, selectores). */
  accion?: ReactNode;
  /** Quita el padding del cuerpo: para listas que van al borde. */
  sinPadding?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Superficie del sistema. Un solo borde hairline y nada de sombra: en una
 * interfaz densa, la elevación falsa (blur + glow) es ruido. Solo lo que
 * flota de verdad —modales y menús— lleva sombra.
 */
function Tarjeta({ titulo, accion, sinPadding = false, children, className = '' }: TarjetaProps) {
  return (
    <section
      className={`flex min-h-0 flex-col rounded-lg border border-borde bg-superficie-elevada ${className}`}
    >
      {(titulo || accion) && (
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-borde px-4 py-3">
          {titulo && (
            <h2 className="text-xs font-semibold uppercase tracking-wide text-tinta-tenue">
              {titulo}
            </h2>
          )}
          {accion}
        </header>
      )}
      <div className={`min-h-0 flex-1 ${sinPadding ? '' : 'p-4'}`}>{children}</div>
    </section>
  );
}

export default Tarjeta;
