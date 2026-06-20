import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { servicioAuth } from './services/api';
import InicioSesion from './pages/InicioSesion/InicioSesion';
import PanelAtencion from './pages/PanelAtencion/PanelAtencion';
import PanelAdmin from './pages/PanelAdmin/PanelAdmin';
import Balances from './pages/Balances/Balances';
import Inventario from './pages/Inventario/Inventario';
import { LogOut, Menu, X } from 'lucide-react';

function App() {
  // null = verificando, false = no autenticado, true = autenticado
  const [autenticado, setAutenticado] = useState<boolean | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  useEffect(() => {
    servicioAuth.verificar()
      .then(() => setAutenticado(true))
      .catch(() => setAutenticado(false));
  }, []);

  const cerrarSesion = async () => {
    try {
      await servicioAuth.logout();
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
    }
    setAutenticado(false);
  };

  // Pantalla de carga mientras se verifica la sesión
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

  // Pantalla de login si no está autenticado
  if (!autenticado) {
    return <InicioSesion onLoginExitoso={() => setAutenticado(true)} />;
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 font-semibold text-sm rounded-xl transition-all duration-300 no-underline block ${
      isActive
        ? 'bg-blue-600/10 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)] border border-blue-500/20'
        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
    }`;

  // App principal (autenticado, modo oscuro forzado)
  return (
    <Router>
      <div className="app-container font-sans min-h-screen flex flex-col bg-animated-mesh text-slate-100">
        <header className="px-4 sm:px-8 py-4 sm:py-5 bg-[#0b1120]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between sticky top-0 z-50 shadow-sm">
          <span className="font-extrabold text-lg sm:text-xl bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent tracking-tight">☕ Sistema Cafetería</span>
          
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-4">
            <nav className="flex gap-2 bg-slate-900/40 p-1.5 rounded-2xl border border-white/5">
              <NavLink to="/" className={navLinkClass}>
                Atención
              </NavLink>
              <NavLink to="/admin" className={navLinkClass}>
                Panel Admin
              </NavLink>
              <NavLink to="/balances" className={navLinkClass}>
                Balances
              </NavLink>
              <NavLink to="/inventario" className={navLinkClass}>
                Inventario
              </NavLink>
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
          >
            {menuAbierto ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Mobile nav overlay */}
        {menuAbierto && (
          <div className="md:hidden fixed inset-0 top-[60px] bg-[#0b1120]/95 backdrop-blur-xl z-40 anim-fade-in">
            <nav className="flex flex-col gap-2 p-6">
              <NavLink to="/" className={navLinkClass} onClick={() => setMenuAbierto(false)}>
                Atención
              </NavLink>
              <NavLink to="/admin" className={navLinkClass} onClick={() => setMenuAbierto(false)}>
                Panel Admin
              </NavLink>
              <NavLink to="/balances" className={navLinkClass} onClick={() => setMenuAbierto(false)}>
                Balances
              </NavLink>
              <NavLink to="/inventario" className={navLinkClass} onClick={() => setMenuAbierto(false)}>
                Inventario
              </NavLink>

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
          <Routes>
            <Route path="/" element={<PanelAtencion />} />
            <Route path="/admin" element={<PanelAdmin />} />
            <Route path="/balances" element={<Balances />} />
            <Route path="/inventario" element={<Inventario />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

