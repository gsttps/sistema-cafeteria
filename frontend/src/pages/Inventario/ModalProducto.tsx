import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Producto, Categoria } from '../../types';
import { servicioProducto, servicioCategoria } from '../../services/api';
import SelectorPremium from '../../components/SelectorPremium';

interface ModalProductoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productoEditar?: Producto | null;
}

const ModalProducto = ({ isOpen, onClose, onSuccess, productoEditar }: ModalProductoProps) => {
  const [nombre, setNombre] = useState('');
  const [precioActual, setPrecioActual] = useState<number | ''>('');
  const [stockActual, setStockActual] = useState<number | ''>(0);
  const [categoriaId, setCategoriaId] = useState<string>('ninguna');
  
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      cargarCategorias();
      if (productoEditar) {
        setNombre(productoEditar.nombre);
        setPrecioActual(productoEditar.precio_actual);
        setStockActual(productoEditar.stock_actual ?? 0);
        setCategoriaId(productoEditar.categoria_id || 'ninguna');
      } else {
        setNombre('');
        setPrecioActual('');
        setStockActual(0);
        setCategoriaId('ninguna');
      }
      setError(null);
    }
  }, [isOpen, productoEditar]);

  const cargarCategorias = async () => {
    try {
      const resp = await servicioCategoria.obtenerTodos();
      setCategorias(resp.data);
    } catch (err) {
      console.error("Error al cargar categorías", err);
    }
  };

  const handleGuardar = async () => {
    if (!nombre.trim() || precioActual === '') {
      setError('Por favor, completa los campos requeridos (Nombre y Precio)');
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const payload = {
        nombre: nombre.trim(),
        precio_actual: Number(precioActual),
        stock_actual: Number(stockActual),
        categoria_id: categoriaId === 'ninguna' ? null : categoriaId
      };

      if (productoEditar) {
        await servicioProducto.actualizar(productoEditar.id, payload);
      } else {
        await servicioProducto.crear(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al guardar el producto');
    } finally {
      setCargando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="bg-[#0b1120] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative z-10 anim-slide-in">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
          <h2 className="text-xl font-bold text-slate-100">
            {productoEditar ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-400 text-sm font-semibold mb-2">
              Nombre del Producto *
            </label>
            <input 
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="input-premium"
              placeholder="Ej. Café Americano"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm font-semibold mb-2">
                Precio ($) *
              </label>
              <input 
                type="number"
                value={precioActual}
                onChange={(e) => setPrecioActual(e.target.value ? Number(e.target.value) : '')}
                className="input-premium"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm font-semibold mb-2">
                Stock / Cantidad
              </label>
              <input 
                type="number"
                value={stockActual}
                onChange={(e) => setStockActual(e.target.value ? Number(e.target.value) : '')}
                className="input-premium"
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-sm font-semibold mb-2">
              Categoría
            </label>
            <SelectorPremium
              value={categoriaId}
              onChange={setCategoriaId}
              opciones={[
                { value: 'ninguna', label: 'Sin Categoría' },
                ...categorias.map(c => ({ value: c.id, label: c.nombre }))
              ]}
              className="w-full"
            />
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-slate-900/30 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-300 font-medium hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleGuardar}
            disabled={cargando}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl transition-colors font-medium flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            <Save size={18} />
            {cargando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalProducto;
