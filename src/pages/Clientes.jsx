import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import PageHeader from '../components/PageHeader'
import { Users } from 'lucide-react'

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
        subtitle="Cadastro de clientes"
        icon={<Users size={22} />}
      />

      {/* FORMULÁRIO — sempre no topo */}
      <div style={{background:'white', padding:'24px', borderRadius:'12px', marginTop:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', borderTop: editando ? '3px solid #f5821f' : '3px solid #1a6b5a'}}>
        <h3 style={{color: editando ? '#f5821f' : '#1a6b5a', marginBottom:'16px'}}>
          {editando ? `✏️ Editando: ${editando.nome}` : 'Novo Cliente'}
        </h3>

        {/* No desktop: 2 colunas lado a lado. No mobile: 1 coluna */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'16px'}}>
          <div>
            <label style={{fontWeight:'bold', fontSize:'13px'}}>Nome do Cliente</label><br/>
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Maria Silva" style={campo}/>
          </div>
          <div>
            <label style={{fontWeight:'bold', fontSize:'13px'}}>Telefone</label><br/>
            <input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="Ex: 24 99999-0000" style={campo}/>
          </div>
        </div>

        <div style={{marginTop:'20px', display:'flex', gap:'8px'}}>
          {editando ? (
            <>
              <button onClick={salvarEdicao} style={{flex:1, background:'linear-gradient(135deg, #f5821f, #e06010)', color:'white', border:'none', padding:'12px', borderRadius:'8px', cursor:'pointer', fontSize:'15px', fontWeight:'bold'}}>
                Salvar Alterações
              </button>
              <button onClick={cancelarEdicao} style={{flex:1, background:'#eee', color:'#333', border:'none', padding:'12px', borderRadius:'8px', cursor:'pointer', fontSize:'15px'}}>
                Cancelar
              </button>
            </>
          ) : (
            <button onClick={salvarCliente} style={{flex:1, background:'linear-gradient(135deg, #1a6b5a, #145a4a)', color:'white', border:'none', padding:'12px', borderRadius:'8px', cursor:'pointer', fontSize:'15px', fontWeight:'bold'}}>
              Cadastrar Cliente
            </button>
          )}
        </div>

        {mensagem && <p style={{marginTop:'16px', color: mensagem.includes('sucesso') || mensagem.includes('atualizado') ? 'green' : 'red', fontSize:'14px'}}>{mensagem}</p>}
      </div>

      {/* LISTA DE CLIENTES — sempre abaixo */}
      <div style={{background:'white', padding:'24px', borderRadius:'12px', marginTop:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
        <h3 style={{color:'#1a6b5a', marginBottom:'16px'}}>Clientes Cadastrados ({clientes.length})</h3>

        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="🔍 Buscar cliente..."
          style={{...campo, marginBottom:'16px', marginTop:0}}
        />

        {/* No desktop: grid de 2 colunas. No mobile: 1 coluna */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'10px', maxHeight:'500px', overflowY:'auto'}}>
          {clientesFiltrados.map(c => (
            <div key={c.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px', background:'#f9f9f9', borderRadius:'8px', borderLeft:'3px solid #1a6b5a'}}>
              <div style={{flex:1, minWidth:0}}>
                <strong style={{fontSize:'14px', display:'block'}}>{c.nome}</strong>
                <small style={{color:'#666'}}>{c.telefone || 'Sem telefone'}</small>
              </div>
              <button
                onClick={() => iniciarEdicao(c)}
                style={{background:'#fff8e1', color:'#f57f17', border:'1px solid #f5821f', padding:'6px 12px', borderRadius:'6px', cursor:'pointer', fontSize:'13px', fontWeight:'bold', whiteSpace:'nowrap', marginLeft:'8px', flexShrink:0}}
              >
                ✏️
              </button>
            </div>
          ))}
          {clientesFiltrados.length === 0 && (
            <p style={{textAlign:'center', color:'#aaa', padding:'20px', gridColumn:'1/-1'}}>Nenhum cliente encontrado</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Clientes