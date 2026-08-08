import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Cliente, CuentaMensual, Producto } from '../../types';
import { servicioCliente, servicioProducto, servicioCuenta } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import Boton from '../../components/ui/Boton';
import Campo from '../../components/ui/Campo';
import Modal from '../../components/ui/Modal';
import Menu from '../../components/ui/Menu';
import { formatoDinero } from '../../utils/formato';
import CuentaCliente from './CuentaCliente';
import ListaClientes from './ListaClientes';

function PanelAtencion() {
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);

  // --- Vista 1: lista de clientes ---
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [cargandoClientes, setCargandoClientes] = useState(false);
  const [criterioOrden, setCriterioOrden] = useState<'nombre' | 'deuda' | 'estado'>('nombre');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos');

  const clientesFiltrados = clientes.filter((c) => {
    if (filtroEstado === 'activos') return c.estado === 'activo';
    if (filtroEstado === 'inactivos') return c.estado === 'inactivo';
    return true;
  });

  const clientesOrdenados = [...clientesFiltrados].sort((a, b) => {
    if (criterioOrden === 'deuda') return Number(b.deuda) - Number(a.deuda);
    if (criterioOrden === 'estado') {
      if (a.estado_pago === 'deuda' && b.estado_pago === 'pagado') return -1;
      if (a.estado_pago === 'pagado' && b.estado_pago === 'deuda') return 1;
      return Number(b.deuda) - Number(a.deuda);
    }
    return a.nombre.localeCompare(b.nombre, 'es');
  });

  const busquedaClienteDebounced = useDebounce(busquedaCliente, 350);

  // --- Vista 2: cuenta del cliente ---
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<CuentaMensual | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [cargandoCuenta, setCargandoCuenta] = useState(false);
  const [transaccionAEliminar, setTransaccionAEliminar] = useState<string | null>(null);
  // Ids de producto con un POST en curso: evita duplicar por doble click
  const [productosEnVuelo, setProductosEnVuelo] = useState<Set<string>>(new Set());
  // Día elegido para las transacciones nuevas; null = "todo el mes"
  const [diaSeleccionado, setDiaSeleccionado] = useState<number | null>(null);

  // --- Modales ---
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false);
  const [nombreNuevoCliente, setNombreNuevoCliente] = useState('');
  const [telefonoNuevoCliente, setTelefonoNuevoCliente] = useState('');

  const [mostrarModalEditCliente, setMostrarModalEditCliente] = useState(false);
  const [nombreEditCliente, setNombreEditCliente] = useState('');
  const [telefonoEditCliente, setTelefonoEditCliente] = useState('');
  const [estadoEditCliente, setEstadoEditCliente] = useState<'activo' | 'inactivo'>('activo');
  const [mostrarConfirmarEliminarCliente, setMostrarConfirmarEliminarCliente] = useState(false);

  const [mostrarModalPedido, setMostrarModalPedido] = useState(false);
  const [nombrePedido, setNombrePedido] = useState('');
  const [precioPedido, setPrecioPedido] = useState('');
  const [cantidadPedido, setCantidadPedido] = useState(1);
  const [enviandoPedido, setEnviandoPedido] = useState(false);

  const cargarClientes = async () => {
    setCargandoClientes(true);
    try {
      const resp = await servicioCliente.obtenerTodos(busquedaCliente || undefined);
      setClientes(resp.data);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
      // Sin aviso, una lista vacía por error se lee igual que "no hay clientes"
      toast.error('No se pudo cargar la lista de clientes.');
    } finally {
      setCargandoClientes(false);
    }
  };

  // Los productos se cargan una sola vez por cliente: son pocos y se filtran
  // en el navegador, sin ida y vuelta por cada tecla.
  const cargarProductos = async () => {
    try {
      const resp = await servicioProducto.obtenerTodos();
      setProductos(resp.data);
    } catch (err) {
      console.error('Error al cargar productos:', err);
      toast.error('No se pudo cargar la lista de productos.');
    }
  };

  useEffect(() => {
    if (!clienteSeleccionado) cargarClientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busquedaClienteDebounced, clienteSeleccionado]);

  useEffect(() => {
    if (clienteSeleccionado) cargarProductos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteSeleccionado]);

  const seleccionarCliente = async (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setDiaSeleccionado(null);
    setBusquedaProducto('');
    setCargandoCuenta(true);
    try {
      const resp = await servicioCuenta.obtenerPorCliente(cliente.id);
      setCuentaSeleccionada(resp.data);
    } catch (err) {
      console.error('Error al obtener cuenta del cliente:', err);
      toast.error('No se pudo abrir la cuenta del cliente.');
    } finally {
      setCargandoCuenta(false);
    }
  };

  const refrescarDatosCuenta = async () => {
    if (!clienteSeleccionado || !cuentaSeleccionada) return;
    try {
      const resp = await servicioCuenta.obtenerPorCliente(
        clienteSeleccionado.id,
        cuentaSeleccionada.mes,
        cuentaSeleccionada.anio,
      );
      setCuentaSeleccionada(resp.data);
    } catch (err) {
      console.error('Error al refrescar cuenta:', err);
      toast.error('No se pudo actualizar la cuenta.');
    }
  };

  const cambiarPeriodo = async (mes: number, anio: number) => {
    if (!clienteSeleccionado) return;
    setCargandoCuenta(true);
    // Reseteamos el día para no arrastrar uno inválido a otro mes
    setDiaSeleccionado(null);
    try {
      const resp = await servicioCuenta.obtenerPorCliente(clienteSeleccionado.id, mes, anio);
      setCuentaSeleccionada(resp.data);
    } catch (err) {
      console.error('Error al cambiar de período:', err);
      toast.error('No se pudo cargar ese mes.');
    } finally {
      setCargandoCuenta(false);
    }
  };

  const agregarConsumo = async (productoId: string) => {
    if (!clienteSeleccionado || !cuentaSeleccionada) return;
    if (cuentaSeleccionada.estado === 'pagada') {
      toast.error('Esta cuenta ya está cerrada.');
      return;
    }
    if (productosEnVuelo.has(productoId)) return;

    setProductosEnVuelo((prev) => new Set(prev).add(productoId));
    try {
      await servicioCuenta.agregarTransaccion(clienteSeleccionado.id, {
        producto_id: productoId,
        cantidad: 1,
        mes: cuentaSeleccionada.mes,
        anio: cuentaSeleccionada.anio,
        dia: diaSeleccionado ?? undefined,
      });
      await refrescarDatosCuenta();
    } catch (err) {
      console.error('Error al registrar consumo:', err);
      toast.error('No se pudo agregar el producto.');
    } finally {
      setProductosEnVuelo((prev) => {
        const siguiente = new Set(prev);
        siguiente.delete(productoId);
        return siguiente;
      });
    }
  };

  const confirmarQuitarConsumo = async () => {
    if (!transaccionAEliminar) return;
    try {
      await servicioCuenta.eliminarTransaccion(transaccionAEliminar);
      setTransaccionAEliminar(null);
      await refrescarDatosCuenta();
    } catch (err) {
      console.error('Error al eliminar consumo:', err);
      toast.error('No se pudo quitar el producto.');
    }
  };

  const enviarPedidoPersonalizado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteSeleccionado || !cuentaSeleccionada) return;
    if (cuentaSeleccionada.estado === 'pagada') {
      toast.error('Esta cuenta ya está cerrada.');
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
        mes: cuentaSeleccionada.mes,
        anio: cuentaSeleccionada.anio,
        dia: diaSeleccionado ?? undefined,
      });
      cerrarModalPedido();
      await refrescarDatosCuenta();
    } catch (err) {
      console.error('Error al enviar pedido personalizado:', err);
      toast.error('No se pudo registrar el pedido.');
    } finally {
      setEnviandoPedido(false);
    }
  };

  const cerrarModalPedido = () => {
    setMostrarModalPedido(false);
    setNombrePedido('');
    setPrecioPedido('');
    setCantidadPedido(1);
  };

  const guardarNuevoCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNuevoCliente.trim()) return;
    try {
      const resp = await servicioCliente.crear({
        nombre: nombreNuevoCliente,
        telefono: telefonoNuevoCliente || undefined,
        estado: 'activo',
      });
      setMostrarModalCliente(false);
      setNombreNuevoCliente('');
      setTelefonoNuevoCliente('');
      seleccionarCliente(resp.data);
    } catch (err) {
      console.error('Error al crear cliente:', err);
      toast.error('No se pudo crear el cliente.');
    }
  };

  const abrirModalEditarCliente = () => {
    if (!clienteSeleccionado) return;
    setNombreEditCliente(clienteSeleccionado.nombre);
    setTelefonoEditCliente(clienteSeleccionado.telefono || '');
    setEstadoEditCliente(clienteSeleccionado.estado);
    setMostrarModalEditCliente(true);
  };

  const guardarCambiosCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteSeleccionado || !nombreEditCliente.trim()) return;
    try {
      const resp = await servicioCliente.actualizar(clienteSeleccionado.id, {
        nombre: nombreEditCliente,
        telefono: telefonoEditCliente,
        estado: estadoEditCliente,
      });
      setClienteSeleccionado(resp.data);
      setMostrarModalEditCliente(false);
    } catch (err) {
      console.error('Error al actualizar cliente:', err);
      toast.error('No se pudieron guardar los cambios.');
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
      toast.error('No se pudo eliminar el cliente.');
    }
  };

  const totalPedido = Number(precioPedido) * cantidadPedido;

  return (
    // w-full es necesario: en un contenedor flex en columna, mx-auto por sí solo
    // hace que el hijo se encoja al ancho de su contenido en vez de estirarse.
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col">
      {clienteSeleccionado ? (
        <CuentaCliente
          cliente={clienteSeleccionado}
          cuenta={cuentaSeleccionada}
          cargandoCuenta={cargandoCuenta}
          dia={diaSeleccionado}
          onCambiarDia={setDiaSeleccionado}
          onCambiarPeriodo={cambiarPeriodo}
          onVolver={() => setClienteSeleccionado(null)}
          onEditarCliente={abrirModalEditarCliente}
          onQuitarConsumo={setTransaccionAEliminar}
          onCuentaCambiada={refrescarDatosCuenta}
          productos={productos}
          busquedaProducto={busquedaProducto}
          onBusquedaProducto={setBusquedaProducto}
          productosEnVuelo={productosEnVuelo}
          onAgregarConsumo={agregarConsumo}
          onPedidoLibre={() => setMostrarModalPedido(true)}
        />
      ) : (
        <ListaClientes
          clientes={clientesOrdenados}
          cargando={cargandoClientes}
          busqueda={busquedaCliente}
          onBusqueda={setBusquedaCliente}
          filtroEstado={filtroEstado}
          onFiltroEstado={setFiltroEstado}
          criterioOrden={criterioOrden}
          onCriterioOrden={setCriterioOrden}
          onSeleccionar={seleccionarCliente}
          onNuevoCliente={() => setMostrarModalCliente(true)}
        />
      )}

      {/* Quitar un consumo de la cuenta */}
      <Modal
        abierto={transaccionAEliminar !== null}
        onCerrar={() => setTransaccionAEliminar(null)}
        titulo="Quitar producto"
        descripcion="Se borra de la cuenta del cliente. No se puede deshacer."
        ancho="sm"
        pie={
          <>
            <Boton variante="sutil" onClick={() => setTransaccionAEliminar(null)}>
              Cancelar
            </Boton>
            <Boton variante="peligro" onClick={confirmarQuitarConsumo}>
              Quitar
            </Boton>
          </>
        }
      >
        <p className="text-sm text-tinta-suave">
          El importe deja de contar en el total del mes.
        </p>
      </Modal>

      {/* Nuevo cliente */}
      <Modal
        abierto={mostrarModalCliente}
        onCerrar={() => setMostrarModalCliente(false)}
        titulo="Nuevo cliente"
        ancho="sm"
        pie={
          <>
            <Boton variante="sutil" onClick={() => setMostrarModalCliente(false)}>
              Cancelar
            </Boton>
            <Boton variante="primario" type="submit" form="form-nuevo-cliente">
              Crear cliente
            </Boton>
          </>
        }
      >
        <form id="form-nuevo-cliente" onSubmit={guardarNuevoCliente} className="space-y-3">
          <Campo
            etiqueta="Nombre"
            placeholder="Ej. Juan Pérez"
            value={nombreNuevoCliente}
            onChange={(e) => setNombreNuevoCliente(e.target.value)}
            required
            autoFocus
          />
          <Campo
            etiqueta="Teléfono"
            placeholder="Opcional"
            value={telefonoNuevoCliente}
            onChange={(e) => setTelefonoNuevoCliente(e.target.value)}
          />
        </form>
      </Modal>

      {/* Editar cliente */}
      <Modal
        abierto={mostrarModalEditCliente}
        onCerrar={() => setMostrarModalEditCliente(false)}
        titulo="Editar cliente"
        ancho="sm"
        pie={
          <>
            <Boton
              variante="peligro"
              className="mr-auto"
              onClick={() => setMostrarConfirmarEliminarCliente(true)}
            >
              Eliminar
            </Boton>
            <Boton variante="sutil" onClick={() => setMostrarModalEditCliente(false)}>
              Cancelar
            </Boton>
            <Boton variante="primario" type="submit" form="form-editar-cliente">
              Guardar
            </Boton>
          </>
        }
      >
        <form id="form-editar-cliente" onSubmit={guardarCambiosCliente} className="space-y-3">
          <Campo
            etiqueta="Nombre"
            value={nombreEditCliente}
            onChange={(e) => setNombreEditCliente(e.target.value)}
            required
          />
          <Campo
            etiqueta="Teléfono"
            placeholder="Opcional"
            value={telefonoEditCliente}
            onChange={(e) => setTelefonoEditCliente(e.target.value)}
          />
          <div>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-tinta-tenue">
              Estado
            </span>
            <Menu
              value={estadoEditCliente}
              onChange={(v) => setEstadoEditCliente(v as 'activo' | 'inactivo')}
              opciones={[
                { value: 'activo', label: 'Activo' },
                { value: 'inactivo', label: 'Inactivo' },
              ]}
              className="w-full"
            />
          </div>
        </form>
      </Modal>

      {/* Confirmar eliminación de cliente */}
      <Modal
        abierto={mostrarConfirmarEliminarCliente}
        onCerrar={() => setMostrarConfirmarEliminarCliente(false)}
        titulo="Eliminar cliente"
        descripcion="No se puede deshacer."
        ancho="sm"
        anidado
        pie={
          <>
            <Boton variante="sutil" onClick={() => setMostrarConfirmarEliminarCliente(false)}>
              Cancelar
            </Boton>
            <Boton variante="peligro" onClick={eliminarClienteActual}>
              Eliminar cliente
            </Boton>
          </>
        }
      >
        <p className="text-sm text-tinta-suave">
          Se borra el cliente junto con todo su historial de cuentas y consumos. Los meses ya
          cerrados dejan de reflejar estas ventas.
        </p>
      </Modal>

      {/* Pedido con precio libre */}
      <Modal
        abierto={mostrarModalPedido}
        onCerrar={cerrarModalPedido}
        titulo="Pedido con precio libre"
        descripcion="Para lo que no está en la lista de productos."
        ancho="sm"
        pie={
          <>
            <Boton variante="sutil" onClick={cerrarModalPedido}>
              Cancelar
            </Boton>
            <Boton
              variante="primario"
              type="submit"
              form="form-pedido-libre"
              cargando={enviandoPedido}
              textoCargando="Registrando…"
            >
              Agregar a la cuenta
            </Boton>
          </>
        }
      >
        <form id="form-pedido-libre" onSubmit={enviarPedidoPersonalizado} className="space-y-3">
          <Campo
            etiqueta="Descripción"
            placeholder="Ej. Almuerzo del día"
            value={nombrePedido}
            onChange={(e) => setNombrePedido(e.target.value)}
            required
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <Campo
              etiqueta="Precio unitario"
              type="number"
              placeholder="0"
              value={precioPedido}
              onChange={(e) => setPrecioPedido(e.target.value)}
              min="1"
              step="1"
              required
              className="cifra"
            />
            <Campo
              etiqueta="Cantidad"
              type="number"
              value={cantidadPedido}
              onChange={(e) => setCantidadPedido(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              required
              className="cifra"
            />
          </div>
          {totalPedido > 0 && (
            <div className="flex items-baseline justify-between border-t border-borde pt-3">
              <span className="text-sm text-tinta-suave">Importe</span>
              <span className="cifra text-sm text-tinta">{formatoDinero(totalPedido)}</span>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}

export default PanelAtencion;
