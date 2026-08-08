import { useState, useEffect, useRef } from 'react';
import { servicioAuth } from '../../services/api';
import { Coffee, Trash2, Upload } from 'lucide-react';
import Boton from '../../components/ui/Boton';
import Campo from '../../components/ui/Campo';
import Tarjeta from '../../components/ui/Tarjeta';

function PanelAdmin() {
  // Estados de Configuración de Cuenta
  const [passActualUser, setPassActualUser] = useState('');
  const [nuevoUsername, setNuevoUsername] = useState('');
  const [passActualPass, setPassActualPass] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [tieneLogo, setTieneLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Generales
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // Verificar si existe un logo
  const verificarLogo = () => {
    const img = new Image();
    img.onload = () => setTieneLogo(true);
    img.onerror = () => setTieneLogo(false);
    img.src = servicioAuth.obtenerLogoUrl() + '?t=' + Date.now();
  };

  useEffect(() => {
    verificarLogo();
  }, []);

  const mostrarAlerta = (tipo: 'exito' | 'error', texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 4000);
  };

  // --- CONFIGURACIÓN ACCIONES ---
  const guardarNuevoUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passActualUser.trim() || !nuevoUsername.trim()) return;

    try {
      await servicioAuth.cambiarUsername(passActualUser, nuevoUsername);
      mostrarAlerta('exito', `Nombre de usuario cambiado a "${nuevoUsername}".`);
      setPassActualUser('');
      setNuevoUsername('');
    } catch (error: any) {
      const detalle = error.response?.data?.detail || 'Error al cambiar el nombre de usuario.';
      mostrarAlerta('error', detalle);
    }
  };

  const guardarNuevaPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passActualPass.trim() || !nuevaPassword.trim()) return;

    if (nuevaPassword !== confirmarPassword) {
      mostrarAlerta('error', 'Las contraseñas nuevas no coinciden.');
      return;
    }
    if (nuevaPassword.length < 4) {
      mostrarAlerta('error', 'La contraseña nueva debe tener al menos 4 caracteres.');
      return;
    }

    try {
      await servicioAuth.cambiarPassword(passActualPass, nuevaPassword);
      mostrarAlerta('exito', 'Contraseña actualizada.');
      setPassActualPass('');
      setNuevaPassword('');
      setConfirmarPassword('');
    } catch (error: any) {
      const detalle = error.response?.data?.detail || 'Error al cambiar la contraseña.';
      mostrarAlerta('error', detalle);
    }
  };

  const subirLogoHandler = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    if (!['image/jpeg', 'image/png'].includes(archivo.type)) {
      mostrarAlerta('error', 'Solo se permiten archivos JPG o PNG.');
      return;
    }

    // Preview local
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(archivo);

    try {
      await servicioAuth.subirLogo(archivo);
      mostrarAlerta('exito', 'Logo actualizado.');
      setTieneLogo(true);
    } catch (error) {
      console.error('Error al subir logo:', error);
      mostrarAlerta('error', 'Error al subir el logo.');
      setLogoPreview(null);
    }
  };

  const eliminarLogoHandler = async () => {
    try {
      await servicioAuth.eliminarLogo();
      mostrarAlerta('exito', 'Logo eliminado. Se usará el ícono por defecto.');
      setTieneLogo(false);
      setLogoPreview(null);
    } catch (error) {
      console.error('Error al eliminar logo:', error);
      mostrarAlerta('error', 'Error al eliminar el logo.');
    }
  };

  const errorContrasenas = confirmarPassword !== '' && confirmarPassword !== nuevaPassword;

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight text-tinta">Administración</h1>

      {mensaje && (
        <p
          className={`border-l-2 px-3 py-2 text-sm ${
            mensaje.tipo === 'exito'
              ? 'border-pagado bg-pagado-suave text-tinta'
              : 'border-deuda bg-deuda-suave text-tinta'
          }`}
        >
          {mensaje.texto}
        </p>
      )}

      <Tarjeta titulo="Nombre de usuario">
        <p className="mb-4 text-sm text-tinta-suave">
          Se requiere la contraseña actual para confirmar el cambio.
        </p>
        <form onSubmit={guardarNuevoUsername} className="max-w-sm space-y-4">
          <Campo
            etiqueta="Contraseña actual"
            type="password"
            value={passActualUser}
            onChange={(e) => setPassActualUser(e.target.value)}
            required
            autoComplete="current-password"
          />
          <Campo
            etiqueta="Nuevo nombre de usuario"
            type="text"
            value={nuevoUsername}
            onChange={(e) => setNuevoUsername(e.target.value)}
            required
            minLength={3}
            maxLength={50}
            autoComplete="username"
          />
          <Boton variante="primario" type="submit">
            Guardar nombre de usuario
          </Boton>
        </form>
      </Tarjeta>

      <Tarjeta titulo="Contraseña">
        <p className="mb-4 text-sm text-tinta-suave">
          Ingresá la contraseña actual y la nueva dos veces para confirmar.
        </p>
        <form onSubmit={guardarNuevaPassword} className="max-w-sm space-y-4">
          <Campo
            etiqueta="Contraseña actual"
            type="password"
            value={passActualPass}
            onChange={(e) => setPassActualPass(e.target.value)}
            required
            autoComplete="current-password"
          />
          <Campo
            etiqueta="Nueva contraseña"
            type="password"
            value={nuevaPassword}
            onChange={(e) => setNuevaPassword(e.target.value)}
            placeholder="Mínimo 4 caracteres"
            required
            minLength={4}
            autoComplete="new-password"
          />
          <Campo
            etiqueta="Confirmar nueva contraseña"
            type="password"
            value={confirmarPassword}
            onChange={(e) => setConfirmarPassword(e.target.value)}
            required
            minLength={4}
            autoComplete="new-password"
            error={errorContrasenas}
            nota={errorContrasenas ? 'Las contraseñas no coinciden.' : undefined}
          />
          <Boton variante="primario" type="submit">
            Guardar nueva contraseña
          </Boton>
        </form>
      </Tarjeta>

      <Tarjeta titulo="Logo de la pantalla de ingreso">
        <p className="mb-4 text-sm text-tinta-suave">
          Imagen JPG o PNG que se muestra en la pantalla de inicio de sesión.
        </p>

        <div className="flex flex-wrap items-start gap-6">
          <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded border border-dashed border-borde-fuerte bg-superficie">
            {logoPreview ? (
              <img src={logoPreview} alt="" className="h-full w-full object-cover" />
            ) : tieneLogo ? (
              <img
                src={servicioAuth.obtenerLogoUrl() + '?t=' + Date.now()}
                alt="Logo actual"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-center text-tinta-tenue">
                <Coffee size={28} className="mx-auto mb-2" />
                <div className="text-[0.6875rem] uppercase tracking-wide">Sin logo</div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={subirLogoHandler}
              className="hidden"
            />
            <Boton variante="secundario" onClick={() => logoInputRef.current?.click()}>
              <Upload size={15} /> Subir imagen
            </Boton>

            {tieneLogo && (
              <Boton variante="peligro" onClick={eliminarLogoHandler}>
                <Trash2 size={15} /> Eliminar logo
              </Boton>
            )}

            <p className="mt-1 max-w-[220px] text-xs text-tinta-tenue">
              Formatos JPG o PNG. Se muestra en la pantalla de ingreso.
            </p>
          </div>
        </div>
      </Tarjeta>
    </div>
  );
}

export default PanelAdmin;
