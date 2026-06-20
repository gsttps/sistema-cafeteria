/**
 * Formatea un número como moneda chilena (CLP).
 * Se usa en múltiples componentes: PanelAtencion, ResumenPestanas, Balances, Inventario.
 */
export const formatoDinero = (val: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(val);
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
