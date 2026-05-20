import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

function Vendas() {
  const [codigoBusca, setCodigoBusca] = useState('')
  const [itens, setItens] = useState([])
  const [cliente, setCliente] = useState(null)
  const [clientes, setClientes] = useState([])
  const [parcelamento, setParcelamento] = useState('1')
  const [parcelas, setParcelas] = useState([{ data: '', valor: '' }])
  const [observacao, setObservacao] = useState('')
  const [desconto, setDesconto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [vendaFinalizada, setVendaFinalizada] = useState(null)
  const comprovanteRef = useRef(null)

  const subtotalItens = itens.reduce((acc, item) => acc + item.subtotal, 0)
  const valorDesconto = desconto && parseFloat(desconto) > 0 ? parseFloat(desconto) : 0
  const total = subtotalItens - valorDesconto

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
      desconto: valorDesconto,
      recebido: 0,
      situacao: 'Pendente',
      observacao: [
        obsParcelamento,
        valorDesconto > 0 ? `Desconto: R$ ${valorDesconto.toFixed(2)}` : '',
        observacao
      ].filter(Boolean).join(' | ')
    }).select().single()

    if (error) { setMensagem('Erro: ' + error.message); return }

    for (const item of itens) {
      await supabase.from('itens_venda').insert({ venda_id: venda.id, produto_id: item.produto_id, quantidade: item.quantidade, valor_unitario: item.valor_unitario })
      const { data: prod } = await supabase.from('produtos').select('estoque').eq('id', item.produto_id).single()
      await supabase.from('produtos').update({ estoque: prod.estoque - item.quantidade }).eq('id', item.produto_id)
    }

    // Salva os dados para o comprovante
    setVendaFinalizada({
      cliente,
      itens: [...itens],
      total,
      parcelas: [...parcelas],
      parcelamento,
      observacao,
      data: new Date()
    })

    setItens([])
    setCliente(null)
    setParcelas([{ data: '', valor: '' }])
    setParcelamento('1')
    setObservacao('')
    setDesconto('')
    setMensagem('')
  }

  function imprimir() {
    const conteudo = comprovanteRef.current.innerHTML
    const janela = window.open('', '_blank')
    janela.document.write(`
      <html>
        <head>
          <title>Comprovante - Santiagos Presentes</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
            .logo { text-align: center; margin-bottom: 16px; }
            .logo img { width: 80px; height: 80px; border-radius: 50%; }
            h2 { text-align: center; color: #1a6b5a; font-size: 18px; margin: 8px 0 4px; }
            .info-loja { text-align: center; color: #666; font-size: 13px; margin-bottom: 16px; }
            .linha { border-top: 1px dashed #999; margin: 12px 0; }
            .linha-dupla { border-top: 2px solid #333; margin: 12px 0; }
            .cliente { font-size: 14px; margin-bottom: 12px; }
            .cliente strong { color: #1a6b5a; }
            .item { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
            .item-nome { flex: 1; }
            .item-qtd { width: 40px; text-align: center; color: #666; }
            .item-valor { width: 80px; text-align: right; font-weight: bold; }
            .total { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; color: #1a6b5a; margin: 8px 0; }
            .parcelas { font-size: 13px; color: #555; margin-top: 8px; }
            .parcela { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .obs { font-size: 12px; color: #777; margin-top: 8px; font-style: italic; }
            .rodape { text-align: center; font-size: 12px; color: #999; margin-top: 16px; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>${conteudo}</body>
      </html>
    `)
    janela.document.close()
    janela.focus()
    setTimeout(() => { janela.print() }, 500)
  }

  const campo = { width:'100%', padding:'10px', marginTop:'6px', borderRadius:'6px', border:'1px solid #ddd' }

  return (
    <div>
      <h2>Nova Venda</h2>

      {/* MODAL DO COMPROVANTE */}
      {vendaFinalizada && (
        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'16px'}}>
          <div style={{background:'white', borderRadius:'16px', width:'100%', maxWidth:'440px', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 8px 32px rgba(0,0,0,0.3)'}}>

            {/* Conteúdo do comprovante */}
            <div ref={comprovanteRef} style={{padding:'24px'}}>
              {/* Cabeçalho */}
              <div className="logo" style={{textAlign:'center', marginBottom:'12px'}}>
                <img src="/logo.png" alt="Logo" style={{width:'80px', height:'80px', borderRadius:'50%', objectFit:'cover', border:'2px solid #1a6b5a'}}/>
                <h2 style={{color:'#1a6b5a', fontSize:'18px', marginTop:'8px'}}>Santiagos Presentes</h2>
                <p className="info-loja" style={{color:'#666', fontSize:'13px'}}>📞 (24) 98161-8699</p>
                <p style={{color:'#999', fontSize:'12px'}}>
                  {vendaFinalizada.data.toLocaleDateString('pt-BR')} às {vendaFinalizada.data.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                </p>
              </div>

              <div style={{borderTop:'1px dashed #999', margin:'12px 0'}}/>

              {/* Dados do cliente */}
              <div style={{marginBottom:'12px', fontSize:'14px'}}>
                <strong style={{color:'#1a6b5a'}}>Cliente:</strong> {vendaFinalizada.cliente.nome}<br/>
                {vendaFinalizada.cliente.telefone && (
                  <span style={{color:'#666', fontSize:'13px'}}>📞 {vendaFinalizada.cliente.telefone}</span>
                )}
              </div>

              <div style={{borderTop:'1px dashed #999', margin:'12px 0'}}/>

              {/* Itens */}
              <div style={{marginBottom:'8px'}}>
                <strong style={{fontSize:'13px', color:'#555'}}>PRODUTOS</strong>
              </div>
              {vendaFinalizada.itens.map((item, i) => (
                <div key={i} style={{display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom:'6px', alignItems:'flex-start'}}>
                  <span style={{flex:1, paddingRight:'8px'}}>{item.nome}</span>
                  <span style={{color:'#666', marginRight:'8px', whiteSpace:'nowrap'}}>{item.quantidade}x R$ {item.valor_unitario.toFixed(2)}</span>
                  <strong style={{whiteSpace:'nowrap'}}>R$ {item.subtotal.toFixed(2)}</strong>
                </div>
              ))}

              <div style={{borderTop:'2px solid #333', margin:'12px 0'}}/>

              {/* Total */}
              <div style={{display:'flex', justifyContent:'space-between', fontSize:'18px', fontWeight:'bold', color:'#1a6b5a', marginBottom:'8px'}}>
                <span>TOTAL</span>
                <span>R$ {vendaFinalizada.total.toFixed(2)}</span>
              </div>

              {/* Parcelas */}
              {parseInt(vendaFinalizada.parcelamento) > 1 ? (
                <div style={{background:'#f8f8f8', borderRadius:'8px', padding:'12px', marginBottom:'8px'}}>
                  <strong style={{fontSize:'13px', color:'#555'}}>PARCELAMENTO — {vendaFinalizada.parcelamento}x</strong>
                  {vendaFinalizada.parcelas.map((p, i) => (
                    <div key={i} style={{display:'flex', justifyContent:'space-between', fontSize:'13px', marginTop:'6px'}}>
                      <span>{i+1}ª parcela — {new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      <strong>R$ {p.valor}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{fontSize:'13px', color:'#555', marginBottom:'8px'}}>
                  <strong>Vencimento:</strong> {new Date(vendaFinalizada.parcelas[0].data + 'T12:00:00').toLocaleDateString('pt-BR')}
                </div>
              )}

              {/* Desconto */}
              <div style={{marginBottom:'16px'}}>
                <label style={{fontWeight:'bold', fontSize:'13px'}}>Desconto (R$)</label><br/>
                <input
                  type="number"
                  value={desconto}
                  onChange={e => setDesconto(e.target.value)}
                  placeholder="Ex: 10.00"
                  style={campo}
                />
                {valorDesconto > 0 && (
                  <div style={{marginTop:'8px', background:'#e8f5e9', border:'1px solid #4caf50', borderRadius:'6px', padding:'8px 12px', fontSize:'13px'}}>
                  <span style={{color:'#2e7d32'}}>✅ Desconto de <strong>R$ {valorDesconto.toFixed(2)}</strong> aplicado!</span>
                </div>
                )}
              </div>

              {/* Observação */}
              {vendaFinalizada.observacao && (
                <p style={{fontSize:'12px', color:'#777', fontStyle:'italic', marginTop:'8px'}}>
                  Obs: {vendaFinalizada.observacao}
                </p>
              )}

              <div style={{borderTop:'1px dashed #999', margin:'12px 0'}}/>

              {/* Rodapé */}
              <p style={{textAlign:'center', fontSize:'12px', color:'#999'}}>
                Obrigado pela preferência!<br/>
                Santiagos Presentes 🏪
              </p>
            </div>

            {/* Botões */}
            <div style={{padding:'16px 24px', borderTop:'1px solid #eee', display:'flex', gap:'8px'}}>
              <button
                onClick={imprimir}
                style={{flex:1, background:'linear-gradient(135deg, #1a6b5a, #145a4a)', color:'white', border:'none', padding:'12px', borderRadius:'8px', cursor:'pointer', fontSize:'15px', fontWeight:'bold'}}
              >
                🖨️ Imprimir
              </button>
              <button
                onClick={() => setVendaFinalizada(null)}
                style={{flex:1, background:'#eee', color:'#333', border:'none', padding:'12px', borderRadius:'8px', cursor:'pointer', fontSize:'15px'}}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div style={{textAlign:'right'}}>
              {valorDesconto > 0 && (
                <div style={{fontSize:'14px', color:'#888', marginBottom:'4px'}}>
                  Subtotal: R$ {subtotalItens.toFixed(2)}<br/>
                  <span style={{color:'#2e7d32'}}>Desconto: -R$ {valorDesconto.toFixed(2)}</span>
                </div>
              )}
              <strong style={{fontSize:'22px', color:'#1a6b5a'}}>Total: R$ {total.toFixed(2)}</strong>
            </div>
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

          {/* Desconto */}
          <div style={{marginBottom:'24px'}}>
            <label style={{fontWeight:'bold', fontSize:'13px'}}>
              Desconto (R$)
            </label><br/>

            <input
              type="number"
              step="0.01"
              min="0"
              value={desconto}
              onChange={e => setDesconto(e.target.value)}
              placeholder="Ex: 10.00"
              style={campo}
            />

            {valorDesconto > 0 && (
              <div
                style={{
                  marginTop:'8px',
                  background:'#e8f5e9',
                  border:'1px solid #4caf50',
                  borderRadius:'6px',
                  padding:'8px 12px',
                  fontSize:'13px'
                }}
              >
                <span style={{color:'#2e7d32'}}>
                  ✅ Desconto de <strong>R$ {valorDesconto.toFixed(2)}</strong> aplicado!
                </span>
              </div>
            )}
          </div>

          <button
            onClick={finalizarVenda}
            style={{width:'100%', background:'linear-gradient(135deg, #1a6b5a, #145a4a)', color:'white', border:'none', padding:'14px', borderRadius:'8px', cursor:'pointer', fontSize:'16px', fontWeight:'bold', boxShadow:'0 3px 10px rgba(245,130,31,0.35)'}}
          >
            Finalizar Venda
          </button>
        </div>
      </div>
    </div>
  )
}

export default Vendas