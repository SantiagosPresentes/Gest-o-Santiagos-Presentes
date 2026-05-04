import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Vendas from './pages/Vendas'
import Produtos from './pages/Produtos'
import Clientes from './pages/Clientes'
import Investimentos from './pages/Investimentos'
import Estoque from './pages/Estoque'
import Capital from './pages/Capital'
import Devolucoes from './pages/Devolucoes'
import Historico from './pages/Historico'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="navbar">
          <div className="logo">
            <img src="/logo.png" alt="Logo Santiagos Presentes" />
            <span>Santiagos Presentes</span>
          </div>
          <div className="nav-links">
            <NavLink to="/">Vendas</NavLink>
            <NavLink to="/produtos">Produtos</NavLink>
            <NavLink to="/clientes">Clientes</NavLink>
            <NavLink to="/investimentos">Investimentos</NavLink>
            <NavLink to="/estoque">Estoque</NavLink>
            <NavLink to="/capital">Capital</NavLink>
            <NavLink to="/devolucoes">Devoluções</NavLink>
            <NavLink to="/historico">Histórico</NavLink>
          </div>
        </nav>
        <main className="conteudo">
          <Routes>
            <Route path="/" element={<Vendas />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/investimentos" element={<Investimentos />} />
            <Route path="/estoque" element={<Estoque />} />
            <Route path="/capital" element={<Capital />} />
            <Route path="/devolucoes" element={<Devolucoes />} />
            <Route path="/historico" element={<Historico />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App