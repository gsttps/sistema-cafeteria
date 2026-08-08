import { useState } from 'react';
import { servicioAuth } from '../../services/api';
import { Usuario } from '../../types';
import Boton from '../../components/ui/Boton';
import Campo from '../../components/ui/Campo';
import suyaiLogo from '../../assets/suyai-logo.png';

interface InicioSesionProps {
  onLoginExitoso: (usuario: Usuario) => void;
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
      const respMe = await servicioAuth.verificar();
      onLoginExitoso(respMe.data as Usuario);
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
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src={suyaiLogo} alt="Suyai Coffee" className="mb-4 w-48" />
          <h1 className="text-lg font-semibold tracking-tight text-tinta">Sistema Cafetería</h1>
          <p className="mt-1 text-xs uppercase tracking-wide text-tinta-tenue">Gestión de cuentas</p>
        </div>

        {/* Filete de latón arriba: la misma marca que el header, sin más adorno. */}
        <div className="rounded-lg border-t-2 border-acento bg-superficie-elevada p-6 shadow-xl shadow-black/30">
          {error && (
            <p className="mb-4 border-l-2 border-deuda bg-deuda-suave px-3 py-2 text-sm text-tinta">
              {error}
            </p>
          )}

          <form onSubmit={iniciarSesion} className="space-y-4">
            <Campo
              etiqueta="Usuario"
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
            <Campo
              etiqueta="Contraseña"
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <Boton
              variante="primario"
              ancho
              type="submit"
              cargando={cargando}
              textoCargando="Ingresando…"
              className="mt-2"
            >
              Ingresar
            </Boton>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-tinta-tenue">Rozas &amp; Bornes SPA</p>
      </div>
    </div>
  );
}

export default InicioSesion;
