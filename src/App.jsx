import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
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
import { supabase } from './supabase'
import './App.css'

function MenuMais({ fazerLogout, usuario }) {
  const [aberto, setAberto] = useState(false)
  const menuRef = useRef(null)
  const location = useLocation()

  useEffect(() => { setAberto(false) }, [location])

  useEffect(() => {
    function fechar(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setAberto(false)
    }
    document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [])

  const rotasSecundarias = [
    { path: '/investimentos', label: 'Investimentos', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>' },
    { path: '/devolucoes',    label: 'Devoluções',   icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>' },
    { path: '/historico',     label: 'Histórico',    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' },
    { path: '/bi',            label: 'BI / Relatórios', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>' },
    { path: '/estoque',       label: 'Estoque',      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>' },
    { path: '/capital',       label: 'Capital',      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
  ]

  const secundariaAtiva = rotasSecundarias.some(r => location.pathname === r.path)

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setAberto(!aberto)}
        className={`tab-mais-btn${secundariaAtiva ? ' active' : ''}`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
        </svg>
        Mais
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ transform: aberto ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {aberto && (
        <div className="menu-mais-dropdown">
          {rotasSecundarias.map(r => (
            <NavLink key={r.path} to={r.path} className="menu-mais-item">
              <span dangerouslySetInnerHTML={{ __html: r.icon }} />
              {r.label}
            </NavLink>
          ))}
          <div className="menu-mais-divider" />
          <div className="menu-mais-usuario">
            <span>{usuario?.email}</span>
            <button onClick={fazerLogout} className="menu-mais-sair">Sair</button>
          </div>
        </div>
      )}
    </div>
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

  async function fazerLogout() {
    await supabase.auth.signOut()
  }

  if (carregando) {
    return (
      <div className="tela-carregando">
        <div className="spinner"></div>
        <p>Carregando...</p>
      </div>
    )
  }

  if (!usuario) return <Login />

  const iniciais = usuario.email?.slice(0, 2).toUpperCase() || 'SP'

  return (
    <BrowserRouter>
      <div className="app">

        <header className="app-header">
          <div className="header-top">
            <div className="header-logo">
              <img src="/logo.png" alt="Logo" />
              <span className="header-titulo">SANTIAGOS<br/>PRESENTES</span>
            </div>
            <div className="header-acoes">
              <button className="btn-sino" aria-label="Notificações">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </button>
              <button className="btn-avatar" title={usuario.email}>
                {iniciais}
              </button>
            </div>
          </div>

          <nav className="header-tabs">
            <NavLink to="/" end>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              Vendas
            </NavLink>
            <NavLink to="/encomendas">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Encomendas
            </NavLink>
            <NavLink to="/produtos">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              Produtos
            </NavLink>
            <NavLink to="/clientes">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Clientes
            </NavLink>
            <MenuMais fazerLogout={fazerLogout} usuario={usuario} />
          </nav>
        </header>

        <main className="conteudo">
          <Routes>
            <Route path="/" element={<Vendas />} />
            <Route path="/encomendas" element={<Encomendas />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/investimentos" element={<Investimentos />} />
            <Route path="/estoque" element={<Estoque />} />
            <Route path="/capital" element={<Capital />} />
            <Route path="/devolucoes" element={<Devolucoes />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="/bi" element={<BI />} />
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
          <NavLink to="/historico">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            <span>Relatórios</span>
          </NavLink>
          <NavLink to="/bi">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
            <span>Mais</span>
          </NavLink>
        </nav>

      </div>
    </BrowserRouter>
  )
}

export default App
