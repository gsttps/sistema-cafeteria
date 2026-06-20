import { useState, useEffect, useRef } from 'react';
import { servicioAuth } from '../../services/api';
import { Settings, Lock, Image as ImageIcon, Coffee, Trash2, Upload } from 'lucide-react';

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
      mostrarAlerta('exito', `Nombre de usuario cambiado a "${nuevoUsername}" exitosamente.`);
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
      mostrarAlerta('exito', 'Contraseña actualizada exitosamente.');
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
      mostrarAlerta('exito', 'Logo actualizado exitosamente.');
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

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col anim-fade-in">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight m-0">
          Panel de Administración
        </h1>
      </div>

      {mensaje && (
        <div className={`p-4 rounded-xl mb-6 font-semibold text-sm border anim-slide-in ${
          mensaje.tipo === 'exito' 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
        }`}>
          {mensaje.texto}
        </div>
      )}

      <div className="flex flex-col gap-6 anim-fade-in">
        {/* SECCIÓN: Cambiar Nombre de Usuario */}
        <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700 p-5 sm:p-8 shadow-xl shadow-black/20">
          <h3 className="m-0 mb-2 text-slate-100 text-xl font-bold flex items-center gap-2">
            <Settings size={20} className="text-blue-500" /> Cambiar Nombre de Usuario
          </h3>
          <p className="text-slate-400 text-sm mb-6">
            Se requiere la contraseña actual para confirmar el cambio.
          </p>
          <form onSubmit={guardarNuevoUsername} className="flex flex-col gap-5 max-w-md">
            <div>
              <label className="block mb-2 font-semibold text-slate-400 text-sm">Contraseña Actual</label>
              <input
                type="password"
                value={passActualUser}
                onChange={(e) => setPassActualUser(e.target.value)}
                placeholder="Ingrese su contraseña actual"
                required
                autoComplete="current-password"
                className="input-premium"
              />
            </div>
            <div>
              <label className="block mb-2 font-semibold text-slate-400 text-sm">Nuevo Nombre de Usuario</label>
              <input
                type="text"
                value={nuevoUsername}
                onChange={(e) => setNuevoUsername(e.target.value)}
                placeholder="Ingrese el nuevo nombre de usuario"
                required
                minLength={3}
                maxLength={50}
                autoComplete="username"
                className="input-premium"
              />
            </div>
            <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-blue-500/20 mt-2">
              Guardar Nombre de Usuario
            </button>
          </form>
        </div>

        {/* SECCIÓN: Cambiar Contraseña */}
        <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700 p-5 sm:p-8 shadow-xl shadow-black/20">
          <h3 className="m-0 mb-2 text-slate-100 text-xl font-bold flex items-center gap-2">
            <Lock size={20} className="text-blue-500" /> Cambiar Contraseña
          </h3>
          <p className="text-slate-400 text-sm mb-6">
            Debe ingresar la contraseña actual y luego la nueva contraseña dos veces para confirmar.
          </p>
          <form onSubmit={guardarNuevaPassword} className="flex flex-col gap-5 max-w-md">
            <div>
              <label className="block mb-2 font-semibold text-slate-400 text-sm">Contraseña Actual</label>
              <input
                type="password"
                value={passActualPass}
                onChange={(e) => setPassActualPass(e.target.value)}
                placeholder="Ingrese su contraseña actual"
                required
                autoComplete="current-password"
                className="input-premium"
              />
            </div>
            <div>
              <label className="block mb-2 font-semibold text-slate-400 text-sm">Nueva Contraseña</label>
              <input
                type="password"
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                required
                minLength={4}
                autoComplete="new-password"
                className="input-premium"
              />
            </div>
            <div>
              <label className="block mb-2 font-semibold text-slate-400 text-sm">Confirmar Nueva Contraseña</label>
              <input
                type="password"
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                placeholder="Repita la nueva contraseña"
                required
                minLength={4}
                autoComplete="new-password"
                className={`input-premium ${
                  confirmarPassword && confirmarPassword !== nuevaPassword ? '!border-rose-500 !ring-rose-500/50' : ''
                }`}
              />
              {confirmarPassword && confirmarPassword !== nuevaPassword && (
                <p className="text-rose-400 text-sm mt-2 font-semibold anim-fade-in">
                  Las contraseñas no coinciden
                </p>
              )}
            </div>
            <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-blue-500/20 mt-2">
              Guardar Nueva Contraseña
            </button>
          </form>
        </div>

        {/* SECCIÓN: Logo de Login */}
        <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700 p-5 sm:p-8 shadow-xl shadow-black/20">
          <h3 className="m-0 mb-2 text-slate-100 text-xl font-bold flex items-center gap-2">
            <ImageIcon size={20} className="text-blue-500" /> Logo de Pantalla de Login
          </h3>
          <p className="text-slate-400 text-sm mb-6">
            Sube una imagen JPG o PNG que se mostrará en la pantalla de inicio de sesión.
          </p>

          <div className="flex gap-8 flex-wrap items-start">
            {/* Preview */}
            <div className="w-40 h-40 rounded-2xl border-2 border-dashed border-slate-600 flex items-center justify-center overflow-hidden bg-slate-900/50 shrink-0">
              {logoPreview ? (
                <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : tieneLogo ? (
                <img
                  src={servicioAuth.obtenerLogoUrl() + '?t=' + Date.now()}
                  alt="Logo actual"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center text-slate-500">
                  <div className="flex justify-center mb-2">
                    <Coffee size={40} className="opacity-50" />
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider">Sin logo</div>
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="flex flex-col gap-3">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={subirLogoHandler}
                className="hidden"
              />
              <button
                onClick={() => logoInputRef.current?.click()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
              >
                <Upload size={18} /> Subir Imagen
              </button>

              {tieneLogo && (
                <button
                  onClick={eliminarLogoHandler}
                  className="px-6 py-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 size={18} /> Eliminar Logo
                </button>
              )}

              <p className="text-slate-500 text-xs m-0 max-w-[250px] leading-relaxed mt-2">
                Formatos: JPG, PNG. Se mostrará en la pantalla de login.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PanelAdmin;
