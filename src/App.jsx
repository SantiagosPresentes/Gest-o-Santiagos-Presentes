import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
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
import { supabase } from './supabase'
import {
  ShoppingCart, ClipboardList, RotateCcw, Package,
  TrendingUp, AlignJustify, DollarSign, History,
  BarChart3, FileText, Users, Home, Layers
} from 'lucide-react'
import './App.css'

const NAV_ITEMS = [
  { to: '/',             label: 'Vendas',       icon: <ShoppingCart size={14}/> },
  { to: '/encomendas',   label: 'Encomendas',   icon: <ClipboardList size={14}/> },
  { to: '/devolucoes',   label: 'Devoluções',   icon: <RotateCcw size={14}/> },
  { to: '/produtos',     label: 'Produtos',     icon: <Package size={14}/> },
  { to: '/investimentos',label: 'Investimentos',icon: <TrendingUp size={14}/> },
  { to: '/estoque',      label: 'Estoque',      icon: <Layers size={14}/> },
  { to: '/clientes',     label: 'Clientes',     icon: <Users size={14}/> },
  { to: '/capital',      label: 'Capital',      icon: <DollarSign size={14}/> },
  { to: '/historico',    label: 'Histórico',    icon: <History size={14}/> },
  { to: '/bi',           label: 'BI',           icon: <BarChart3 size={14}/> },
  { to: '/relatorios',   label: 'Relatórios',   icon: <FileText size={14}/> },
]

const MOBILE_ITEMS = [
  { to: '/',          label: 'Início',     icon: <Home size={22}/> },
  { to: '/estoque',   label: 'Estoque',    icon: <Layers size={22}/> },
  { to: '/capital',   label: 'Financeiro', icon: <DollarSign size={22}/> },
  { to: '/relatorios',label: 'Relatórios', icon: <FileText size={22}/> },
  { to: '/bi',        label: 'BI',         icon: <BarChart3 size={22}/> },
]

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
      <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#1a6b5a'}}>
        <p style={{color:'white', fontSize:'18px'}}>Carregando...</p>
      </div>
    )
  }

  if (!usuario) return <Login />

  const inicial = usuario.email?.[0]?.toUpperCase() || 'U'

  return (
    <BrowserRouter>
      <div className="app">
        <nav className="navbar">
          <div className="logo">
            <img src="/logo.png" alt="Logo" />
            <span className="logo-texto">Santiagos<br/>Presentes</span>
          </div>

          <div className="nav-links">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="navbar-user">
            <span className="navbar-user-email">{usuario.email}</span>
            <div className="navbar-avatar">{inicial}</div>
            <button className="navbar-sair" onClick={fazerLogout}>Sair</button>
          </div>
        </nav>

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
          </Routes>
        </main>

        {/* Barra inferior mobile */}
        <nav className="mobile-bottom-bar">
          {MOBILE_ITEMS.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </BrowserRouter>
  )
}

export default App
