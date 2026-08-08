import { useState, useEffect } from 'react';
import { PackageX } from 'lucide-react';
import { toast } from 'sonner';
import { Producto } from '../../types';
import { servicioPerdida } from '../../services/api';
import Boton from '../../components/ui/Boton';
import Campo from '../../components/ui/Campo';
import Modal from '../../components/ui/Modal';

interface ModalPerdidaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  producto: Producto | null;
}

const ModalPerdida = ({ isOpen, onClose, onSuccess, producto }: ModalPerdidaProps) => {
  const [cantidad, setCantidad] = useState<number | ''>(1);
  const [motivo, setMotivo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCantidad(1);
      setMotivo('');
      setError(null);
    }
  }, [isOpen]);

  const handleRegistrar = async () => {
    if (!producto) return;
    if (cantidad === '' || Number(cantidad) < 1) {
      setError('La cantidad debe ser al menos 1');
      return;
    }

    setCargando(true);
    setError(null);

    try {
      await servicioPerdida.crear({
        producto_id: producto.id,
        cantidad: Number(cantidad),
        motivo: motivo.trim() || undefined,
      });
      toast.success(`Pérdida registrada: ${cantidad} × ${producto.nombre}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al registrar la pérdida');
    } finally {
      setCargando(false);
    }
  };

  if (!producto) return null;

  return (
    <Modal
      abierto={isOpen}
      onCerrar={onClose}
      titulo="Registrar pérdida"
      ancho="sm"
      pie={
        <>
          <Boton variante="sutil" onClick={onClose}>
            Cancelar
          </Boton>
          <Boton variante="primario" onClick={handleRegistrar} cargando={cargando} textoCargando="Registrando…">
            <PackageX size={15} /> Registrar pérdida
          </Boton>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <p className="border-l-2 border-deuda bg-deuda-suave px-3 py-2 text-sm text-tinta">{error}</p>
        )}

        <div className="rounded border border-borde bg-superficie px-3 py-2">
          <p className="text-[0.6875rem] uppercase tracking-wide text-tinta-tenue">Producto</p>
          <p className="text-sm text-tinta">{producto.nombre}</p>
          <p className="mt-0.5 text-xs text-tinta-tenue">Stock actual: {producto.stock_actual}</p>
        </div>

        <Campo
          etiqueta="Cantidad perdida"
          type="number"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value ? Number(e.target.value) : '')}
          min="1"
        />
        <Campo
          etiqueta="Motivo"
          type="text"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej. se rompió, vencido, derramado…"
          maxLength={200}
        />

        <p className="text-xs text-tinta-tenue">
          Se descuenta del stock y queda en el historial de pérdidas.
        </p>
      </div>
    </Modal>
  );
};

export default ModalPerdida;
