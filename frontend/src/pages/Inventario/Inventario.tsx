import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Search, Edit2, Trash2, ArrowUpDown, Tag, Plus, Archive, PackageX } from 'lucide-react';
import SelectorPremium from '../../components/SelectorPremium';
import ModalConfirmacion from '../../components/ModalConfirmacion';
import { Producto, Categoria, ProductoImpacto } from '../../types';
import { servicioProducto, servicioCategoria } from '../../services/api';
import ModalCategorias from './ModalCategorias';
import ModalProducto from './ModalProducto';
import ModalPerdida from './ModalPerdida';
import ModalHistorialPerdidas from './ModalHistorialPerdidas';
import ModalImpactoProducto from './ModalImpactoProducto';
import { formatoDinero } from '../../utils/formato';

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
    
    // Filtro por texto
    if (busqueda.trim()) {
      filtrados = filtrados.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
    }
    
    // Filtro por categoría
    if (categoriaFiltro !== 'todas') {
      if (categoriaFiltro === 'ninguna') {
        filtrados = filtrados.filter(p => !p.categoria_id);
      } else {
        filtrados = filtrados.filter(p => p.categoria_id === categoriaFiltro);
      }
    }

    // Ordenamiento
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



  return (
    <div className="anim-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-slate-100 text-2xl sm:text-3xl" style={{ fontWeight: '800', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>
            Inventario & Stock
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            Gestiona productos, stock y categorías
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setModalHistorialPerdidasAbierto(true)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2 px-4 rounded-xl border border-slate-600 transition-all duration-200 flex items-center gap-2"
          >
            <PackageX size={18} />
            Pérdidas
          </button>
          <button
            onClick={() => setModalCategoriasAbierto(true)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2 px-4 rounded-xl border border-slate-600 transition-all duration-200 flex items-center gap-2"
          >
            <Tag size={18} />
            Categorías
          </button>
          <button 
            onClick={() => { setProductoEditando(null); setModalProductoAbierto(true); }}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-6 rounded-xl border border-blue-400 transition-all duration-200 flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Plus size={18} />
            Nuevo Producto
          </button>
        </div>
      </div>

      <div className="bg-[#0b1120]/60 backdrop-blur-xl border border-white/5 shadow-2xl shadow-black/40 rounded-2xl p-4 sm:p-6 flex flex-col flex-1">
        
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6 items-stretch sm:items-center sm:justify-between">
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar producto por nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="input-premium pl-10 !py-2"
            />
          </div>

          <div className="flex gap-2 min-w-[200px]">
            <SelectorPremium
              value={categoriaFiltro}
              onChange={setCategoriaFiltro}
              opciones={[
                { value: 'todas', label: 'Todas las categorías' },
                { value: 'ninguna', label: 'Sin categoría' },
                ...categorias.map(c => ({ value: c.id, label: c.nombre }))
              ]}
              className="w-full"
            />
          </div>
        </div>

        {/* Tabla (desktop) */}
        <div className="hidden md:block flex-1 border border-white/5 rounded-xl overflow-auto bg-slate-900/30">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-800/80 border-b border-white/5 text-slate-300 text-sm font-semibold sticky top-0 backdrop-blur-md z-10">
                <th className="p-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort('nombre')}>
                  <div className="flex items-center gap-2">Producto <ArrowUpDown size={14} className="text-slate-500" /></div>
                </th>
                <th className="p-4">Categoría</th>
                <th className="p-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort('precio_actual')}>
                  <div className="flex items-center gap-2">Precio <ArrowUpDown size={14} className="text-slate-500" /></div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort('stock_actual')}>
                  <div className="flex items-center gap-2">Stock <ArrowUpDown size={14} className="text-slate-500" /></div>
                </th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">Cargando...</td>
                </tr>
              ) : productosFiltradosYOrdenados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500">
                    <Archive className="mx-auto mb-3 opacity-20" size={48} />
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                productosFiltradosYOrdenados.map((prod) => (
                  <tr key={prod.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-slate-200 font-medium">{prod.nombre}</td>
                    <td className="p-4">
                      {prod.categoria ? (
                        <span className="bg-blue-900/30 text-blue-300 px-2.5 py-1 rounded-lg text-xs font-semibold border border-blue-500/20">
                          {prod.categoria.nombre}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs italic">Sin categoría</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-300">{formatoDinero(prod.precio_actual)}</td>
                    <td className="p-4">
                      <span className={`font-semibold ${prod.stock_actual <= 5 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {prod.stock_actual}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => setProductoPerdida(prod)}
                          className="p-1.5 bg-slate-800 text-amber-400 hover:text-amber-300 hover:bg-slate-700 rounded-lg transition-colors border border-white/5"
                          title="Registrar pérdida (roto, vencido, etc.)"
                          aria-label={`Registrar pérdida de ${prod.nombre}`}
                        >
                          <PackageX size={16} />
                        </button>
                        <button
                          onClick={() => { setProductoEditando(prod); setModalProductoAbierto(true); }}
                          className="p-1.5 bg-slate-800 text-blue-400 hover:text-blue-300 hover:bg-slate-700 rounded-lg transition-colors border border-white/5"
                          title="Editar producto"
                          aria-label={`Editar ${prod.nombre}`}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => iniciarEliminarProducto(prod)}
                          disabled={cargandoImpactoId === prod.id}
                          className="p-1.5 bg-slate-800 text-red-400 hover:text-red-300 hover:bg-slate-700 rounded-lg transition-colors border border-white/5 disabled:opacity-50"
                          title="Eliminar producto"
                          aria-label={`Eliminar ${prod.nombre}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Tarjetas (móvil) */}
        <div className="md:hidden flex-1 overflow-auto space-y-3 -mx-1 px-1">
          {cargando ? (
            <p className="p-8 text-center text-slate-500">Cargando...</p>
          ) : productosFiltradosYOrdenados.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Archive className="mx-auto mb-3 opacity-20" size={48} />
              No se encontraron productos
            </div>
          ) : (
            productosFiltradosYOrdenados.map((prod) => (
              <div key={prod.id} className="bg-slate-900/40 border border-white/5 rounded-xl p-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-slate-100 font-semibold truncate">{prod.nombre}</p>
                    <div className="mt-1.5">
                      {prod.categoria ? (
                        <span className="bg-blue-900/30 text-blue-300 px-2.5 py-1 rounded-lg text-xs font-semibold border border-blue-500/20">
                          {prod.categoria.nombre}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs italic">Sin categoría</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setProductoPerdida(prod)}
                      className="p-2 bg-slate-800 text-amber-400 hover:text-amber-300 hover:bg-slate-700 rounded-lg transition-colors border border-white/5"
                      aria-label={`Registrar pérdida de ${prod.nombre}`}
                    >
                      <PackageX size={16} />
                    </button>
                    <button
                      onClick={() => { setProductoEditando(prod); setModalProductoAbierto(true); }}
                      className="p-2 bg-slate-800 text-blue-400 hover:text-blue-300 hover:bg-slate-700 rounded-lg transition-colors border border-white/5"
                      aria-label={`Editar ${prod.nombre}`}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => iniciarEliminarProducto(prod)}
                      disabled={cargandoImpactoId === prod.id}
                      className="p-2 bg-slate-800 text-red-400 hover:text-red-300 hover:bg-slate-700 rounded-lg transition-colors border border-white/5 disabled:opacity-50"
                      aria-label={`Eliminar ${prod.nombre}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/5">
                  <span className="text-slate-300 font-medium">{formatoDinero(prod.precio_actual)}</span>
                  <span className="text-xs text-slate-500">
                    Stock:{' '}
                    <span className={`font-semibold ${prod.stock_actual <= 5 ? 'text-red-400' : 'text-emerald-400'}`}>
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
