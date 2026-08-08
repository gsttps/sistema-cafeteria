import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Producto, Categoria, ProductoImpacto } from '../../types';
import { servicioProducto, servicioCategoria } from '../../services/api';
import Menu from '../../components/ui/Menu';
import Boton from '../../components/ui/Boton';
import Campo from '../../components/ui/Campo';
import Modal from '../../components/ui/Modal';
import ModalImpactoProducto from './ModalImpactoProducto';

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

  // Impacto en clientes al cambiar el precio de un producto ya en uso
  const [impactoPrecio, setImpactoPrecio] = useState<ProductoImpacto | null>(null);
  const [payloadPendiente, setPayloadPendiente] = useState<Record<string, unknown> | null>(null);

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
      setImpactoPrecio(null);
      setPayloadPendiente(null);
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

  const guardarProducto = async (payload: Record<string, unknown>) => {
    setCargando(true);
    setError(null);
    try {
      if (productoEditar) {
        await servicioProducto.actualizar(productoEditar.id, payload);
        if (payload.actualizar_precios_abiertos) {
          toast.success('Precio actualizado también en los consumos de cuentas abiertas.');
        }
      } else {
        await servicioProducto.crear(payload as Omit<Producto, 'id' | 'estado'>);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al guardar el producto');
    } finally {
      setCargando(false);
      setImpactoPrecio(null);
      setPayloadPendiente(null);
    }
  };

  const handleGuardar = async () => {
    if (!nombre.trim() || precioActual === '') {
      setError('Completá los campos requeridos (nombre y precio).');
      return;
    }

    const payload = {
      nombre: nombre.trim(),
      precio_actual: Number(precioActual),
      stock_actual: Number(stockActual),
      categoria_id: categoriaId === 'ninguna' ? null : categoriaId,
    };

    const precioCambio = productoEditar != null && Number(precioActual) !== Number(productoEditar.precio_actual);
    if (!precioCambio) {
      guardarProducto(payload);
      return;
    }

    // El precio cambió y el producto ya existía: consultar si hay consumos
    // en cuentas abiertas antes de decidir si tocarlos o no
    setCargando(true);
    setError(null);
    try {
      const { data } = await servicioProducto.obtenerImpacto(productoEditar!.id);
      if (data.cuentas_abiertas.transacciones > 0) {
        setImpactoPrecio(data);
        setPayloadPendiente(payload);
        setCargando(false);
      } else {
        await guardarProducto({ ...payload, actualizar_precios_abiertos: false });
      }
    } catch (err) {
      console.error('Error al obtener impacto del producto:', err);
      // Sin impacto disponible, se guarda directo sin tocar históricos (comportamiento seguro por defecto)
      await guardarProducto({ ...payload, actualizar_precios_abiertos: false });
    }
  };

  return (
    <>
      <Modal
        abierto={isOpen}
        onCerrar={onClose}
        titulo={productoEditar ? 'Editar producto' : 'Nuevo producto'}
        ancho="sm"
        pie={
          <>
            <Boton variante="sutil" onClick={onClose}>
              Cancelar
            </Boton>
            <Boton variante="primario" onClick={handleGuardar} cargando={cargando} textoCargando="Guardando…">
              Guardar
            </Boton>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <p className="border-l-2 border-deuda bg-deuda-suave px-3 py-2 text-sm text-tinta">{error}</p>
          )}

          <Campo
            etiqueta="Nombre del producto"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Café americano"
          />

          <div className="grid grid-cols-2 gap-3">
            <Campo
              etiqueta="Precio"
              type="number"
              value={precioActual}
              onChange={(e) => setPrecioActual(e.target.value ? Number(e.target.value) : '')}
              placeholder="0"
              min="0"
            />
            <Campo
              etiqueta="Stock"
              type="number"
              value={stockActual}
              onChange={(e) => setStockActual(e.target.value ? Number(e.target.value) : '')}
              placeholder="0"
              min="0"
            />
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-tinta-tenue">
              Categoría
            </span>
            <Menu
              value={categoriaId}
              onChange={setCategoriaId}
              opciones={[
                { value: 'ninguna', label: 'Sin categoría' },
                ...categorias.map((c) => ({ value: c.id, label: c.nombre })),
              ]}
              className="w-full"
            />
          </div>
        </div>
      </Modal>

      <ModalImpactoProducto
        isOpen={!!impactoPrecio}
        modo="editar-precio"
        impacto={impactoPrecio}
        nested
        cargando={cargando}
        precioAnterior={productoEditar?.precio_actual}
        precioNuevo={typeof precioActual === 'number' ? precioActual : undefined}
        onConfirmar={(actualizarPreciosAbiertos) => {
          if (payloadPendiente) guardarProducto({ ...payloadPendiente, actualizar_precios_abiertos: actualizarPreciosAbiertos });
        }}
        onCancelar={() => { setImpactoPrecio(null); setPayloadPendiente(null); }}
      />
    </>
  );
};

export default ModalProducto;
