import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import PageHeader from '../components/PageHeader'
import { ShoppingCart, ClipboardList, RotateCcw, Package, TrendingUp, Boxes, Users, DollarSign, History, BarChart3, FileText, Pencil, Search, X, AlertTriangle, UserPlus } from 'lucide-react'

function Clientes() {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [clientes, setClientes] = useState([])
  const [editando, setEditando] = useState(null)
  const [busca, setBusca] = useState('')

  useEffect(() => { carregarClientes() }, [])

  async function carregarClientes() {
    const { data } = await supabase.from('clientes').select('*').order('nome')
    if (data) setClientes(data)
  }

  async function salvarCliente() {
    if (!nome) { setMensagem('O nome do cliente é obrigatório!'); return }
    const { error } = await supabase.from('clientes').insert({ nome, telefone })
    if (error) { setMensagem('Erro ao salvar: ' + error.message); return }
    setMensagem('Cliente cadastrado com sucesso!')
    setNome(''); setTelefone('')
    carregarClientes()
  }

  async function salvarEdicao() {
    if (!nome) { setMensagem('O nome é obrigatório!'); return }
    const { error } = await supabase.from('clientes').update({ nome, telefone }).eq('id', editando.id)
    if (error) { setMensagem('Erro ao atualizar: ' + error.message); return }
    setMensagem('Cliente atualizado com sucesso!')
    setEditando(null)
    setNome(''); setTelefone('')
    carregarClientes()
  }

  function iniciarEdicao(cliente) {
    setEditando(cliente)
    setNome(cliente.nome)
    setTelefone(cliente.telefone || '')
    setMensagem('')
    window.scrollTo(0, 0)
  }

  function cancelarEdicao() {
    setEditando(null)
    setNome(''); setTelefone('')
    setMensagem('')
  }

  const clientesFiltrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase())
  )

  const campo = { width:'100%', padding:'10px', marginTop:'6px', borderRadius:'6px', border:'1px solid #ddd' }

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Gerencie os clientes cadastrados no sistema"
        icon={<Users size={22} color="white" />}
      />

      {/* FORMULÁRIO */}
      <div style={{ background:'white', padding:'24px', borderRadius:'12px', marginTop:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', borderTop: editando ? '3px solid #f5821f' : '3px solid #1a6b5a' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px' }}>
          {editando
            ? <Pencil size={16} color="#f5821f" />
            : <UserPlus size={16} color="#1a6b5a" />
          }
          <h3 style={{ color: editando ? '#f5821f' : '#1a6b5a', margin: 0 }}>
            {editando ? `Editando: ${editando.nome}` : 'Novo Cliente'}
          </h3>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'16px' }}>
          <div>
            <label style={{ fontWeight:'bold', fontSize:'13px' }}>Nome do Cliente</label><br/>
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Maria Silva" style={campo}/>
          </div>
          <div>
            <label style={{ fontWeight:'bold', fontSize:'13px' }}>Telefone</label><br/>
            <input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="Ex: 24 99999-0000" style={campo}/>
          </div>
        </div>

        <div style={{ marginTop:'20px', display:'flex', gap:'8px' }}>
          {editando ? (
            <>
              <button onClick={salvarEdicao} style={{ flex:1, background:'linear-gradient(135deg, #f5821f, #e06010)', color:'white', border:'none', padding:'12px', borderRadius:'8px', cursor:'pointer', fontSize:'15px', fontWeight:'bold', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                <Pencil size={16} /> Salvar Alterações
              </button>
              <button onClick={cancelarEdicao} style={{ flex:1, background:'#eee', color:'#333', border:'none', padding:'12px', borderRadius:'8px', cursor:'pointer', fontSize:'15px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                <X size={16} /> Cancelar
              </button>
            </>
          ) : (
            <button onClick={salvarCliente} style={{ flex:1, background:'linear-gradient(135deg, #1a6b5a, #145a4a)', color:'white', border:'none', padding:'12px', borderRadius:'8px', cursor:'pointer', fontSize:'15px', fontWeight:'bold', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
              <UserPlus size={16} /> Cadastrar Cliente
            </button>
          )}
        </div>

        {mensagem && (
          <p style={{ marginTop:'16px', color: mensagem.includes('Erro') || mensagem.includes('obrigatório') ? 'red' : 'green', fontSize:'14px', display:'flex', alignItems:'center', gap:'6px' }}>
            {mensagem.includes('Erro') || mensagem.includes('obrigatório')
              ? <AlertTriangle size={14} color="red" />
              : <Users size={14} color="green" />
            }
            {mensagem}
          </p>
        )}
      </div>

      {/* LISTA DE CLIENTES */}
      <div style={{ background:'white', padding:'24px', borderRadius:'12px', marginTop:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)' }}>
        <h3 style={{ color:'#1a6b5a', marginBottom:'16px' }}>Clientes Cadastrados ({clientes.length})</h3>

        {/* Campo de busca com ícone */}
        <div style={{ position:'relative', marginBottom:'16px' }}>
          <Search size={15} color="#a0aec0" style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar cliente..."
            style={{ ...campo, marginTop:0, paddingLeft:'36px' }}
          />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'10px', maxHeight:'500px', overflowY:'auto' }}>
          {clientesFiltrados.map(c => (
            <div key={c.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px', background:'#f9f9f9', borderRadius:'8px', borderLeft:'3px solid #1a6b5a' }}>
              <div style={{ flex:1, minWidth:0 }}>
                <strong style={{ fontSize:'14px', display:'block' }}>{c.nome}</strong>
                <small style={{ color:'#666' }}>{c.telefone || 'Sem telefone'}</small>
              </div>
              <button
                onClick={() => iniciarEdicao(c)}
                style={{ background:'#fff8e1', color:'#f57f17', border:'1px solid #f5821f', padding:'7px 10px', borderRadius:'6px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', marginLeft:'8px', flexShrink:0 }}
                title="Editar cliente"
              >
                <Pencil size={14} />
              </button>
            </div>
          ))}
          {clientesFiltrados.length === 0 && (
            <p style={{ textAlign:'center', color:'#aaa', padding:'20px', gridColumn:'1/-1' }}>Nenhum cliente encontrado</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Clientes
