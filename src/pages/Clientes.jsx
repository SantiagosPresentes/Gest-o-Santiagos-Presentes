import { useState } from 'react'
import { supabase } from '../supabase'

function Clientes() {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  const [mensagem, setMensagem] = useState('')

  async function salvarCliente() {
    if (!nome) {
      setMensagem('O nome do cliente é obrigatório!')
      return
    }

    const { error } = await supabase.from('clientes').insert({ nome, telefone, endereco })

    if (error) {
      setMensagem('Erro ao salvar: ' + error.message)
    } else {
      setMensagem('Cliente cadastrado com sucesso!')
      setNome('')
      setTelefone('')
      setEndereco('')
    }
  }

  return (
    <div>
      <h2>Cadastro de Clientes</h2>
      <div style={{background:'white', padding:'24px', borderRadius:'12px', maxWidth:'500px', marginTop:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
        <div style={{marginBottom:'16px'}}>
          <label>Nome do Cliente</label><br/>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Maria Silva" style={{width:'100%', padding:'10px', marginTop:'6px', borderRadius:'6px', border:'1px solid #ddd'}}/>
        </div>
        <div style={{marginBottom:'16px'}}>
          <label>Telefone</label><br/>
          <input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="Ex: 24 99999-0000" style={{width:'100%', padding:'10px', marginTop:'6px', borderRadius:'6px', border:'1px solid #ddd'}}/>
        </div>
        <div style={{marginBottom:'24px'}}>
          <label>Endereço</label><br/>
          <input value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Ex: Rua das Flores, 123" style={{width:'100%', padding:'10px', marginTop:'6px', borderRadius:'6px', border:'1px solid #ddd'}}/>
        </div>
        <button onClick={salvarCliente} style={{background:'#e94560', color:'white', border:'none', padding:'12px 24px', borderRadius:'8px', cursor:'pointer', fontSize:'16px', width:'100%'}}>
          Cadastrar Cliente
        </button>
        {mensagem && <p style={{marginTop:'16px', color: mensagem.includes('sucesso') ? 'green' : 'red'}}>{mensagem}</p>}
      </div>
    </div>
  )
}

export default Clientes