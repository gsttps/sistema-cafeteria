/**
 * Formatea un número como moneda chilena (CLP).
 * Se usa en múltiples componentes: PanelAtencion, Libreta, Balances, Inventario.
 */
export const formatoDinero = (val: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(val);
};

/**
 * Versión compacta para ejes de gráficos, donde no cabe el monto completo.
 * Ej: 1250000 -> "$1,3M", 340000 -> "$340k".
 */
export const formatoDineroCompacto = (val: number): string => {
  const abs = Math.abs(val);
  if (abs >= 1_000_000) return `$${(val / 1_000_000).toLocaleString('es-CL', { maximumFractionDigits: 1 })}M`;
  if (abs >= 1_000) return `$${Math.round(val / 1_000).toLocaleString('es-CL')}k`;
  return `$${Math.round(val).toLocaleString('es-CL')}`;
};

/**
 * Formatea un porcentaje con un decimal. Devuelve "—" si no hay dato
 * (por ejemplo, cuando no existe mes anterior con el cual comparar).
 */
export const formatoPorcentaje = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return '—';
  return `${val > 0 ? '+' : ''}${val.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%`;
};

/**
 * Día del mes de una fecha ISO, con cero a la izquierda.
 * Es la columna "Día" de la libreta: dentro de una cuenta mensual el mes ya
 * está dado por la cuenta, así que lo único que aporta la fecha es el día.
 */
export const formatearDia = (str: string): string => {
  try {
    const d = new Date(str);
    if (Number.isNaN(d.getTime())) return '--';
    return String(d.getDate()).padStart(2, '0');
  } catch {
    return '--';
  }
};

/**
 * Formatea un string ISO de fecha/hora a formato corto "dd/mm hh:mm".
 */
export const formatearFechaHora = (str: string): string => {
  try {
    const d = new Date(str);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const horas = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes} ${horas}:${mins}`;
  } catch {
    return '';
  }
};
