import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import Vendas from './pages/Vendas'
import Encomendas from './pages/Encomendas'
import Produtos from './pages/Produtos'
import Clientes from './pages/Clientes'
import Investimentos from './pages/Investimentos'
import Estoque from './pages/Estoque'
import Capital from './pages/Capital'
import Devolucoes from './pages/Devolucoes'
import Historico from './pages/Historico'
import Login from './pages/Login'
import BI from './pages/BI'
import Relatorios from './pages/Relatorios'
import PainelVendedor from './pages/PainelVendedor'
import { supabase } from './supabase'
import './App.css'

const navLinks = [
  { to: '/', label: 'Vendas', end: true, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> },
  { to: '/encomendas', label: 'Encomendas', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
  { to: '/devolucoes', label: 'Devoluções', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg> },
  { to: '/produtos', label: 'Produtos', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { to: '/investimentos', label: 'Investimentos', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
  { to: '/estoque', label: 'Estoque', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
  { to: '/clientes', label: 'Clientes', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { to: '/capital', label: 'Capital', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
  { to: '/historico', label: 'Histórico', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  { to: '/bi', label: 'BI', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg> },
  { to: '/relatorios', label: 'Relatórios', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { to: '/meu-painel', label: 'Meu Painel', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
]

function NavTabs({ fazerLogout, usuario }) {
  const [drawerAberto, setDrawerAberto] = useState(false)
  const iniciais = usuario?.email?.slice(0, 2).toUpperCase() || 'SP'

  return (
    <>
      {/* Header fixo — só logo + hamburguer + avatar */}
      <header className="app-header">
        <div className="header-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Botão hamburguer */}
            <button
              className="btn-hamburguer"
              onClick={() => setDrawerAberto(true)}
              aria-label="Abrir menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="header-logo">
              <img src="/logo.png" alt="Logo" />
              <span className="header-titulo">SANTIAGOS<br />PRESENTES</span>
            </div>
          </div>
          <div className="header-acoes">
            <span className="header-email">{usuario?.email}</span>
            <button className="btn-avatar" onClick={fazerLogout} title="Sair">{iniciais}</button>
          </div>
        </div>
      </header>

      {/* Overlay */}
      {drawerAberto && (
        <div
          onClick={() => setDrawerAberto(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1200,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Drawer lateral */}
      <div style={{
        position: 'fixed', top: 0, left: 0,
        height: '100%', width: 260, zIndex: 1300,
        background: '#fff',
        display: 'flex', flexDirection: 'column',
        boxShadow: '4px 0 32px rgba(0,0,0,0.15)',
        transform: drawerAberto ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.27s cubic-bezier(.4,0,.2,1)',
      }}>

        {/* Cabeçalho do drawer — mesma identidade do header */}
        <div style={{
          background: 'linear-gradient(135deg, #e8572a, #c0392b)',
          padding: '18px 16px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt="Logo" style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'cover' }} />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>
              SANTIAGOS<br />PRESENTES
            </span>
          </div>
          <button
            onClick={() => setDrawerAberto(false)}
            aria-label="Fechar menu"
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, cursor: 'pointer', padding: 6, display: 'flex', color: '#fff' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Links de navegação */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
          {navLinks.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setDrawerAberto(false)}
              className="drawer-link"
            >
              <span className="drawer-link-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Rodapé do drawer — email + sair */}
        <div style={{ borderTop: '1px solid #f3f4f6', padding: '12px 8px' }}>
          <div style={{ padding: '8px 12px', fontSize: 12, color: '#9ca3af', marginBottom: 4, wordBreak: 'break-all' }}>
            {usuario?.email}
          </div>
          <button
            onClick={() => { setDrawerAberto(false); fazerLogout() }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', padding: '10px 12px', borderRadius: 10,
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: '#e8572a', fontWeight: 600, fontSize: 14, textAlign: 'left',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sair
          </button>
        </div>
      </div>
    </>
  )
}

function App() {
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUsuario(session?.user ?? null)
      setCarregando(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUsuario(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fazerLogout() { await supabase.auth.signOut() }

  if (carregando) {
    return (
      <div className="tela-carregando">
        <div className="spinner"></div>
        <p>Carregando...</p>
      </div>
    )
  }

  if (!usuario) return <Login />

  return (
    <BrowserRouter>
      <div className="app">
        <NavTabs fazerLogout={fazerLogout} usuario={usuario} />
        <main className="conteudo">
          <Routes>
            <Route path="/" element={<Vendas />} />
            <Route path="/encomendas" element={<Encomendas />} />
            <Route path="/devolucoes" element={<Devolucoes />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/investimentos" element={<Investimentos />} />
            <Route path="/estoque" element={<Estoque />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/capital" element={<Capital />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="/bi" element={<BI />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/meu-painel" element={<PainelVendedor />} />
          </Routes>
        </main>
        <nav className="bottom-nav">
          <NavLink to="/" end>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>Início</span>
          </NavLink>
          <NavLink to="/estoque">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            <span>Estoque</span>
          </NavLink>
          <NavLink to="/capital">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span>Financeiro</span>
          </NavLink>
          <NavLink to="/relatorios">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            <span>Relatórios</span>
          </NavLink>
          <NavLink to="/bi">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
            <span>BI</span>
          </NavLink>
        </nav>
      </div>
    </BrowserRouter>
  )
}

export default App
