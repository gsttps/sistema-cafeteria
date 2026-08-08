import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Toaster } from 'sonner';
import { servicioAuth, configurarCallbackSesionExpirada } from './services/api';
import InicioSesion from './pages/InicioSesion/InicioSesion';
import { LogOut, Menu, X, ShieldAlert } from 'lucide-react';
import { Usuario } from './types';
import suyaiLogo from './assets/suyai-logo.png';

const PanelAtencion = lazy(() => import('./pages/PanelAtencion/PanelAtencion'));
const PanelAdmin    = lazy(() => import('./pages/PanelAdmin/PanelAdmin'));
const Balances      = lazy(() => import('./pages/Balances/Balances'));
const Inventario    = lazy(() => import('./pages/Inventario/Inventario'));

function Cargador({ etiqueta }: { etiqueta?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-20">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-borde-fuerte border-t-acento" />
      {etiqueta && <p className="text-sm text-tinta-tenue">{etiqueta}</p>}
    </div>
  );
}

function AccesoRestringido() {
  return (
    <div className="flex h-full flex-col items-center justify-center py-20 text-center">
      <ShieldAlert size={32} className="mb-3 text-tinta-tenue" />
      <h2 className="text-base font-semibold text-tinta">Sección restringida</h2>
      <p className="mt-1 text-sm text-tinta-suave">Solo los administradores pueden entrar acá.</p>
    </div>
  );
}

function App() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    // Registrar callback: si el interceptor detecta 401, cerrar sesión
    configurarCallbackSesionExpirada(() => {
      setUsuario(null);
      setAutenticado(false);
    });

    servicioAuth.verificar()
      .then((resp) => {
        setUsuario(resp.data as Usuario);
        setAutenticado(true);
      })
      .catch(() => setAutenticado(false));
  }, []);

  const cerrarSesion = async () => {
    try {
      await servicioAuth.logout();
    } catch {
      // ignorar error de logout
    }
    setUsuario(null);
    setAutenticado(false);
  };

  // Una sola instancia para toda la app, sin importar el estado de sesión.
  const avisos = <Toaster position="bottom-right" richColors theme="dark" />;

  if (autenticado === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Cargador etiqueta="Verificando sesión…" />
      </div>
    );
  }

  if (!autenticado) {
    return (
      <>
        <InicioSesion onLoginExitoso={(u: Usuario) => { setUsuario(u); setAutenticado(true); }} />
        {avisos}
      </>
    );
  }

  const esAdmin = usuario?.rol === 'admin';

  const navItems = [
    { to: '/', label: 'Atención' },
    ...(esAdmin ? [{ to: '/admin', label: 'Administración' }, { to: '/balances', label: 'Balances' }] : []),
    { to: '/inventario', label: 'Inventario' },
  ];

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded px-3 py-1.5 text-sm no-underline transition-colors duration-rapida ${
      isActive
        ? 'bg-acento-suave text-acento'
        : 'text-tinta-suave hover:bg-superficie-sutil hover:text-tinta'
    }`;

  return (
    <Router>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-header border-b border-borde bg-superficie">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            {/* Marca: el sello de Suyai y el nombre. Sin gradiente ni emoji. */}
            <span className="flex items-center gap-2.5">
              <img src={suyaiLogo} alt="Suyai Coffee" className="h-8 w-auto shrink-0" />
              <span className="text-sm font-semibold tracking-tight text-tinta">
                Sistema Cafetería
              </span>
            </span>

            <div className="hidden items-center gap-3 md:flex">
              <nav className="flex gap-1">
                {navItems.map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navLinkClass}>
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              <button
                type="button"
                onClick={cerrarSesion}
                className="flex items-center gap-2 rounded px-3 py-1.5 text-sm text-tinta-tenue transition-colors duration-rapida hover:bg-superficie-sutil hover:text-tinta"
              >
                <LogOut size={15} /> Salir
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMenuAbierto(!menuAbierto)}
              className="rounded p-1.5 text-tinta-suave transition-colors duration-rapida hover:bg-superficie-sutil hover:text-tinta md:hidden"
              aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuAbierto}
            >
              {menuAbierto ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Dentro del header: así no hace falta calcular a mano su altura. */}
          {menuAbierto && (
            <nav className="flex flex-col gap-1 border-t border-borde px-4 py-3 md:hidden">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={navLinkClass}
                  onClick={() => setMenuAbierto(false)}
                >
                  {item.label}
                </NavLink>
              ))}
              <button
                type="button"
                onClick={() => { cerrarSesion(); setMenuAbierto(false); }}
                className="mt-1 flex items-center gap-2 rounded border-t border-borde px-3 py-2 pt-3 text-sm text-tinta-tenue transition-colors duration-rapida hover:bg-superficie-sutil hover:text-tinta"
              >
                <LogOut size={15} /> Salir
              </button>
            </nav>
          )}
        </header>

        <main className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
          <Suspense fallback={<Cargador />}>
            <Routes>
              <Route path="/" element={<PanelAtencion />} />
              <Route path="/admin" element={esAdmin ? <PanelAdmin /> : <AccesoRestringido />} />
              <Route path="/balances" element={esAdmin ? <Balances /> : <AccesoRestringido />} />
              <Route path="/inventario" element={<Inventario />} />
            </Routes>
          </Suspense>
        </main>

        {avisos}
      </div>
    </Router>
  );
}

export default App;
