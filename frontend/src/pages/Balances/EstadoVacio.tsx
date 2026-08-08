interface EstadoVacioProps {
  mensaje: string;
  /** Alto mínimo; por defecto ocupa el alto disponible del card */
  altura?: string;
}

/** Caja para secciones sin datos: nunca se muestra un gráfico vacío. */
const EstadoVacio = ({ mensaje, altura = 'h-full min-h-[140px]' }: EstadoVacioProps) => (
  <div
    className={`${altura} flex items-center justify-center rounded border border-dashed border-borde-fuerte p-6 text-center`}
  >
    <p className="text-sm text-tinta-tenue">{mensaje}</p>
  </div>
);

export default EstadoVacio;
