import { useState } from 'react'
import { supabase } from '../supabase'

function Produtos() {
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('')
  const [preco, setPreco] = useState('')
  const [mensagem, setMensagem] = useState('')

  async function salvarProduto() {
    if (!codigo || !nome || !categoria || !preco) {
      setMensagem('Preencha todos os campos!')
      return
    }

    const { error } = await supabase.from('produtos').insert({
      codigo,
      nome,
      categoria,
      preco_venda: parseFloat(preco),
      estoque: 0
    })

    if (error) {
      setMensagem('Erro ao salvar: ' + error.message)
    } else {
      setMensagem('Produto cadastrado com sucesso!')
      setCodigo('')
      setNome('')
      setCategoria('')
      setPreco('')
    }
  }

  return (
    <div>
      <h2>Cadastro de Produtos</h2>
      <div style={{background:'white', padding:'24px', borderRadius:'12px', maxWidth:'500px', marginTop:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
        <div style={{marginBottom:'16px'}}>
          <label>Código do Produto</label><br/>
          <input value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Ex: 001" style={{width:'100%', padding:'10px', marginTop:'6px', borderRadius:'6px', border:'1px solid #ddd'}}/>
        </div>
        <div style={{marginBottom:'16px'}}>
          <label>Nome do Produto</label><br/>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Caneca Personalizada" style={{width:'100%', padding:'10px', marginTop:'6px', borderRadius:'6px', border:'1px solid #ddd'}}/>
        </div>
        <div style={{marginBottom:'16px'}}>
          <label>Categoria</label><br/>
          <select value={categoria} onChange={e => setCategoria(e.target.value)} style={{width:'100%', padding:'10px', marginTop:'6px', borderRadius:'6px', border:'1px solid #ddd'}}>
            <option value="">Selecione...</option>
            <option>Acessórios</option>
            <option>Cama / Mesa / Banho</option>
            <option>Cozinha</option>
            <option>Escolar</option>
            <option>Infantil</option>
            <option>Utilidade</option>
            <option>Perfumaria</option>
            <option>Decoração</option>
          </select>
        </div>
        <div style={{marginBottom:'24px'}}>
          <label>Preço de Venda (R$)</label><br/>
          <input type="number" value={preco} onChange={e => setPreco(e.target.value)} placeholder="Ex: 25.90" style={{width:'100%', padding:'10px', marginTop:'6px', borderRadius:'6px', border:'1px solid #ddd'}}/>
        </div>
        <button onClick={salvarProduto} style={{background:'#e94560', color:'white', border:'none', padding:'12px 24px', borderRadius:'8px', cursor:'pointer', fontSize:'16px', width:'100%'}}>
          Cadastrar Produto
        </button>
        {mensagem && <p style={{marginTop:'16px', color: mensagem.includes('sucesso') ? 'green' : 'red'}}>{mensagem}</p>}
      </div>
    </div>
  )
}

export default Produtos