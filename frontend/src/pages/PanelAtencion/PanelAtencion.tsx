import { useState, useEffect } from 'react';
import { Cliente, CuentaMensual, Producto } from '../../types';
import { servicioCliente, servicioProducto, servicioCuenta } from '../../services/api';
import ResumenPestanas from '../../components/ResumenPestanas';
import SelectorMes from '../../components/SelectorMes';
import { Plus, Phone, ArrowLeft, Trash2, ArrowDownAZ, Coins, AlertCircle, Edit, UtensilsCrossed } from 'lucide-react';
import MenuDesplegable from '../../components/MenuDesplegable';
import SelectorPremium from '../../components/SelectorPremium';
import { formatoDinero, formatearFechaHora } from '../../utils/formato';

function PanelAtencion() {
  // Navigation State
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);

  // View 1 (No customer selected) States
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false);
  const [nombreNuevoCliente, setNombreNuevoCliente] = useState('');
  const [telefonoNuevoCliente, setTelefonoNuevoCliente] = useState('');
  const [cargandoClientes, setCargandoClientes] = useState(false);
  const [criterioOrden, setCriterioOrden] = useState<'nombre' | 'deuda' | 'estado'>('nombre');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos');

  const clientesFiltrados = clientes.filter(c => {
    if (filtroEstado === 'activos') return c.estado === 'activo';
    if (filtroEstado === 'inactivos') return c.estado === 'inactivo';
    return true;
  });

  const clientesOrdenados = [...clientesFiltrados].sort((a, b) => {
    if (criterioOrden === 'deuda') {
      return Number(b.deuda) - Number(a.deuda);
    }
    if (criterioOrden === 'estado') {
      if (a.estado_pago === 'deuda' && b.estado_pago === 'pagado') return -1;
      if (a.estado_pago === 'pagado' && b.estado_pago === 'deuda') return 1;
      return Number(b.deuda) - Number(a.deuda);
    }
    return a.nombre.localeCompare(b.nombre, 'es');
  });

  // View 2 (Customer selected) States
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<CuentaMensual | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [cargandoCuenta, setCargandoCuenta] = useState(false);
  const [transaccionAEliminar, setTransaccionAEliminar] = useState<string | null>(null);

  // Estados para el modal de pedido personalizado
  const [mostrarModalPedido, setMostrarModalPedido] = useState(false);
  const [nombrePedido, setNombrePedido] = useState('');
  const [precioPedido, setPrecioPedido] = useState('');
  const [cantidadPedido, setCantidadPedido] = useState(1);
  const [enviandoPedido, setEnviandoPedido] = useState(false);

  // --- GENERAL ACTIONS ---
  
  // Cargar lista de clientes
  const cargarClientes = async () => {
    setCargandoClientes(true);
    try {
      const resp = await servicioCliente.obtenerTodos(busquedaCliente || undefined);
      const listaClientes = resp.data;
      setClientes(listaClientes);

      // Cargar balances del mes actual para cada cliente en paralelo
      listaClientes.forEach(async (c: Cliente) => {
        try {
          const respCuenta = await servicioCuenta.obtenerPorCliente(c.id);
          setBalances(prev => ({
            ...prev,
            [c.id]: Number(respCuenta.data.total_con_descuento || 0)
          }));
        } catch (err) {
          console.error(`Error cargando balance para cliente ${c.id}:`, err);
        }
      });

    } catch (err) {
      console.error('Error al cargar clientes:', err);
    } finally {
      setCargandoClientes(false);
    }
  };

  // Cargar lista de productos
  const cargarProductos = async () => {
    try {
      const resp = await servicioProducto.obtenerTodos(busquedaProducto || undefined);
      setProductos(resp.data);
    } catch (err) {
      console.error('Error al cargar productos:', err);
    }
  };

  useEffect(() => {
    if (!clienteSeleccionado) {
      cargarClientes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busquedaCliente, clienteSeleccionado]);

  useEffect(() => {
    if (clienteSeleccionado) {
      cargarProductos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busquedaProducto, clienteSeleccionado]);

  // Al seleccionar un cliente, cargar su cuenta actual
  const seleccionarCliente = async (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setCargandoCuenta(true);
    try {
      const respCuenta = await servicioCuenta.obtenerPorCliente(cliente.id);
      setCuentaSeleccionada(respCuenta.data);
    } catch (err) {
      console.error('Error al obtener cuenta del cliente:', err);
    } finally {
      setCargandoCuenta(false);
    }
  };

  // Refrescar cuenta seleccionada
  const refrescarDatosCuenta = async () => {
    if (!clienteSeleccionado || !cuentaSeleccionada) return;
    try {
      const respCuenta = await servicioCuenta.obtenerPorCliente(
        clienteSeleccionado.id,
        cuentaSeleccionada.mes,
        cuentaSeleccionada.anio
      );
      setCuentaSeleccionada(respCuenta.data);
    } catch (err) {
      console.error('Error al refrescar cuenta:', err);
    }
  };

  // Agregar consumo a la cuenta
  const agregarConsumo = async (productoId: string) => {
    if (!clienteSeleccionado || !cuentaSeleccionada) return;
    if (cuentaSeleccionada.estado === 'pagada') {
      alert('No se pueden agregar productos a una cuenta ya pagada.');
      return;
    }

    try {
      await servicioCuenta.agregarTransaccion(clienteSeleccionado.id, {
        producto_id: productoId,
        cantidad: 1
      });
      await refrescarDatosCuenta();
    } catch (err) {
      console.error('Error al registrar consumo:', err);
      alert('Error al agregar el producto.');
    }
  };

  // Preparar eliminación de consumo (abre modal de confirmación)
  const eliminarConsumo = (transaccionId: string) => {
    if (!cuentaSeleccionada || cuentaSeleccionada.estado === 'pagada') return;
    setTransaccionAEliminar(transaccionId);
  };

  // Ejecutar eliminación real del consumo
  const confirmarEliminarConsumo = async () => {
    if (!transaccionAEliminar) return;
    try {
      await servicioCuenta.eliminarTransaccion(transaccionAEliminar);
      setTransaccionAEliminar(null);
      await refrescarDatosCuenta();
    } catch (err) {
      console.error('Error al eliminar consumo:', err);
      alert('No se pudo eliminar el producto.');
    }
  };



  // Enviar pedido personalizado
  const enviarPedidoPersonalizado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteSeleccionado || !cuentaSeleccionada) return;
    if (cuentaSeleccionada.estado === 'pagada') {
      alert('No se pueden agregar pedidos a una cuenta ya pagada.');
      return;
    }
    const precio = parseFloat(precioPedido);
    if (!nombrePedido.trim() || isNaN(precio) || precio <= 0 || cantidadPedido < 1) return;

    setEnviandoPedido(true);
    try {
      await servicioCuenta.pedidoPersonalizado(clienteSeleccionado.id, {
        nombre: nombrePedido.trim(),
        precio,
        cantidad: cantidadPedido,
      });
      setMostrarModalPedido(false);
      setNombrePedido('');
      setPrecioPedido('');
      setCantidadPedido(1);
      await refrescarDatosCuenta();
    } catch (err) {
      console.error('Error al enviar pedido personalizado:', err);
      alert('No se pudo registrar el pedido personalizado.');
    } finally {
      setEnviandoPedido(false);
    }
  };

  // Crear cliente rápido
  const guardarNuevoCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNuevoCliente.trim()) return;

    try {
      const resp = await servicioCliente.crear({
        nombre: nombreNuevoCliente,
        telefono: telefonoNuevoCliente || undefined,
        estado: 'activo'
      });
      setMostrarModalCliente(false);
      setNombreNuevoCliente('');
      setTelefonoNuevoCliente('');
      seleccionarCliente(resp.data);
    } catch (err) {
      console.error('Error al crear cliente:', err);
      alert('No se pudo crear el cliente.');
    }
  };

  // Estados para modificar/eliminar cliente seleccionado
  const [mostrarModalEditCliente, setMostrarModalEditCliente] = useState(false);
  const [nombreEditCliente, setNombreEditCliente] = useState('');
  const [telefonoEditCliente, setTelefonoEditCliente] = useState('');
  const [estadoEditCliente, setEstadoEditCliente] = useState<'activo' | 'inactivo'>('activo');
  const [mostrarConfirmarEliminarCliente, setMostrarConfirmarEliminarCliente] = useState(false);

  const abrirModalEditarCliente = (c: Cliente) => {
    setNombreEditCliente(c.nombre);
    setTelefonoEditCliente(c.telefono || '');
    setEstadoEditCliente(c.estado);
    setMostrarModalEditCliente(true);
  };

  const guardarCambiosCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteSeleccionado || !nombreEditCliente.trim()) return;
    try {
      const resp = await servicioCliente.actualizar(clienteSeleccionado.id, {
        nombre: nombreEditCliente,
        telefono: telefonoEditCliente,
        estado: estadoEditCliente
      });
      setClienteSeleccionado(resp.data);
      setMostrarModalEditCliente(false);
    } catch (err) {
      console.error('Error al actualizar cliente:', err);
      alert('Error al guardar los cambios del cliente.');
    }
  };

  const eliminarClienteActual = async () => {
    if (!clienteSeleccionado) return;
    try {
      await servicioCliente.eliminar(clienteSeleccionado.id);
      setMostrarConfirmarEliminarCliente(false);
      setMostrarModalEditCliente(false);
      setClienteSeleccionado(null);
    } catch (err) {
      console.error('Error al eliminar cliente:', err);
      alert('No se pudo eliminar el cliente.');
    }
  };



  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      
      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE PRODUCTO (MESSAGE BOX) */}
      {transaccionAEliminar && (
        <div className="fixed inset-0 bg-slate-900/80 flex justify-center items-center z-[9999] backdrop-blur-sm">
          <div className="bg-slate-800 p-6 sm:p-10 rounded-2xl w-11/12 max-w-md shadow-2xl border border-slate-700 text-center anim-slide-in">
            <h3 className="mt-0 mb-4 text-slate-100 text-xl sm:text-2xl font-bold tracking-tight">
              Confirmar Quitar Producto
            </h3>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-6 sm:mb-8">
              ¿Estás seguro de que deseas quitar este producto de la lista del cliente? Esta acción no se puede deshacer.
            </p>
            
            <div className="flex gap-3 sm:gap-4 justify-center">
              <button
                type="button"
                onClick={() => setTransaccionAEliminar(null)}
                className="px-4 sm:px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 border-none rounded-xl cursor-pointer font-semibold text-sm min-w-[100px] sm:min-w-[120px] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminarConsumo}
                className="px-4 sm:px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white border-none rounded-xl cursor-pointer font-semibold text-sm min-w-[100px] sm:min-w-[120px] shadow-lg shadow-rose-500/20 transition-colors"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 1: Lista general de clientes (Sin cliente seleccionado) */}
      {!clienteSeleccionado && (
        <div className="anim-fade-in flex-1 flex flex-col">
          <h1 className="text-slate-100 text-2xl sm:text-3xl font-extrabold mb-4 sm:mb-8 tracking-tight">
            Atención a Clientes
          </h1>

          <div className="flex-1 flex flex-col gap-4 sm:gap-6">
            {/* Controles: búsqueda, filtros y botón */}
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
              <input
                type="text"
                placeholder="Buscar cliente por nombre..."
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
                className="input-premium flex-1 min-w-0"
              />
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-400 whitespace-nowrap">Filtro:</label>
                  <SelectorPremium
                    value={filtroEstado}
                    onChange={(val) => setFiltroEstado(val as any)}
                    opciones={[
                      { value: 'todos', label: 'Todos' },
                      { value: 'activos', label: 'Activos' },
                      { value: 'inactivos', label: 'Inactivos' }
                    ]}
                    className="min-w-[120px]"
                    anchoPopup="w-[140px]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-400 whitespace-nowrap hidden sm:inline">Ordenar por:</label>
                  <MenuDesplegable
                    value={criterioOrden}
                    onChange={(val: string) => setCriterioOrden(val as any)}
                    minWidth="320px"
                    options={[
                      { value: 'nombre', label: 'Nombre (A-Z)', icon: ArrowDownAZ, color: '#60a5fa' },
                      { value: 'deuda', label: 'Monto de Deuda (Mayor a Menor)', icon: Coins, color: '#facc15' },
                      { value: 'estado', label: 'Estado de Pago (Con Deuda Primero)', icon: AlertCircle, color: '#fb7185' }
                    ]}
                  />
                </div>
              </div>

              <button
                onClick={() => setMostrarModalCliente(true)}
                className="px-4 sm:px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-500/20 whitespace-nowrap"
              >
                <Plus size={18} /> Agregar cliente
              </button>
            </div>

            {/* Lista de clientes */}
            <div className="flex-1 bg-[#0b1120]/60 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden shadow-2xl shadow-black/40 flex flex-col min-h-0 anim-slide-in">
              {/* Header de tabla - solo desktop */}
              <div className="hidden sm:flex px-6 py-4 border-b border-slate-700/50 font-semibold text-slate-400 text-sm items-center bg-slate-900/30">
                <span className="w-1/3">Nombre de cliente</span>
                <span className="w-1/5 text-center">Estado de Cuenta</span>
                <span className="w-1/4 text-center">Estado de Pago</span>
                <span className="flex-1 text-right">Total de cada cliente</span>
              </div>

              <div className="flex-1 overflow-y-auto">
                {cargandoClientes ? (
                  <div className="p-8 sm:p-12 text-center text-slate-400 animate-pulse">Cargando lista de clientes...</div>
                ) : clientesOrdenados.length === 0 ? (
                  <div className="p-8 sm:p-12 text-center text-slate-500 italic">No se encontraron clientes.</div>
                ) : (
                  <div className="divide-y divide-slate-700/50">
                    {clientesOrdenados.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => seleccionarCliente(c)}
                        className={`cursor-pointer transition-colors ${
                          c.estado === 'activo' 
                            ? 'hover:bg-slate-700/50 bg-transparent opacity-100' 
                            : 'bg-slate-900/30 hover:bg-slate-900/50 opacity-60'
                        }`}
                      >
                        {/* Desktop row */}
                        <div className="hidden sm:flex items-center px-6 py-5">
                          <div className="w-1/3">
                            <div className="font-semibold text-slate-200 text-base">{c.nombre}</div>
                            {c.telefono && (
                              <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                                <Phone size={12} /> {c.telefono}
                              </div>
                            )}
                          </div>

                          <div className="w-1/5 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block border ${
                              c.estado === 'activo' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                            }`}>
                              {c.estado === 'activo' ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                          
                          <div className="w-1/4 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block border ${
                              c.estado_pago === 'pagado' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}>
                              {c.estado_pago === 'pagado' ? 'Pagado' : 'Deuda'}
                            </span>
                          </div>

                          <div className={`flex-1 text-right font-bold text-lg ${
                            (balances[c.id] || 0) > 0 ? 'text-rose-400' : 'text-slate-400'
                          }`}>
                            {formatoDinero(balances[c.id] || 0)}
                          </div>
                        </div>

                        {/* Mobile card */}
                        <div className="sm:hidden px-4 py-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-semibold text-slate-200 text-base">{c.nombre}</div>
                              {c.telefono && (
                                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                  <Phone size={11} /> {c.telefono}
                                </div>
                              )}
                            </div>
                            <div className={`font-bold text-lg ${
                              (balances[c.id] || 0) > 0 ? 'text-rose-400' : 'text-slate-400'
                            }`}>
                              {formatoDinero(balances[c.id] || 0)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[0.65rem] font-bold border ${
                              c.estado === 'activo' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                            }`}>
                              {c.estado === 'activo' ? 'Activo' : 'Inactivo'}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[0.65rem] font-bold border ${
                              c.estado_pago === 'pagado' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}>
                              {c.estado_pago === 'pagado' ? 'Pagado' : 'Deuda'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: Detalle de cliente seleccionado (Layout de 3 columnas) */}
      {clienteSeleccionado && (
        <div className="anim-slide-in h-full flex flex-col">
          <div className="mb-4 sm:mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <button
                onClick={() => setClienteSeleccionado(null)}
                className="p-2 sm:p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors flex items-center justify-center focus:outline-none shrink-0"
              >
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-slate-100 text-lg sm:text-2xl font-extrabold m-0 flex items-center gap-2 sm:gap-3 truncate">
                <span className="truncate">{clienteSeleccionado.nombre}</span>
                <button
                  onClick={() => abrirModalEditarCliente(clienteSeleccionado)}
                  className="p-1.5 sm:p-2 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-xl transition-colors flex items-center justify-center shrink-0"
                  title="Modificar Cliente"
                >
                  <Edit size={16} />
                </button>
              </h2>
            </div>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 items-start">
            
            {/* Columna 1 (Izquierda): Selector de mes y consumos */}
            <div className="w-full lg:w-[32%] flex flex-col bg-[#0b1120]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4 sm:p-6 shadow-2xl shadow-black/40 max-h-[50vh] lg:max-h-[calc(100vh-160px)]">
              <label className="block mb-2 font-semibold text-slate-400 text-sm">
                Seleccionar mes
              </label>
              <SelectorMes
                mes={cuentaSeleccionada?.mes || new Date().getMonth() + 1}
                anio={cuentaSeleccionada?.anio || new Date().getFullYear()}
                onChange={async (mes: number, anio: number) => {
                  setCargandoCuenta(true);
                  try {
                    const resp = await servicioCuenta.obtenerPorCliente(clienteSeleccionado.id, mes, anio);
                    setCuentaSeleccionada(resp.data);
                  } catch (err) {
                    console.error('Error al cambiar de período:', err);
                  } finally {
                    setCargandoCuenta(false);
                  }
                }}
              />
              <div className="my-2 sm:my-3"></div>

              <h4 className="m-0 mb-3 sm:mb-4 text-slate-100 text-base sm:text-lg font-bold">
                Consumos del mes
              </h4>

              <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                {cargandoCuenta ? (
                  <p className="text-slate-500">Cargando consumos...</p>
                ) : (!cuentaSeleccionada?.transacciones?.length && !cuentaSeleccionada?.transacciones_pagadas?.length) ? (
                  <p className="italic text-slate-500 text-sm">No hay consumos registrados para este período.</p>
                ) : (
                  <div className="flex flex-col gap-2 sm:gap-3">
                    {/* Renderizar transacciones pagadas primero */}
                    {cuentaSeleccionada.transacciones_pagadas?.map((t: any) => (
                      <div
                        key={t.id}
                        className="p-2.5 sm:p-3 border border-slate-700/50 rounded-xl bg-slate-900/40 flex justify-between items-center opacity-70"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-slate-400 text-xs sm:text-sm line-through truncate">{t.producto_nombre || 'Producto'}</span>
                            <span className="text-[0.6rem] sm:text-[0.65rem] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold tracking-wider shrink-0">PAGADO</span>
                          </div>
                          <div className="text-[0.65rem] sm:text-xs text-slate-500">
                            {t.cantidad} x {formatoDinero(Number(t.precio_historico))}
                            <span className="ml-1 sm:ml-2 text-[0.6rem] sm:text-[0.65rem]">{formatearFechaHora(t.fecha_hora)}</span>
                          </div>
                        </div>
                        <div className="font-semibold text-slate-500 text-xs sm:text-sm shrink-0 ml-2">
                          {formatoDinero(t.cantidad * Number(t.precio_historico))}
                        </div>
                      </div>
                    ))}

                    {/* Renderizar transacciones activas: "Deuda anterior" siempre primero con estilo especial */}
                    {(() => {
                      const deudaAnterior = cuentaSeleccionada.transacciones?.filter((t: any) => t.producto_nombre === 'Deuda anterior') || [];
                      const otrasTransacciones = cuentaSeleccionada.transacciones?.filter((t: any) => t.producto_nombre !== 'Deuda anterior') || [];
                      const ordenadas = [...deudaAnterior, ...otrasTransacciones];
                      return ordenadas.map((t: any) => {
                        const esDeudaAnterior = t.producto_nombre === 'Deuda anterior';
                        return (
                          <div
                            key={t.id}
                            className={`p-2.5 sm:p-3 rounded-xl flex justify-between items-center group ${
                              esDeudaAnterior
                                ? 'border border-amber-500/40 bg-amber-500/5 shadow-sm shadow-amber-500/10'
                                : 'border border-slate-600 bg-slate-700/30'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                {esDeudaAnterior && (
                                  <span className="text-[0.6rem] sm:text-[0.65rem] bg-amber-500/20 text-amber-400 border border-amber-500/40 px-1.5 py-0.5 rounded font-bold tracking-wider shrink-0">MONTO ACUMULADO</span>
                                )}
                                <span className={`font-semibold text-xs sm:text-sm truncate ${
                                  esDeudaAnterior ? 'text-amber-300' : 'text-slate-200'
                                }`}>
                                  {esDeudaAnterior ? 'Saldo pendiente mes anterior' : (t.producto_nombre || 'Producto')}
                                </span>
                              </div>
                              <div className="text-[0.65rem] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">
                                {t.cantidad} x {formatoDinero(Number(t.precio_historico))}
                                <span className="ml-1 sm:ml-2 text-[0.6rem] sm:text-[0.65rem] text-slate-500">{formatearFechaHora(t.fecha_hora)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
                              <span className={`font-bold text-xs sm:text-sm ${
                                esDeudaAnterior ? 'text-amber-400' : 'text-slate-200'
                              }`}>
                                {formatoDinero(t.cantidad * Number(t.precio_historico))}
                              </span>
                              {cuentaSeleccionada.estado === 'abierta' && !esDeudaAnterior && (
                                <button
                                  type="button"
                                  onClick={() => eliminarConsumo(t.id)}
                                  className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 p-1.5 rounded-lg transition-colors focus:outline-none sm:opacity-0 sm:group-hover:opacity-100"
                                  title="Quitar de la lista"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Columna 2 (Centro): Buscador y lista de productos para agregar */}
            <div className="w-full lg:flex-1 flex flex-col bg-[#0b1120]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4 sm:p-6 shadow-2xl shadow-black/40 max-h-[50vh] lg:max-h-[calc(100vh-160px)]">
              {/* Botón Pedido Personalizado */}
              <button
                type="button"
                onClick={() => {
                  if (cuentaSeleccionada?.estado === 'pagada') {
                    alert('No se pueden agregar pedidos a una cuenta ya pagada.');
                    return;
                  }
                  setMostrarModalPedido(true);
                }}
                className={`w-full mb-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition-all ${
                  cuentaSeleccionada?.estado === 'pagada'
                    ? 'bg-slate-800/50 text-slate-500 border-slate-700/50 cursor-not-allowed'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30 hover:border-amber-500/60 cursor-pointer shadow-lg shadow-amber-500/5'
                }`}
              >
                <UtensilsCrossed size={18} />
                Pedido personalizado
              </button>

              <h4 className="m-0 mb-3 sm:mb-4 text-slate-100 text-base sm:text-lg font-bold">
                Agregar producto
              </h4>
              <input
                type="text"
                placeholder="Buscar productos..."
                value={busquedaProducto}
                onChange={(e) => setBusquedaProducto(e.target.value)}
                className="input-premium mb-4 sm:mb-6"
              />

              <div className="flex-1 overflow-y-auto border border-slate-700 rounded-xl bg-slate-900/30 custom-scrollbar">
                {productos.length === 0 ? (
                  <p className="text-slate-500 italic p-4 sm:p-6 text-center text-sm">No hay productos disponibles.</p>
                ) : (
                  <div className="divide-y divide-slate-700/50">
                    {productos.map((prod) => {
                      const deshabilitado = cuentaSeleccionada?.estado === 'pagada';
                      return (
                        <div
                          key={prod.id}
                          onClick={() => !deshabilitado && agregarConsumo(prod.id)}
                          className={`flex justify-between items-center px-4 sm:px-5 py-3 sm:py-4 transition-colors ${
                            deshabilitado 
                              ? 'cursor-not-allowed bg-slate-900/50 opacity-50' 
                              : 'cursor-pointer bg-transparent hover:bg-slate-700/50 active:bg-slate-600/50'
                          }`}
                        >
                          <span className="font-semibold text-slate-200 text-sm">{prod.nombre}</span>
                          <span className="text-blue-400 font-bold text-sm bg-blue-500/10 px-2.5 py-1 rounded-lg shrink-0 ml-2">
                            {formatoDinero(Number(prod.precio_actual))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Columna 3 (Derecha): Resumen Financiero */}
            <div className="w-full lg:w-[28%]">
              <ResumenPestanas cuentaSeleccionada={cuentaSeleccionada} onCuentaCambiada={refrescarDatosCuenta} clienteEstado={clienteSeleccionado.estado} />
            </div>

          </div>
        </div>
      )}

      {/* MODAL CREAR CLIENTE RÁPIDO */}
      {mostrarModalCliente && (
        <div className="fixed inset-0 bg-slate-900/80 flex justify-center items-center z-50 backdrop-blur-sm anim-fade-in">
          <div className="bg-slate-800 p-8 rounded-2xl w-11/12 max-w-md shadow-2xl border border-slate-700">
            <h3 className="mt-0 mb-6 text-slate-100 text-xl font-bold">Registrar Nuevo Cliente</h3>
            <form onSubmit={guardarNuevoCliente} className="space-y-4">
              <div>
                <label className="block mb-2 font-semibold text-slate-400 text-sm">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={nombreNuevoCliente}
                  onChange={(e) => setNombreNuevoCliente(e.target.value)}
                  className="input-premium"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 font-semibold text-slate-400 text-sm">Teléfono (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. +56998765432"
                  value={telefonoNuevoCliente}
                  onChange={(e) => setTelefonoNuevoCliente(e.target.value)}
                  className="input-premium"
                />
              </div>
              <div className="flex gap-3 justify-end mt-8">
                <button
                  type="button"
                  onClick={() => setMostrarModalCliente(false)}
                  className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 border-none rounded-xl cursor-pointer font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white border-none rounded-xl cursor-pointer font-semibold shadow-lg shadow-blue-500/20 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL MODIFICAR CLIENTE */}
      {mostrarModalEditCliente && (
        <div className="fixed inset-0 bg-slate-900/80 flex justify-center items-center z-50 backdrop-blur-sm anim-fade-in">
          <div className="bg-slate-800 p-8 rounded-2xl w-11/12 max-w-md shadow-2xl border border-slate-700">
            <h3 className="mt-0 mb-6 text-slate-100 text-xl font-bold">Modificar Cliente</h3>
            <form onSubmit={guardarCambiosCliente} className="space-y-4">
              <div>
                <label className="block mb-2 font-semibold text-slate-400 text-sm">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={nombreEditCliente}
                  onChange={(e) => setNombreEditCliente(e.target.value)}
                  className="input-premium"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 font-semibold text-slate-400 text-sm">Teléfono (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. +56998765432"
                  value={telefonoEditCliente}
                  onChange={(e) => setTelefonoEditCliente(e.target.value)}
                  className="input-premium"
                />
              </div>
              <div>
                <label className="block mb-2 font-semibold text-slate-400 text-sm">Estado</label>
                <SelectorPremium
                  value={estadoEditCliente}
                  onChange={(val) => setEstadoEditCliente(val as 'activo' | 'inactivo')}
                  opciones={[
                    { value: 'activo', label: 'Activo' },
                    { value: 'inactivo', label: 'Inactivo' }
                  ]}
                  className="w-full"
                  anchoPopup="w-full"
                />
              </div>
              <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setMostrarConfirmarEliminarCliente(true)}
                  className="px-4 py-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl font-semibold text-sm transition-colors"
                >
                  Eliminar Cliente
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setMostrarModalEditCliente(false)}
                    className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 border-none rounded-xl cursor-pointer font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white border-none rounded-xl cursor-pointer font-semibold shadow-lg shadow-blue-500/20 transition-colors"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMAR ELIMINAR CLIENTE */}
      {mostrarConfirmarEliminarCliente && (
        <div className="fixed inset-0 bg-slate-900/80 flex justify-center items-center z-[9999] backdrop-blur-sm">
          <div className="bg-slate-800 p-10 rounded-2xl w-11/12 max-w-md shadow-2xl border border-slate-700 text-center anim-slide-in">
            <h3 className="mt-0 mb-4 text-slate-100 text-2xl font-bold tracking-tight">
              Confirmar Eliminar Cliente
            </h3>
            <p className="text-slate-400 text-base leading-relaxed mb-8">
              ¿Estás seguro de que deseas eliminar permanentemente a este cliente del sistema? Esta acción eliminará todo su historial de cuentas y consumos, y no se puede deshacer.
            </p>
            
            <div className="flex gap-4 justify-center">
              <button
                type="button"
                onClick={() => setMostrarConfirmarEliminarCliente(false)}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 border-none rounded-xl cursor-pointer font-semibold text-sm min-w-[120px] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={eliminarClienteActual}
                className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white border-none rounded-xl cursor-pointer font-semibold text-sm min-w-[120px] shadow-lg shadow-rose-500/20 transition-colors"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PEDIDO PERSONALIZADO */}
      {mostrarModalPedido && (
        <div className="fixed inset-0 bg-slate-900/80 flex justify-center items-center z-50 backdrop-blur-sm anim-fade-in">
          <div className="bg-slate-800 p-8 rounded-2xl w-11/12 max-w-md shadow-2xl border border-amber-500/20">
            <div className="flex items-center gap-3 mb-6">
              <UtensilsCrossed size={28} className="text-amber-400" />
              <h3 className="m-0 text-slate-100 text-xl font-bold">Pedido Personalizado</h3>
            </div>
            <form onSubmit={enviarPedidoPersonalizado} className="space-y-4">
              <div>
                <label className="block mb-2 font-semibold text-slate-400 text-sm">Nombre del pedido</label>
                <input
                  type="text"
                  placeholder="Ej. Almuerzo especial vegetariano"
                  value={nombrePedido}
                  onChange={(e) => setNombrePedido(e.target.value)}
                  className="input-premium"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block mb-2 font-semibold text-slate-400 text-sm">Precio unitario ($)</label>
                <input
                  type="number"
                  placeholder="Ej. 3500"
                  value={precioPedido}
                  onChange={(e) => setPrecioPedido(e.target.value)}
                  className="input-premium"
                  min="1"
                  step="1"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 font-semibold text-slate-400 text-sm">Cantidad</label>
                <input
                  type="number"
                  value={cantidadPedido}
                  onChange={(e) => setCantidadPedido(Math.max(1, parseInt(e.target.value) || 1))}
                  className="input-premium"
                  min="1"
                  required
                />
              </div>
              {nombrePedido && precioPedido && Number(precioPedido) > 0 && (
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-sm text-amber-300 font-semibold text-center">
                  Total: ${(Number(precioPedido) * cantidadPedido).toLocaleString('es-CL')}
                </div>
              )}
              <div className="flex gap-3 justify-end mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarModalPedido(false);
                    setNombrePedido('');
                    setPrecioPedido('');
                    setCantidadPedido(1);
                  }}
                  className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 border-none rounded-xl cursor-pointer font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviandoPedido}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 border-none rounded-xl cursor-pointer font-bold shadow-lg shadow-amber-500/20 transition-colors"
                >
                  {enviandoPedido ? 'Registrando...' : 'Registrar pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default PanelAtencion;
