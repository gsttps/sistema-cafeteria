import Boton from './ui/Boton';
import Modal from './ui/Modal';

interface ModalConfirmacionProps {
  isOpen: boolean;
  titulo?: string;
  mensaje: string;
  textoConfirmar?: string;
  peligroso?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

function ModalConfirmacion({
  isOpen,
  titulo = 'Confirmar acción',
  mensaje,
  textoConfirmar = 'Confirmar',
  peligroso = false,
  onConfirmar,
  onCancelar,
}: ModalConfirmacionProps) {
  return (
    <Modal
      abierto={isOpen}
      onCerrar={onCancelar}
      titulo={titulo}
      ancho="sm"
      anidado
      pie={
        <>
          <Boton variante="sutil" onClick={onCancelar}>
            Cancelar
          </Boton>
          <Boton variante={peligroso ? 'peligro' : 'primario'} onClick={onConfirmar}>
            {textoConfirmar}
          </Boton>
        </>
      }
    >
      <p className="text-sm text-tinta-suave">{mensaje}</p>
    </Modal>
  );
}

export default ModalConfirmacion;
