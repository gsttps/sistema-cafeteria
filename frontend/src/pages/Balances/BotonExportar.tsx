import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { servicioBalances } from '../../services/api';
import { descargarBlob, leerErrorDeBlob, nombreDesdeCabecera } from '../../utils/descargas';
import Boton from '../../components/ui/Boton';

interface BotonExportarProps {
  mes: number;
  anio: number;
  deshabilitado?: boolean;
}

const BotonExportar = ({ mes, anio, deshabilitado = false }: BotonExportarProps) => {
  const [exportando, setExportando] = useState(false);

  const exportar = async () => {
    setExportando(true);
    try {
      const resp = await servicioBalances.exportarExcel(mes, anio);
      const nombre =
        nombreDesdeCabecera(resp.headers['content-disposition']) ??
        `Balance_${anio}-${String(mes).padStart(2, '0')}.xlsx`;
      descargarBlob(resp.data, nombre);
      toast.success('Excel descargado');
    } catch (err: any) {
      const detalle = await leerErrorDeBlob(err?.response?.data);
      toast.error(detalle ?? 'No se pudo generar el Excel');
    } finally {
      setExportando(false);
    }
  };

  return (
    <Boton variante="primario" onClick={exportar} disabled={deshabilitado || exportando}>
      {exportando ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
      {exportando ? 'Generando Excel…' : 'Exportar Excel'}
    </Boton>
  );
};

export default BotonExportar;
