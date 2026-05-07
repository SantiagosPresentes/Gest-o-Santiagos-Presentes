import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function Vendas() {
  const [codigoBusca, setCodigoBusca] = useState('')
  const [itens, setItens] = useState([])
  const [cliente, setCliente] = useState(null)
  const [clientes, setClientes] = useState([])
  const [parcelamento, setParcelamento] = useState('1')
  const [parcelas, setParcelas] = useState([{ data: '', valor: '' }])
  const [observacao, setObservacao] = useState('')
  const [mensagem, setMensagem] = useState('')

  const total = itens.reduce((acc, item) => acc + item.subtotal, 0)

  useEffect(() => {
    supabase.from('clientes').select('*').order('nome').then(({ data }) => {
      if (data) setClientes(data)
    })
  }, [])

  useEffect(() => {
    const qtd = parseInt(parcelamento)
    const valorParcela = qtd > 0 && total > 0 ? (total / qtd).toFixed(2) : '0.00'
    const novasParcelas = Array.from({ length: qtd }, (_, i) => ({
      data: parcelas[i]?.data || '',
      valor: valorParcela
    }))
    setParcelas(novasParcelas)
  }, [parcelamento, total])

  async function buscarProduto() {
    if (!codigoBusca) return
    const { data } = await supabase.from('produtos').select('*').eq('codigo', codigoBusca).single()
    if (!data) { setMensagem('Produto não encontrado!'); return }

    if (data.estoque <= 0) {
      setMensagem(`⚠️ "${data.nome}" está com estoque zerado!`)
      setCodigoBusca('')
      return
    }

    const existente = itens.find(i => i.produto_id === data.id)
    if (existente) {
      if (existente.quantidade >= data.estoque) {
        setMensagem(`⚠️ Estoque disponível: apenas ${data.estoque} unidade(s)!`)
        return
      }
      setItens(itens.map(i => i.produto_id === data.id ? {...i, quantidade: i.quantidade + 1, subtotal: (i.quantidade + 1) * i.valor_unitario} : i))
    } else {
      setItens([...itens, { produto_id: data.id, nome: data.nome, categoria: data.categoria, valor_unitario: parseFloat(data.preco_venda), quantidade: 1, subtotal: parseFloat(data.preco_venda), estoque_disponivel: data.estoque }])
    }
    setCodigoBusca('')
    setMensagem('')
  }

  function alterarQuantidade(id, qtd, estoqueDisponivel) {
    if (qtd < 1) { setItens(itens.filter(i => i.produto_id !== id)); return }
    if (qtd > estoqueDisponivel) {
      setMensagem(`⚠️ Estoque disponível: apenas ${estoqueDisponivel} unidade(s)!`)
      return
    }
    setItens(itens.map(i => i.produto_id === id ? {...i, quantidade: qtd, subtotal: qtd * i.valor_unitario} : i))
  }

  function atualizarParcela(index, campo, valor) {
    const novas = [...parcelas]
    novas[index] = { ...novas[index], [campo]: valor }
    setParcelas(novas)
  }

  async function finalizarVenda() {
    if (!cliente || itens.length === 0) {
      setMensagem('Adicione produtos e selecione um cliente!')
      return
    }
    const todasComData = parcelas.every(p => p.data)
    if (!todasComData) {
      setMensagem('Preencha a data de todas as parcelas!')
      return
    }

    const obsParcelamento = parseInt(parcelamento) > 1
      ? `${parcelamento}x: ` + parcelas.map((p, i) => `${i+1}ª R$${p.valor} em ${new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR')}`).join(' | ')
      : ''

    const { data: venda, error } = await supabase.from('vendas').insert({
      cliente_id: cliente.id,
      data_para_pagar: parcelas[0].data,
      valor_total: total,
      recebido: 0,
      situacao: 'Pendente',
      observacao: obsParcelamento + (observacao ? (obsParcelamento ? ' | ' : '') + observacao : '')
    }).select().single()

    if (error) { setMensagem('Erro: ' + error.message); return }

    for (const item of itens) {
      await supabase.from('itens_venda').insert({ venda_id: venda.id, produto_id: item.produto_id, quantidade: item.quantidade, valor_unitario: item.valor_unitario })
      const { data: prod } = await supabase.from('produtos').select('estoque').eq('id', item.produto_id).single()
      await supabase.from('produtos').update({ estoque: prod.estoque - item.quantidade }).eq('id', item.produto_id)
    }

    setMensagem('Venda registrada com sucesso!')
    setItens([])
    setCliente(null)
    setParcelas([{ data: '', valor: '' }])
    setParcelamento('1')
    setObservacao('')
  }

  const campo = { width:'100%', padding:'10px', marginTop:'6px', borderRadius:'6px', border:'1px solid #ddd' }

  return (
    <div>
      <h2>Nova Venda</h2>
      <div className="grid-2" style={{marginTop:'16px'}}>

        {/* PRODUTOS */}
        <div style={{background:'white', padding:'24px', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
          <h3 style={{marginBottom:'16px', color:'#1a6b5a'}}>Produtos</h3>
          <div style={{display:'flex', gap:'8px', marginBottom:'16px'}}>
            <input
              value={codigoBusca}
              onChange={e => setCodigoBusca(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscarProduto()}
              placeholder="Código do produto..."
              style={{...campo, marginTop:0, flex:1}}
            />
            <button onClick={buscarProduto} style={{background:'#1a6b5a', color:'white', border:'none', padding:'10px 16px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold', fontSize:'18px'}}>+</button>
          </div>

          {mensagem && (
            <p style={{color: mensagem.includes('sucesso') ? 'green' : '#e94560', fontSize:'13px', marginBottom:'12px', background: mensagem.includes('sucesso') ? '#e8f5e9' : '#fff0f3', padding:'8px 12px', borderRadius:'6px'}}>
              {mensagem}
            </p>
          )}

          {itens.length === 0 && <p style={{color:'#aaa', textAlign:'center', padding:'20px'}}>Nenhum produto adicionado</p>}

          {itens.map(item => (
            <div key={item.produto_id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px', background:'#f8f8f8', borderRadius:'8px', marginBottom:'8px'}}>
              <div>
                <strong style={{fontSize:'14px'}}>{item.nome}</strong><br/>
                <small style={{color:'#666'}}>{item.categoria} | R$ {item.valor_unitario.toFixed(2)}</small><br/>
                <small style={{color:'#1a6b5a'}}>Estoque: {item.estoque_disponivel}</small>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                <button onClick={() => alterarQuantidade(item.produto_id, item.quantidade - 1, item.estoque_disponivel)} style={{background:'#ddd', border:'none', padding:'4px 10px', borderRadius:'4px', cursor:'pointer'}}>-</button>
                <span style={{fontWeight:'bold', minWidth:'20px', textAlign:'center'}}>{item.quantidade}</span>
                <button onClick={() => alterarQuantidade(item.produto_id, item.quantidade + 1, item.estoque_disponivel)} style={{background:'#ddd', border:'none', padding:'4px 10px', borderRadius:'4px', cursor:'pointer'}}>+</button>
                <strong style={{color:'#1a6b5a', minWidth:'80px', textAlign:'right'}}>R$ {item.subtotal.toFixed(2)}</strong>
              </div>
            </div>
          ))}

          <div style={{borderTop:'2px solid #eee', marginTop:'16px', paddingTop:'16px', textAlign:'right'}}>
            <strong style={{fontSize:'22px', color:'#1a6b5a'}}>Total: R$ {total.toFixed(2)}</strong>
          </div>
        </div>

        {/* DADOS DA VENDA */}
        <div style={{background:'white', padding:'24px', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
          <h3 style={{marginBottom:'16px', color:'#1a6b5a'}}>Dados da Venda</h3>

          <div style={{marginBottom:'16px'}}>
            <label style={{fontWeight:'bold', fontSize:'13px'}}>Cliente</label><br/>
            <select
              value={cliente ? cliente.id : ''}
              onChange={e => setCliente(clientes.find(c => c.id === e.target.value) || null)}
              style={campo}
            >
              <option value="">Selecione o cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          {cliente && (
            <div style={{background:'#f0f9f0', border:'1px solid #4caf50', borderRadius:'8px', padding:'10px', marginBottom:'16px', fontSize:'13px'}}>
              ✅ <strong>{cliente.nome}</strong> — {cliente.telefone}
            </div>
          )}

          <div style={{marginBottom:'16px'}}>
            <label style={{fontWeight:'bold', fontSize:'13px'}}>Parcelamento</label><br/>
            <select value={parcelamento} onChange={e => setParcelamento(e.target.value)} style={campo}>
              <option value="1">À vista (1x)</option>
              <option value="2">2x</option>
              <option value="3">3x</option>
              <option value="4">4x</option>
              <option value="5">5x</option>
            </select>
          </div>

          <div style={{marginBottom:'16px', background:'#f8f8f8', padding:'16px', borderRadius:'8px', border:'1px solid #eee'}}>
            <label style={{fontWeight:'bold', fontSize:'13px', color:'#1a6b5a'}}>
              {parseInt(parcelamento) === 1 ? 'Data de Pagamento' : `Datas das ${parcelamento} Parcelas`}
            </label>
            {parcelas.map((p, i) => (
              <div key={i} style={{display:'flex', gap:'8px', alignItems:'center', marginTop:'10px', flexWrap:'wrap'}}>
                <span style={{fontSize:'13px', color:'#666', whiteSpace:'nowrap', minWidth:'80px'}}>
                  {parseInt(parcelamento) > 1 ? `${i+1}ª parcela` : 'Vencimento'}
                </span>
                <input
                  type="date"
                  value={p.data}
                  onChange={e => atualizarParcela(i, 'data', e.target.value)}
                  style={{flex:1, padding:'8px', borderRadius:'6px', border:'1px solid #ddd', fontSize:'13px', minWidth:'140px'}}
                />
                {parseInt(parcelamento) > 1 && (
                  <span style={{fontSize:'13px', fontWeight:'bold', color:'#1a6b5a', whiteSpace:'nowrap'}}>
                    R$ {p.valor}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div style={{marginBottom:'24px'}}>
            <label style={{fontWeight:'bold', fontSize:'13px'}}>Observação (opcional)</label><br/>
            <input value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Ex: Cliente busca na loja" style={campo}/>
          </div>

          <button
            onClick={finalizarVenda}
            style={{width:'100%', background:'linear-gradient(135deg, #f5821f, #e06010)', color:'white', border:'none', padding:'14px', borderRadius:'8px', cursor:'pointer', fontSize:'16px', fontWeight:'bold', boxShadow:'0 3px 10px rgba(245,130,31,0.35)'}}
          >
            Finalizar Venda
          </button>
        </div>
      </div>
    </div>
  )
}

export default Vendas