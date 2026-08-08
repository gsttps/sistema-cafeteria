/**
 * Paleta y presets para los gráficos (recharts), validados para el fondo oscuro
 * de la app.
 *
 * Reglas que esta paleta hace cumplir:
 * - Los colores de serie se asignan en orden fijo, nunca se ciclan ni se generan.
 * - UNA serie = UN color (no un color por barra: eso duplica el encoding del largo
 *   de la barra y agota el único canal libre).
 * - Los colores de ESTADO son reservados: nunca se usan como color de serie.
 * - Las grillas son líneas sólidas finas (no punteadas: agregan ruido y se leen
 *   como "proyección" cuando solo son referencia).
 */

/** Slots categóricos en orden fijo. Máximo 8; más allá se agrupa en "Otros". */
export const SERIE = [
  '#3987e5', // 1 azul
  '#199e70', // 2 aqua
  '#c98500', // 3 amarillo
  '#008300', // 4 verde
  '#9085e9', // 5 violeta
  '#e66767', // 6 rojo
  '#d55181', // 7 magenta
  '#d95926', // 8 naranja
] as const;

/** Reservados para semántica de estado, nunca como identidad de serie. Iguales
 * a --pagado/--deuda/--acento de index.css para que el estado se vea igual
 * en un gráfico que en una insignia. */
export const ESTADO = {
  bueno: '#47CD89',
  advertencia: '#D69418',
  serio: '#E08D3C',
  critico: '#F97066',
} as const;

/** Espejo de las variables CSS de superficie (index.css) para los componentes
 * de recharts, que no pueden leer var() directamente. */
export const TINTA = {
  primaria: '#F5F0E8',
  secundaria: '#A39B8F',
  tenue: '#7D766C',
  grilla: 'rgba(245, 240, 232, 0.08)',
} as const;

export const ejeProps = {
  stroke: TINTA.tenue,
  tick: { fill: TINTA.tenue, fontSize: 12 },
  axisLine: false,
  tickLine: false,
} as const;

/** Grilla sólida hairline, solo horizontal. */
export const grillaProps = {
  stroke: TINTA.grilla,
  vertical: false,
} as const;

export const tooltipProps = {
  cursor: { fill: 'rgba(245, 240, 232, 0.05)' },
  contentStyle: {
    backgroundColor: '#262119',
    border: '1px solid #3D362D',
    borderRadius: '6px',
    color: TINTA.primaria,
    fontSize: '13px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
  },
  labelStyle: { color: TINTA.secundaria, marginBottom: 4 },
} as const;
