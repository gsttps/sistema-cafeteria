export interface Usuario {
  id: string;
  username: string;
  rol: 'admin' | 'staff';
}

export interface Categoria {
  id: string;
  nombre: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono?: string;
  estado: 'activo' | 'inactivo';
  deuda: number;
  estado_pago: 'pagado' | 'deuda';
}

export interface Producto {
  id: string;
  nombre: string;
  precio_actual: number;
  stock_actual: number;
  categoria_id?: string | null;
  categoria?: Categoria | null;
  estado: 'activo' | 'archivado';
}

export interface ImpactoCuentas {
  clientes: number;
  transacciones: number;
  unidades: number;
}

export interface ProductoImpacto {
  producto_id: string;
  nombre: string;
  estado: 'activo' | 'archivado';
  cuentas_abiertas: ImpactoCuentas;
  cuentas_pagadas: ImpactoCuentas;
  perdidas: number;
  tiene_uso: boolean;
}

export interface PerdidaInventario {
  id: string;
  producto_id: string;
  producto_nombre?: string;
  cantidad: number;
  motivo?: string | null;
  costo_historico: number;
  fecha_hora: string;
}

export interface CuentaMensual {
  // Nulo mientras el cliente no tenga consumos ese mes: el backend devuelve una
  // cuenta virtual y la crea recién al agregar el primer producto.
  id: string | null;
  cliente_id: string;
  mes: number;
  anio: number;
  porcentaje_descuento: number;
  estado: 'abierta' | 'pagada';
  transacciones?: Transaccion[];
  transacciones_pagadas?: Transaccion[];
  total_original?: number;
  total_con_descuento?: number;
  total_ya_pagado?: number;
}

export interface Transaccion {
  id: string;
  cuenta_mensual_id: string;
  producto_id: string;
  cantidad: number;
  precio_historico: number;
  fecha_hora: string;
  producto_nombre?: string;
  /** Línea sintética de traspaso de deuda: se muestra como saldo, no como consumo */
  es_arrastre?: boolean;
}

// --- BALANCES ---
// Nota: las métricas de caja (cobrado / por_cobrar) incluyen los movimientos de
// arrastre de deuda; las comerciales (ventas, productos, días, ticket) no.

export interface MetricaKPI {
  actual: number;
  anterior: number;
  /** null cuando el mes anterior fue 0 (no existe variación calculable) */
  variacion_pct: number | null;
}

export interface ResumenBalance {
  cobrado: MetricaKPI;
  por_cobrar: MetricaKPI;
  ventas: MetricaKPI;
  ticket_promedio: MetricaKPI;
  unidades_vendidas: MetricaKPI;
  descuentos: MetricaKPI;
  /** Valorizadas a precio de venta: el sistema no registra costo de compra */
  valor_mermas: MetricaKPI;
  clientes_activos: MetricaKPI;
  cuentas_abiertas: number;
  cuentas_pagadas: number;
  clientes_con_deuda: number;
  deuda_arrastrada: number;
  deuda_traspasada: number;
  tasa_cobro_pct: number | null;
}

export interface ProductoTop {
  nombre: string;
  categoria: string | null;
  cantidad_vendida: number;
  monto_vendido: number;
}

export interface ClienteTop {
  nombre: string;
  total_gastado: number;
  unidades: number;
}

export interface DeudorFila {
  cliente_id: string;
  nombre: string;
  telefono: string | null;
  deuda_mes: number;
  deuda_total: number;
  cuentas_abiertas: number;
}

export interface CategoriaVenta {
  nombre: string;
  monto: number;
  unidades: number;
}

export interface VentaDia {
  dia: number;
  monto: number;
}

export interface MermaAgrupada {
  etiqueta: string;
  unidades: number;
  valor: number;
}

export interface ProductoStockBajo {
  nombre: string;
  categoria: string | null;
  stock_actual: number;
  precio_actual: number;
}

export interface BalancesMes {
  mes: number;
  anio: number;
  resumen: ResumenBalance;
  productos_top: ProductoTop[];
  clientes_top: ClienteTop[];
  deudores: DeudorFila[];
  ventas_por_categoria: CategoriaVenta[];
  ventas_por_dia: VentaDia[];
  /** Consumo cuya fecha cae fuera del mes de su cuenta (se reporta aparte) */
  consumo_fuera_de_rango: number;
  mermas_por_motivo: MermaAgrupada[];
  mermas_por_producto: MermaAgrupada[];
  stock_bajo: ProductoStockBajo[];
}

export interface PuntoEvolucion {
  mes: number;
  anio: number;
  etiqueta: string;
  ventas: number;
  cobrado: number;
  por_cobrar: number;
  mermas: number;
}

export interface EvolucionBalances {
  puntos: PuntoEvolucion[];
}
