import { NavLink, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import ClienteDetalle from './pages/ClienteDetalle'
import Proyectos from './pages/Proyectos'
import Facturas from './pages/Facturas'
import Aging from './pages/Aging'
import HistorialClientes from './pages/HistorialClientes'
import { ToastProvider } from './components/Toast'

export default function App(){
return (
<div className="shell">
<aside className="sidebar">
<div className="brand">
<div className="logo">Σ</div>
<div>
<div className="brand-name">SIGE Cliente</div>
<div className="brand-sub">by Eliseo</div>
</div>
</div>
<nav className="menu">
<NavLink to="/" end>📊 Dashboard</NavLink>
<NavLink to="/clientes">👥 Clientes</NavLink>
<NavLink to="/proyectos">📁 Proyectos</NavLink>
<NavLink to="/facturas">🧾 Facturas</NavLink>
<NavLink to="/aging">⏱️ Aging</NavLink>
</nav>
<div className="sidebar-footer">SGI v1.0</div>
</aside>
<div className="content">
<header className="topbar">
<div className="top-actions">
<input placeholder="Buscar… (Cmd+/)" className="search"/>
</div>
</header>
<main className="container">
<ToastProvider>
<Routes>
<Route path="/" element={<Dashboard/>} />
<Route path="/clientes" element={<Clientes/>} />
<Route path="/cliente/:id" element={<ClienteDetalle/>} />
<Route path="/proyectos" element={<Proyectos/>} />
<Route path="/facturas" element={<Facturas/>} />
<Route path="/aging" element={<Aging/>} />
<Route path="/clientes/historial" element={<HistorialClientes/>} />
</Routes>
</ToastProvider>
</main>
<footer className="footer">© {new Date().getFullYear()} SIGE Cliente — Identidad visual minimal oscura</footer>
</div>
</div>
)
}