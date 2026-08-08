import axios from 'axios';
import { toast } from 'sonner';
import {
  Cliente, Producto, CuentaMensual, Transaccion, Categoria, PerdidaInventario, ProductoImpacto,
  BalancesMes, EvolucionBalances,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // requerido para autenticación con cookies HttpOnly
});

// Callback para cuando la sesión expira (401). Lo registra App.tsx.
let _onSesionExpirada: (() => void) | null = null;
export const configurarCallbackSesionExpirada = (cb: () => void) => {
  _onSesionExpirada = cb;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url: string = error.config?.url ?? '';

    if (status === 401 && !url.includes('/auth/login')) {
      // Sesión expirada o no autenticado — volver al login
      _onSesionExpirada?.();
    } else if (status != null && status >= 500) {
      toast.error('Error en el servidor. Por favor intenta de nuevo.');
    }

    return Promise.reject(error);
  }
);


export const servicioCliente = {
  // limit explícito: el backend corta en 100 por defecto y el frontend no
  // pagina, así que sin esto los clientes por encima de 100 desaparecían de la
  // lista sin ningún aviso. 500 es el máximo que acepta la API.
  obtenerTodos: (buscar?: string) => api.get<Cliente[]>('/clientes/', { params: { buscar, limit: 500 } }),
  crear: (datos: { nombre: string; telefono?: string; estado?: string }) => api.post<Cliente>('/clientes/', datos),
  actualizar: (id: string, datos: Partial<Cliente>) => api.put<Cliente>(`/clientes/${id}`, datos),
  eliminar: (id: string) => api.delete(`/clientes/${id}`),
};

export const servicioCategoria = {
  obtenerTodos: () => api.get<Categoria[]>('/categorias/'),
  crear: (datos: { nombre: string }) => api.post<Categoria>('/categorias/', datos),
  actualizar: (id: string, datos: { nombre: string }) => api.put<Categoria>(`/categorias/${id}`, datos),
  eliminar: (id: string) => api.delete(`/categorias/${id}`),
};

export const servicioProducto = {
  // Ver nota en servicioCliente.obtenerTodos: el corte por defecto es 100.
  obtenerTodos: (buscar?: string) => api.get<Producto[]>('/productos/', { params: { buscar, limit: 500 } }),
  crear: (datos: Omit<Producto, 'id' | 'estado'>) => api.post<Producto>('/productos/', datos),
  actualizar: (id: string, datos: Partial<Omit<Producto, 'id' | 'estado'>> & { actualizar_precios_abiertos?: boolean }) =>
    api.put<Producto>(`/productos/${id}`, datos),
  eliminar: (id: string) => api.delete<{ resultado: 'archivado' | 'eliminado' }>(`/productos/${id}`),
  obtenerImpacto: (id: string) => api.get<ProductoImpacto>(`/productos/${id}/impacto`),
};

export const servicioPerdida = {
  obtenerTodas: (productoId?: string) =>
    api.get<PerdidaInventario[]>('/perdidas/', { params: { producto_id: productoId } }),
  crear: (datos: { producto_id: string; cantidad: number; motivo?: string }) =>
    api.post<PerdidaInventario>('/perdidas/', datos),
  eliminar: (id: string) => api.delete(`/perdidas/${id}`),
};

export const servicioCuenta = {
  obtenerPorCliente: (clienteId: string, mes?: number, anio?: number) =>
    api.get<CuentaMensual>(`/cuentas/cliente/${clienteId}`, { params: { mes, anio } }),
  agregarTransaccion: (clienteId: string, datos: { producto_id: string; cantidad: number; mes?: number; anio?: number; dia?: number }) =>
    api.post<Transaccion>(`/cuentas/cliente/${clienteId}/agregar_item`, datos),
  actualizarDescuento: (cuentaId: string, porcentaje: number) =>
    api.put<CuentaMensual>(`/cuentas/${cuentaId}/descuento`, null, { params: { porcentaje_descuento: porcentaje } }),
  cerrar: (cuentaId: string, monto_pagado?: number, porcentaje_descuento?: number) =>
    api.put<CuentaMensual>(`/cuentas/${cuentaId}/cerrar`, { monto_pagado, porcentaje_descuento }),
  eliminarTransaccion: (transaccionId: string) => api.delete(`/cuentas/transaccion/${transaccionId}`),
  pedidoPersonalizado: (clienteId: string, datos: { nombre: string; precio: number; cantidad: number; mes?: number; anio?: number; dia?: number }) =>
    api.post<Transaccion>(`/cuentas/cliente/${clienteId}/pedido_personalizado`, datos),
};

export const servicioAuth = {
  login: (username: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    return api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
  logout: async () => {
    return api.post('/auth/logout');
  },
  verificar: () => api.get('/auth/me'),
  cambiarUsername: (passwordActual: string, usernameNuevo: string) =>
    api.put('/auth/cambiar-username', { password_actual: passwordActual, username_nuevo: usernameNuevo }),
  cambiarPassword: (passwordActual: string, passwordNueva: string) =>
    api.put('/auth/cambiar-password', { password_actual: passwordActual, password_nueva: passwordNueva }),
  subirLogo: (archivo: File) => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return api.post('/auth/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  obtenerLogoUrl: () => `${API_URL}/auth/logo`,
  eliminarLogo: () => api.delete('/auth/logo'),
};

export const servicioBalances = {
  obtenerBalancesMes: (mes: number, anio: number, signal?: AbortSignal) =>
    api.get<BalancesMes>('/balances/', { params: { mes, anio }, signal }),
  obtenerEvolucion: (mes: number, anio: number, meses = 6, signal?: AbortSignal) =>
    api.get<EvolucionBalances>('/balances/evolucion', { params: { mes, anio, meses }, signal }),
  exportarExcel: (mes: number, anio: number) =>
    api.get<Blob>('/balances/exportar', { params: { mes, anio }, responseType: 'blob' }),
};

export default api;
