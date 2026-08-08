import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Search, Edit2, Trash2, ArrowUpDown, Tag, Plus, Archive, PackageX } from 'lucide-react';
import Menu from '../../components/ui/Menu';
import ModalConfirmacion from '../../components/ModalConfirmacion';
import Boton from '../../components/ui/Boton';
import Insignia from '../../components/ui/Insignia';
import Monto from '../../components/ui/Monto';
import { Producto, Categoria, ProductoImpacto } from '../../types';
import { servicioProducto, servicioCategoria } from '../../services/api';
import ModalCategorias from './ModalCategorias';
import ModalProducto from './ModalProducto';
import ModalPerdida from './ModalPerdida';
import ModalHistorialPerdidas from './ModalHistorialPerdidas';
import ModalImpactoProducto from './ModalImpactoProducto';

const Inventario = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);

  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');

  const [modalCategoriasAbierto, setModalCategoriasAbierto] = useState(false);
  const [modalProductoAbierto, setModalProductoAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [productoPerdida, setProductoPerdida] = useState<Producto | null>(null);
  const [modalHistorialPerdidasAbierto, setModalHistorialPerdidasAbierto] = useState(false);

  // Flujo de eliminación: primero se consulta el impacto en clientes.
  // Sin uso -> confirmación simple. Con uso -> modal de impacto (se archiva).
  const [cargandoImpactoId, setCargandoImpactoId] = useState<string | null>(null);
  const [pendienteEliminarSimple, setPendienteEliminarSimple] = useState<Producto | null>(null);
  const [productoArchivando, setProductoArchivando] = useState<Producto | null>(null);
  const [impactoArchivar, setImpactoArchivar] = useState<ProductoImpacto | null>(null);
  const [procesandoEliminar, setProcesandoEliminar] = useState(false);

  // Ordenamiento
  const [ordenConfig, setOrdenConfig] = useState<{ key: keyof Producto, dir: 'asc' | 'desc' } | null>(null);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [prodResp, catResp] = await Promise.all([
        servicioProducto.obtenerTodos(),
        servicioCategoria.obtenerTodos()
      ]);
      setProductos(prodResp.data);
      setCategorias(catResp.data);
    } catch (err) {
      console.error('Error al cargar inventario:', err);
      toast.error('No se pudo cargar el inventario.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const iniciarEliminarProducto = async (prod: Producto) => {
    setCargandoImpactoId(prod.id);
    try {
      const { data } = await servicioProducto.obtenerImpacto(prod.id);
      if (data.tiene_uso) {
        setProductoArchivando(prod);
        setImpactoArchivar(data);
      } else {
        setPendienteEliminarSimple(prod);
      }
    } catch (err) {
      console.error('Error al obtener impacto del producto:', err);
      setPendienteEliminarSimple(prod); // fallback: confirmación simple
    } finally {
      setCargandoImpactoId(null);
    }
  };

  const eliminarProducto = async (id: string) => {
    try {
      const { data } = await servicioProducto.eliminar(id);
      toast.success(
        data.resultado === 'archivado'
          ? 'Producto archivado. El historial de los clientes se mantiene intacto.'
          : 'Producto eliminado.'
      );
      cargarDatos();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al eliminar el producto');
    }
  };

  const confirmarEliminarSimple = async () => {
    if (!pendienteEliminarSimple) return;
    await eliminarProducto(pendienteEliminarSimple.id);
    setPendienteEliminarSimple(null);
  };

  const confirmarArchivar = async () => {
    if (!productoArchivando) return;
    setProcesandoEliminar(true);
    await eliminarProducto(productoArchivando.id);
    setProcesandoEliminar(false);
    setProductoArchivando(null);
    setImpactoArchivar(null);
  };

  const handleSort = (key: keyof Producto) => {
    let dir: 'asc' | 'desc' = 'asc';
    if (ordenConfig && ordenConfig.key === key && ordenConfig.dir === 'asc') {
      dir = 'desc';
    }
    setOrdenConfig({ key, dir });
  };

  const productosFiltradosYOrdenados = useMemo(() => {
    let filtrados = productos;

    if (busqueda.trim()) {
      filtrados = filtrados.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
    }

    if (categoriaFiltro !== 'todas') {
      if (categoriaFiltro === 'ninguna') {
        filtrados = filtrados.filter(p => !p.categoria_id);
      } else {
        filtrados = filtrados.filter(p => p.categoria_id === categoriaFiltro);
      }
    }

    if (ordenConfig) {
      filtrados = [...filtrados].sort((a, b) => {
        const aVal = a[ordenConfig.key];
        const bVal = b[ordenConfig.key];

        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (aVal < bVal) return ordenConfig.dir === 'asc' ? -1 : 1;
        return ordenConfig.dir === 'asc' ? 1 : -1;
      });
    }
    return filtrados;
  }, [productos, busqueda, categoriaFiltro, ordenConfig]);

  const AccionesFila = ({ prod }: { prod: Producto }) => (
    <div className="flex gap-1">
      <button
        onClick={() => setProductoPerdida(prod)}
        className="rounded p-1.5 text-tinta-tenue transition-colors duration-rapida hover:bg-superficie-sutil hover:text-tinta"
        title="Registrar pérdida"
        aria-label={`Registrar pérdida de ${prod.nombre}`}
      >
        <PackageX size={15} />
      </button>
      <button
        onClick={() => { setProductoEditando(prod); setModalProductoAbierto(true); }}
        className="rounded p-1.5 text-tinta-tenue transition-colors duration-rapida hover:bg-superficie-sutil hover:text-tinta"
        title="Editar producto"
        aria-label={`Editar ${prod.nombre}`}
      >
        <Edit2 size={15} />
      </button>
      <button
        onClick={() => iniciarEliminarProducto(prod)}
        disabled={cargandoImpactoId === prod.id}
        className="rounded p-1.5 text-tinta-tenue transition-colors duration-rapida hover:bg-deuda-suave hover:text-deuda disabled:opacity-50"
        title="Eliminar producto"
        aria-label={`Eliminar ${prod.nombre}`}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-tinta">Inventario</h1>

        <div className="flex gap-2">
          <Boton variante="secundario" onClick={() => setModalHistorialPerdidasAbierto(true)}>
            <PackageX size={15} /> Pérdidas
          </Boton>
          <Boton variante="secundario" onClick={() => setModalCategoriasAbierto(true)}>
            <Tag size={15} /> Categorías
          </Boton>
          <Boton variante="primario" onClick={() => { setProductoEditando(null); setModalProductoAbierto(true); }}>
            <Plus size={15} /> Nuevo producto
          </Boton>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-borde bg-superficie-elevada p-4">
        <div className="mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tinta-tenue" size={15} />
            <input
              type="text"
              placeholder="Buscar producto…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="campo pl-9"
            />
          </div>

          <Menu
            value={categoriaFiltro}
            onChange={setCategoriaFiltro}
            opciones={[
              { value: 'todas', label: 'Todas las categorías' },
              { value: 'ninguna', label: 'Sin categoría' },
              ...categorias.map(c => ({ value: c.id, label: c.nombre }))
            ]}
            className="min-w-[200px]"
          />
        </div>

        {/* Tabla (desktop) */}
        <div className="hidden min-h-0 flex-1 overflow-auto rounded border border-borde md:block">
          <table className="w-full min-w-[600px] border-collapse text-left">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-borde-fuerte bg-superficie-alta text-[0.6875rem] uppercase tracking-wide text-tinta-tenue">
                <th className="cursor-pointer p-3 transition-colors duration-rapida hover:text-tinta" onClick={() => handleSort('nombre')}>
                  <div className="flex items-center gap-1.5">Producto <ArrowUpDown size={12} /></div>
                </th>
                <th className="p-3">Categoría</th>
                <th className="cursor-pointer p-3 transition-colors duration-rapida hover:text-tinta" onClick={() => handleSort('precio_actual')}>
                  <div className="flex items-center gap-1.5">Precio <ArrowUpDown size={12} /></div>
                </th>
                <th className="cursor-pointer p-3 transition-colors duration-rapida hover:text-tinta" onClick={() => handleSort('stock_actual')}>
                  <div className="flex items-center gap-1.5">Stock <ArrowUpDown size={12} /></div>
                </th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-tinta-tenue">Cargando…</td>
                </tr>
              ) : productosFiltradosYOrdenados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-tinta-tenue">
                    <Archive className="mx-auto mb-3 opacity-30" size={36} />
                    No se encontraron productos.
                  </td>
                </tr>
              ) : (
                productosFiltradosYOrdenados.map((prod) => (
                  <tr key={prod.id} className="border-b border-borde transition-colors duration-rapida hover:bg-superficie-sutil">
                    <td className="p-3 text-sm text-tinta">{prod.nombre}</td>
                    <td className="p-3">
                      {prod.categoria ? (
                        <Insignia tono="acento">{prod.categoria.nombre}</Insignia>
                      ) : (
                        <span className="text-xs italic text-tinta-tenue">Sin categoría</span>
                      )}
                    </td>
                    <td className="p-3"><Monto valor={Number(prod.precio_actual)} /></td>
                    <td className="p-3">
                      <span className={`cifra text-sm ${prod.stock_actual <= 5 ? 'text-deuda' : 'text-tinta-suave'}`}>
                        {prod.stock_actual}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center">
                        <AccionesFila prod={prod} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Tarjetas (móvil) */}
        <div className="min-h-0 flex-1 space-y-2 overflow-auto md:hidden">
          {cargando ? (
            <p className="p-8 text-center text-sm text-tinta-tenue">Cargando…</p>
          ) : productosFiltradosYOrdenados.length === 0 ? (
            <div className="p-12 text-center text-tinta-tenue">
              <Archive className="mx-auto mb-3 opacity-30" size={36} />
              No se encontraron productos.
            </div>
          ) : (
            productosFiltradosYOrdenados.map((prod) => (
              <div key={prod.id} className="rounded border border-borde p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-tinta">{prod.nombre}</p>
                    <div className="mt-1">
                      {prod.categoria ? (
                        <Insignia tono="acento">{prod.categoria.nombre}</Insignia>
                      ) : (
                        <span className="text-xs italic text-tinta-tenue">Sin categoría</span>
                      )}
                    </div>
                  </div>
                  <AccionesFila prod={prod} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-borde pt-2.5">
                  <Monto valor={Number(prod.precio_actual)} />
                  <span className="text-xs text-tinta-tenue">
                    Stock:{' '}
                    <span className={`cifra ${prod.stock_actual <= 5 ? 'text-deuda' : 'text-tinta-suave'}`}>
                      {prod.stock_actual}
                    </span>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ModalCategorias
        isOpen={modalCategoriasAbierto}
        onClose={() => { setModalCategoriasAbierto(false); cargarDatos(); }}
      />

      <ModalProducto
        isOpen={modalProductoAbierto}
        onClose={() => setModalProductoAbierto(false)}
        onSuccess={cargarDatos}
        productoEditar={productoEditando}
      />

      <ModalPerdida
        isOpen={!!productoPerdida}
        onClose={() => setProductoPerdida(null)}
        onSuccess={cargarDatos}
        producto={productoPerdida}
      />

      <ModalHistorialPerdidas
        isOpen={modalHistorialPerdidasAbierto}
        onClose={() => setModalHistorialPerdidasAbierto(false)}
        onCambio={cargarDatos}
      />

      <ModalConfirmacion
        isOpen={!!pendienteEliminarSimple}
        titulo="Eliminar producto"
        mensaje="¿Seguro que deseas eliminar este producto? Esta acción no se puede deshacer."
        textoConfirmar="Eliminar"
        peligroso
        onConfirmar={confirmarEliminarSimple}
        onCancelar={() => setPendienteEliminarSimple(null)}
      />

      <ModalImpactoProducto
        isOpen={!!productoArchivando}
        modo="eliminar"
        impacto={impactoArchivar}
        cargando={procesandoEliminar}
        onConfirmar={confirmarArchivar}
        onCancelar={() => { setProductoArchivando(null); setImpactoArchivar(null); }}
      />
    </div>
  );
};

export default Inventario;
