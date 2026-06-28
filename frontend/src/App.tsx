import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Toaster } from 'sonner';
import { servicioAuth, configurarCallbackSesionExpirada } from './services/api';
import InicioSesion from './pages/InicioSesion/InicioSesion';
import { LogOut, Menu, X, ShieldAlert } from 'lucide-react';
import { Usuario } from './types';

const PanelAtencion = lazy(() => import('./pages/PanelAtencion/PanelAtencion'));
const PanelAdmin    = lazy(() => import('./pages/PanelAdmin/PanelAdmin'));
const Balances      = lazy(() => import('./pages/Balances/Balances'));
const Inventario    = lazy(() => import('./pages/Inventario/Inventario'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full py-20">
      <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" />
    </div>
  );
}

function AccesoRestringido() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-20 anim-fade-in">
      <ShieldAlert size={52} className="text-slate-500 mb-4" />
      <h2 className="text-xl font-bold text-slate-200">Acceso Restringido</h2>
      <p className="text-slate-400 mt-2 text-sm">Esta sección es solo para administradores.</p>
    </div>
  );
}

function App() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

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

  if (autenticado === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-animated-mesh font-sans">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-[pulse_1.5s_ease-in-out_infinite]">☕</div>
          <p className="text-slate-400 text-sm font-medium">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!autenticado) {
    return (
      <>
        <InicioSesion onLoginExitoso={(u: Usuario) => { setUsuario(u); setAutenticado(true); }} />
        <Toaster position="bottom-right" richColors theme="dark" />
      </>
    );
  }

  const esAdmin = usuario?.rol === 'admin';

  const navItems = [
    { to: '/', label: 'Atención' },
    ...(esAdmin ? [{ to: '/admin', label: 'Panel Admin' }, { to: '/balances', label: 'Balances' }] : []),
    { to: '/inventario', label: 'Inventario' },
  ];

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 font-semibold text-sm rounded-xl transition-all duration-300 no-underline block ${
      isActive
        ? 'bg-blue-600/10 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)] border border-blue-500/20'
        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
    }`;

  return (
    <Router>
      <div className="app-container font-sans min-h-screen flex flex-col bg-animated-mesh text-slate-100">
        <header className="px-4 sm:px-8 py-4 sm:py-5 bg-[#0b1120]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between sticky top-0 z-header shadow-sm">
          <span className="font-extrabold text-lg sm:text-xl bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent tracking-tight">☕ Sistema Cafetería</span>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-4">
            <nav className="flex gap-2 bg-slate-900/40 p-1.5 rounded-2xl border border-white/5">
              {navItems.map(item => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navLinkClass}>
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <button
              onClick={cerrarSesion}
              className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 rounded-lg cursor-pointer font-semibold text-sm transition-all flex items-center gap-2"
            >
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="md:hidden p-2 text-slate-300 hover:text-slate-100 transition-colors"
            aria-label="Abrir menú"
          >
            {menuAbierto ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Mobile nav overlay */}
        {menuAbierto && (
          <div className="md:hidden fixed inset-0 top-[60px] bg-[#0b1120]/95 backdrop-blur-xl z-30 anim-fade-in">
            <nav className="flex flex-col gap-2 p-6">
              {navItems.map(item => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navLinkClass} onClick={() => setMenuAbierto(false)}>
                  {item.label}
                </NavLink>
              ))}
              <hr className="border-slate-700/50 my-4" />
              <button
                onClick={() => { cerrarSesion(); setMenuAbierto(false); }}
                className="px-4 py-3 bg-red-900/20 hover:bg-red-900/40 text-red-400 hover:text-red-300 border border-red-500/30 rounded-xl cursor-pointer font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={16} /> Cerrar Sesión
              </button>
            </nav>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<PanelAtencion />} />
              <Route path="/admin" element={esAdmin ? <PanelAdmin /> : <AccesoRestringido />} />
              <Route path="/balances" element={esAdmin ? <Balances /> : <AccesoRestringido />} />
              <Route path="/inventario" element={<Inventario />} />
            </Routes>
          </Suspense>
        </main>

        <Toaster position="bottom-right" richColors theme="dark" />
      </div>
    </Router>
  );
}

export default App;
