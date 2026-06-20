import { useState } from 'react';
import { servicioAuth } from '../../services/api';

interface InicioSesionProps {
  onLoginExitoso: () => void;
}

function InicioSesion({ onLoginExitoso }: InicioSesionProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const iniciarSesion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Complete ambos campos.');
      return;
    }

    setCargando(true);
    setError('');

    try {
      await servicioAuth.login(username, password);
      // El backend establece la cookie HttpOnly automáticamente


      onLoginExitoso();
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Usuario o contraseña incorrectos, intente nuevamente.');
      } else {
        setError('Error de conexión. Verifique que el servidor esté activo.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-animated-mesh relative overflow-hidden anim-fade-in">
      {/* Fondo decorativo (blob) */}
      <div className="absolute w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[100px] -top-64 -left-64 pointer-events-none" />
      <div className="absolute w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[80px] -bottom-32 -right-32 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center px-4">
        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-black/40 overflow-hidden">
            <img 
              src={`${servicioAuth.obtenerLogoUrl()}?t=${Date.now()}`}
              alt="Logo"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<span class="text-3xl">☕</span>';
              }}
            />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-100 mb-2 tracking-tight">
            Sistema Cafetería
          </h1>
          <p className="text-slate-400 font-medium tracking-wide text-sm uppercase">
            Gestión de Cuentas
          </p>
        </div>

        {/* Card del formulario */}
        <div className="w-full bg-[#0b1120]/60 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <h2 className="text-2xl font-bold text-slate-100 mb-8 text-center tracking-tight">
            Iniciar Sesión
          </h2>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl mb-6 text-sm font-medium text-center anim-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={iniciarSesion} className="space-y-5">
            <div>
              <label htmlFor="login-username" className="block text-sm font-semibold text-slate-300 mb-2">
                Usuario
              </label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingrese su usuario"
                autoComplete="username"
                autoFocus
                className="input-premium"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-semibold text-slate-300 mb-2">
                Contraseña
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña"
                autoComplete="current-password"
                className="input-premium"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className={`w-full py-3.5 mt-2 rounded-xl text-white font-bold text-sm tracking-wide transition-all shadow-lg ${
                cargando 
                  ? 'bg-blue-600/50 cursor-not-allowed shadow-none' 
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/25 active:scale-[0.98]'
              }`}
            >
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-8 text-slate-500 text-sm font-medium">
          Rozas & Bornes SPA
        </p>
      </div>
    </div>
  );
}

export default InicioSesion;
