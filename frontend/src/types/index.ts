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
}

export interface CuentaMensual {
  id: string;
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
}
