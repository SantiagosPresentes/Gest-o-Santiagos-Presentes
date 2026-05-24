// Importa os hooks e componentes necessários
import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
// Importa todas as páginas do app
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
// Importa a conexão com o Supabase
import { supabase } from './supabase'
import './App.css'

function App() {
  // Estado para guardar o usuário logado
  const [usuario, setUsuario] = useState(null)
  // Estado para controlar o carregamento inicial
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    // Verifica se já existe uma sessão ativa ao abrir o app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUsuario(session?.user ?? null)
      setCarregando(false)
    })

    // Escuta mudanças de login/logout em tempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUsuario(session?.user ?? null)
    })

    // Remove o listener quando o componente for desmontado
    return () => subscription.unsubscribe()
  }, [])

  // Função para fazer logout
  async function fazerLogout() {
    await supabase.auth.signOut()
  }

  // Enquanto verifica a sessão, mostra tela de carregamento
  if (carregando) {
    return (
      <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#1a6b5a'}}>
        <p style={{color:'white', fontSize:'18px'}}>Carregando...</p>
      </div>
    )
  }

  // Se não há usuário logado, mostra a tela de login
  if (!usuario) {
    return <Login />
  }

  // Se está logado, mostra o app completo
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="navbar">
          <div className="logo">
            <img src="/logo.png" alt="Logo Santiagos Presentes" />
            <span className="logo-texto">Santiagos<br/>Presentes</span>
          </div>
          <div className="nav-links">
            <NavLink to="/">Vendas</NavLink>
            <NavLink to="/encomendas">Encomendas</NavLink>
            <NavLink to="/produtos">Produtos</NavLink>
            <NavLink to="/clientes">Clientes</NavLink>
            <NavLink to="/investimentos">Investimentos</NavLink>
            <NavLink to="/estoque">Estoque</NavLink>
            <NavLink to="/capital">Capital</NavLink>
            <NavLink to="/devolucoes">Devoluções</NavLink>
            <NavLink to="/historico">Histórico</NavLink>
            <NavLink to="/bi">BI</NavLink>
            <NavLink to="/relatorios">Relatórios</NavLink>
          </div>
          {/* Botão de logout com email do usuário */}
          <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'12px'}}>
            <span style={{color:'rgba(255,255,255,0.7)', fontSize:'12px'}}>
              {usuario.email}
            </span>
            <button
              onClick={fazerLogout}
              style={{background:'rgba(255,255,255,0.15)', color:'white', border:'1px solid rgba(255,255,255,0.3)', padding:'6px 14px', borderRadius:'6px', cursor:'pointer', fontSize:'13px'}}
            >
              Sair
            </button>
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
      </div>
    </BrowserRouter>
  )
}

export default App