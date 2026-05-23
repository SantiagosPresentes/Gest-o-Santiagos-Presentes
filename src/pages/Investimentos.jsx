import { useState } from 'react'
import { supabase } from '../supabase'

function Investimentos() {
  const [codigo, setCodigo] = useState('')
  const [produto, setProduto] = useState(null)
  const [fornecedor, setFornecedor] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [valorTotal, setValorTotal] = useState('')
  const [mes, setMes] = useState('')
  const [mensagem, setMensagem] = useState('')

  const custoUnitario = quantidade && valorTotal ? (parseFloat(valorTotal) / parseInt(quantidade)).toFixed(2) : '0.00'
  const lucroUnitario = produto && custoUnitario ? (parseFloat(produto.preco_venda) - parseFloat(custoUnitario)).toFixed(2) : '0.00'
  const lucroFinal = lucroUnitario && quantidade ? (parseFloat(lucroUnitario) * parseInt(quantidade)).toFixed(2) : '0.00'

  async function buscarProduto() {
    if (!codigo) return
    const { data, error } = await supabase.from('produtos').select('*').eq('codigo', codigo).single()
    if (error || !data) {
      setProduto(null)
      setMensagem('Produto não encontrado!')
    } else {
      setProduto(data)
      setMensagem('')
    }
  }

  async function salvarInvestimento() {
    if (!produto || !fornecedor || !quantidade || !valorTotal || !mes) {
      setMensagem('Preencha todos os campos!')
      return
    }

    const { error } = await supabase.from('investimentos').insert({
      produto_id: produto.id,
      fornecedor,
      quantidade: parseInt(quantidade),
      valor_total_pago: parseFloat(valorTotal),
      preco_venda: parseFloat(produto.preco_venda),
      mes
    })

    if (error) {
      setMensagem('Erro ao salvar: ' + error.message)
    } else {
      await supabase.from('produtos').update({ estoque: produto.estoque + parseInt(quantidade) }).eq('id', produto.id)
      setMensagem('Investimento registrado com sucesso!')
      setCodigo(''); setProduto(null); setFornecedor(''); setQuantidade(''); setValorTotal(''); setMes('')
    }
  }

  const campo = { width:'100%', padding:'10px', marginTop:'6px', borderRadius:'6px', border:'1px solid #ddd' }
  const card = { background:'white', padding:'24px', borderRadius:'12px', maxWidth:'560px', marginTop:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }

  return (
    <div>
      <h2>Registro de Investimentos</h2>
      <div style={card}>
        <div style={{marginBottom:'16px'}}>
          <label>Código do Produto</label><br/>
          <div style={{display:'flex', gap:'8px', marginTop:'6px'}}>
            <input value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Ex: 0001" style={{...campo, marginTop:0, flex:1}}/>
            <button onClick={buscarProduto} style={{background:'#1a1a2e', color:'white', border:'none', padding:'10px 16px', borderRadius:'6px', cursor:'pointer'}}>Buscar</button>
          </div>
        </div>

        {produto && (
          <div style={{background:'#f0f9f0', border:'1px solid #4caf50', borderRadius:'8px', padding:'12px', marginBottom:'16px'}}>
            <strong>✅ {produto.nome}</strong> | {produto.categoria} | R$ {produto.preco_venda}
          </div>
        )}

        <div style={{marginBottom:'16px'}}>
          <label>Fornecedor / Loja</label><br/>
          <input value={fornecedor} onChange={e => setFornecedor(e.target.value)} placeholder="Ex: Atacadão" style={campo}/>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px'}}>
          <div>
            <label>Quantidade Comprada</label><br/>
            <input type="number" value={quantidade} onChange={e => setQuantidade(e.target.value)} placeholder="Ex: 10" style={campo}/>
          </div>
          <div>
            <label>Valor Total Pago (R$)</label><br/>
            <input type="number" value={valorTotal} onChange={e => setValorTotal(e.target.value)} placeholder="Ex: 150.00" style={campo}/>
          </div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', marginBottom:'16px', background:'#f8f8f8', padding:'12px', borderRadius:'8px'}}>
          <div><small>Custo Unitário</small><br/><strong>R$ {custoUnitario}</strong></div>
          <div><small>Lucro Unitário</small><br/><strong style={{color: parseFloat(lucroUnitario) >= 0 ? 'green' : 'red'}}>R$ {lucroUnitario}</strong></div>
          <div><small>Lucro Final</small><br/><strong style={{color: parseFloat(lucroFinal) >= 0 ? 'green' : 'red'}}>R$ {lucroFinal}</strong></div>
        </div>

        <div style={{marginBottom:'24px'}}>
          <label>Mês de Referência</label><br/>
          <input value={mes} onChange={e => setMes(e.target.value)} placeholder="Ex: Maio/2026" style={campo}/>
        </div>

        <button onClick={salvarInvestimento} style={{background:'linear-gradient(135deg, #f5821f, #c2185b)', color:'white', border:'none', padding:'12px 24px', borderRadius:'8px', cursor:'pointer', fontSize:'16px', width:'100%'}}>
          Registrar Investimento
        </button>
        {mensagem && <p style={{marginTop:'16px', color: mensagem.includes('sucesso') ? 'green' : 'red'}}>{mensagem}</p>}
      </div>
    </div>
  )
}

export default Investimentos