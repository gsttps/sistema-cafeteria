import { InputHTMLAttributes, ReactNode } from 'react';

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta?: string;
  /** Texto de ayuda o error bajo el campo. */
  nota?: ReactNode;
  /** Marca el campo como erróneo (borde rojo). */
  error?: boolean;
  contenedorClassName?: string;
}

/**
 * Input con su etiqueta. Reemplaza las ~15 repeticiones inline de
 * `<label className="block mb-2 font-semibold text-slate-400 text-sm">`.
 */
function Campo({
  etiqueta,
  nota,
  error = false,
  contenedorClassName = '',
  className = '',
  id,
  ...props
}: CampoProps) {
  const idCampo = id ?? (etiqueta ? `campo-${etiqueta.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={contenedorClassName}>
      {etiqueta && (
        <label
          htmlFor={idCampo}
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-tinta-tenue"
        >
          {etiqueta}
        </label>
      )}
      <input
        id={idCampo}
        className={`campo ${error ? '!border-deuda' : ''} ${className}`}
        {...props}
      />
      {nota && <p className="mt-1.5 text-xs text-tinta-tenue">{nota}</p>}
    </div>
  );
}

export default Campo;
