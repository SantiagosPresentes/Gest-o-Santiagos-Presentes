import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import PageHeader from '../components/PageHeader'
import {ShoppingCart, ClipboardList, RotateCcw, Package, TrendingUp, Boxes, Users, DollarSign, History, BarChart3, FileText} from 'lucide-react'

function Historico() {
  const [vendas, setVendas] = useState([])
  const [devolucoes, setDevolucoes] = useState([])
  const [filtroSituacao, setFiltroSituacao] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [clientes, setClientes] = useState([])
  const [vendaExpandida, setVendaExpandida] = useState(null)
  const [pagamentoVenda, setPagamentoVenda] = useState(null)
  const [valorPago, setValorPago] = useState('')
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    carregarDados()
    supabase.from('clientes').select('*').order('nome').then(({ data }) => {
      if (data) setClientes(data)
    })
  }, [])

  function calcularSituacao(venda) {
    if (parseFloat(venda.recebido) >= parseFloat(venda.valor_total)) return 'Pago'
    if (!venda.data_para_pagar) return 'Pendente'
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const vencimento = new Date(venda.data_para_pagar + 'T12:00:00')
    if (hoje > vencimento) return 'Atrasado'
    return 'Pendente'
  }

  async function carregarDados() {
    const { data: vendasData } = await supabase
      .from('vendas')
      .select('*, clientes(nome, telefone), desconto, vendedor')
      .order('data_venda', { ascending: false })

    const { data: devolucoesData } = await supabase
      .from('devolucoes')
      .select('*, clientes(nome), produtos(nome)')
      .order('criado_em', { ascending: false })

    if (vendasData) {
      const vendasComItens = await Promise.all(vendasData.map(async (venda) => {
        const { data: itens } = await supabase
          .from('itens_venda')
          .select('*, produtos(nome)')
          .eq('venda_id', venda.id)
        return { ...venda, itens: itens || [], situacao_real: calcularSituacao(venda) }
      }))
      setVendas(vendasComItens)
    }

    if (devolucoesData) setDevolucoes(devolucoesData)
  }

  async function registrarPagamento() {
    if (!valorPago || parseFloat(valorPago) <= 0) {
      setMensagem('Digite um valor válido!')
      return
    }
    const novoRecebido = parseFloat(pagamentoVenda.recebido || 0) + parseFloat(valorPago)
    const novaSituacao = novoRecebido >= parseFloat(pagamentoVenda.valor_total) ? 'Pago' : 'Pendente'
    const { error } = await supabase
      .from('vendas')
      .update({ recebido: novoRecebido, situacao: novaSituacao })
      .eq('id', pagamentoVenda.id)
    if (error) { setMensagem('Erro: ' + error.message); return }
    setMensagem('Pagamento registrado com sucesso!')
    setPagamentoVenda(null)
    setValorPago('')
    carregarDados()
  }

  const vendasFiltradas = vendas.filter(v => {
    if (filtroCliente && v.cliente_id !== filtroCliente) return false
    if (filtroSituacao && v.situacao_real !== filtroSituacao) return false
    if (filtroDataInicio && v.data_para_pagar < filtroDataInicio) return false
    if (filtroDataFim && v.data_para_pagar > filtroDataFim) return false
    return true
  })

  function corSituacao(situacao) {
    if (situacao === 'Pago') return { background: '#e8f5e9', color: 'green' }
    if (situacao === 'Atrasado') return { background: '#ffebee', color: 'red' }
    return { background: '#fff8e1', color: '#f57f17' }
  }

  function devolucoesVenda(vendaId) {
    return devolucoes.filter(d => d.venda_id === vendaId)
  }

  const campo = { padding:'8px 12px', borderRadius:'6px', border:'1px solid #ddd', fontSize:'13px' }

  return (
    <div>
      <PageHeader
        title="Histórico"
        subtitle="Visualize o histórico completo de movimentações"
        icon={<History size={22} color="white" />}
      />

      {/* Modal de pagamento */}
      {pagamentoVenda && (
        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'16px'}}>
          <div style={{background:'white', padding:'32px', borderRadius:'16px', width:'100%', maxWidth:'400px', boxShadow:'0 8px 32px rgba(0,0,0,0.3)'}}>
            <h3 style={{marginBottom:'8px', color:'#1a6b5a'}}>Registrar Pagamento</h3>
            <p style={{color:'#666', marginBottom:'16px', fontSize:'14px'}}>
              Cliente: <strong>{pagamentoVenda.clientes?.nome}</strong><br/>
              Total: <strong>R$ {parseFloat(pagamentoVenda.valor_total).toFixed(2)}</strong><br/>
              Já recebido: <strong style={{color:'green'}}>R$ {parseFloat(pagamentoVenda.recebido || 0).toFixed(2)}</strong><br/>
              Falta: <strong style={{color:'red'}}>R$ {(parseFloat(pagamentoVenda.valor_total) - parseFloat(pagamentoVenda.recebido || 0)).toFixed(2)}</strong>
            </p>
            <label style={{fontSize:'14px', fontWeight:'bold'}}>Valor recebido agora (R$)</label><br/>
            <input
              type="number"
              value={valorPago}
              onChange={e => setValorPago(e.target.value)}
              placeholder="Ex: 50.00"
              style={{width:'100%', padding:'10px', marginTop:'6px', marginBottom:'16px', borderRadius:'6px', border:'1px solid #ddd', fontSize:'16px'}}
              autoFocus
            />
            <div style={{display:'flex', gap:'8px'}}>
              <button onClick={registrarPagamento} style={{flex:1, background:'linear-gradient(135deg, #1a6b5a, #145a4a)', color:'white', border:'none', padding:'12px', borderRadius:'8px', cursor:'pointer', fontSize:'15px', fontWeight:'bold'}}>
                Confirmar
              </button>
              <button onClick={() => { setPagamentoVenda(null); setValorPago(''); setMensagem('') }} style={{flex:1, background:'#eee', color:'#333', border:'none', padding:'12px', borderRadius:'8px', cursor:'pointer', fontSize:'15px'}}>
                Cancelar
              </button>
            </div>
            {mensagem && <p style={{marginTop:'12px', color: mensagem.includes('sucesso') ? 'green' : 'red', fontSize:'14px'}}>{mensagem}</p>}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{background:'white', padding:'16px', borderRadius:'12px', marginTop:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', display:'flex', gap:'12px', alignItems:'flex-end', flexWrap:'wrap'}}>
        <div>
          <label style={{fontSize:'12px', color:'#666'}}>Situação</label><br/>
          <select value={filtroSituacao} onChange={e => setFiltroSituacao(e.target.value)} style={campo}>
            <option value="">Todas</option>
            <option value="Pendente">Pendente</option>
            <option value="Atrasado">Atrasado</option>
            <option value="Pago">Pago</option>
          </select>
        </div>
        <div>
          <label style={{fontSize:'12px', color:'#666'}}>Data (de)</label><br/>
          <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} style={campo}/>
        </div>
        <div>
          <label style={{fontSize:'12px', color:'#666'}}>Data (até)</label><br/>
          <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} style={campo}/>
        </div>
        <div>
          <label style={{fontSize:'12px', color:'#666'}}>Cliente</label><br/>
          <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} style={campo}>
            <option value="">Todos</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <button
          onClick={() => { setFiltroSituacao(''); setFiltroDataInicio(''); setFiltroDataFim(''); setFiltroCliente('') }}
          style={{background:'#e94560', border:'none', padding:'8px 14px', borderRadius:'6px', cursor:'pointer', fontSize:'13px'}}
        >
          🧹 Limpar
        </button>
        <div style={{marginLeft:'auto', color:'#666', fontSize:'13px', whiteSpace:'nowrap'}}>
          {vendasFiltradas.length} venda(s)
        </div>
      </div>

      {/* Mensagem de sucesso */}
      {mensagem && !pagamentoVenda && (
        <div style={{background:'#e8f5e9', border:'1px solid #4caf50', borderRadius:'8px', padding:'12px 16px', marginTop:'12px', color:'green'}}>
          {mensagem}
        </div>
      )}

      {/* Tabela */}
      <div className="tabela-wrapper" style={{marginTop:'16px'}}>
        <table>
          <thead>
            <tr>
              <th style={{textAlign:'left'}}>Cliente</th>
              <th style={{textAlign:'left'}}>Vendedor</th>
              <th style={{textAlign:'left'}}>Produtos</th>
              <th style={{textAlign:'right'}}>Total</th>
              <th style={{textAlign:'right'}}>Desconto</th>
              <th style={{textAlign:'right'}}>Recebido</th>
              <th style={{textAlign:'right'}}>Falta</th>
              <th style={{textAlign:'center'}}>Vencimento</th>
              <th style={{textAlign:'center'}}>Situação</th>
              <th style={{textAlign:'left'}}>Observação</th>
              <th style={{textAlign:'center'}}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {vendasFiltradas.map((venda, i) => {
              const devs = devolucoesVenda(venda.id)
              return (
                <>
                  <tr key={venda.id} style={{background: i % 2 === 0 ? '#fff' : '#f9f9f9'}}>
                    <td style={{textAlign:'left'}}>
                      <strong>{venda.clientes?.nome}</strong><br/>
                      <small style={{color:'#888'}}>{venda.clientes?.telefone}</small>
                    </td>
                    <td style={{textAlign:'left', fontSize:'13px'}}>
                      {venda.vendedor || '—'}
                    </td>
                    <td style={{textAlign:'left'}}>
                      <span
                        onClick={() => setVendaExpandida(vendaExpandida === venda.id ? null : venda.id)}
                        style={{cursor:'pointer', color:'#1a6b5a', textDecoration:'underline', fontSize:'13px', whiteSpace:'nowrap'}}
                      >
                        {venda.itens?.length} produto(s)
                      </span>
                    </td>
                    <td style={{textAlign:'right'}}><strong>R$ {parseFloat(venda.valor_total).toFixed(2)}</strong></td>
                    <td style={{textAlign:'right', color: parseFloat(venda.desconto || 0) > 0 ? '#e65100' : '#aaa', fontSize:'13px'}}>
                      {parseFloat(venda.desconto || 0) > 0
                        ? `- R$ ${parseFloat(venda.desconto).toFixed(2)}`
                        : '—'}
                    </td>
                    <td style={{textAlign:'right', color:'green'}}>R$ {parseFloat(venda.recebido || 0).toFixed(2)}</td>
                    <td style={{textAlign:'right', color:'red'}}>R$ {(parseFloat(venda.valor_total) - parseFloat(venda.recebido || 0)).toFixed(2)}</td>
                    <td style={{textAlign:'center', whiteSpace:'nowrap'}}>
                      {venda.data_para_pagar ? new Date(venda.data_para_pagar + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{textAlign:'center'}}>
                      <span style={{...corSituacao(venda.situacao_real), padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'bold', whiteSpace:'nowrap'}}>
                        {venda.situacao_real}
                      </span>
                    </td>
                    <td style={{textAlign:'left', fontSize:'12px', color:'#555', maxWidth:'150px'}}>
                      {venda.observacao || '—'}
                    </td>
                    <td style={{textAlign:'center'}}>
                      {devs.length > 0 ? (
                        <span style={{color:'#e65100', fontSize:'12px', whiteSpace:'nowrap', fontWeight:'bold'}}>
                          ↩ Devolvido
                        </span>
                      ) : venda.situacao_real === 'Pago' ? (
                        <span style={{color:'green', fontSize:'12px', whiteSpace:'nowrap'}}>✅ Pago</span>
                      ) : (
                        <button
                          onClick={() => { setPagamentoVenda(venda); setMensagem('') }}
                          style={{background:'#1a6b5a', color:'white', border:'none', padding:'6px 10px', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'bold', whiteSpace:'nowrap'}}
                        >
                          💰 Pagar
                        </button>
                      )}
                    </td>
                  </tr>

                  {vendaExpandida === venda.id && (
                    <tr key={venda.id + '_det'}>
                      <td colSpan="11" style={{background:'#f0f4ff', padding:'12px 16px'}}>
                        <div style={{display:'flex', gap:'16px', marginBottom:'10px', fontSize:'13px', flexWrap:'wrap'}}>
                          <span><strong>Vendedor:</strong> {venda.vendedor || '—'}</span>
                          {parseFloat(venda.desconto || 0) > 0 && (
                            <span style={{color:'#e65100'}}>
                              <strong>Desconto aplicado:</strong> - R$ {parseFloat(venda.desconto).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <strong style={{fontSize:'13px', color:'#1a6b5a'}}>Produtos:</strong>
                        <div style={{marginTop:'8px', display:'flex', flexWrap:'wrap', gap:'8px'}}>
                          {venda.itens?.map(item => (
                            <span key={item.id} style={{background:'white', border:'1px solid #ddd', padding:'6px 12px', borderRadius:'8px', fontSize:'12px'}}>
                              {item.produtos?.nome} — {item.quantidade}x — R$ {parseFloat(item.valor_unitario).toFixed(2)}
                            </span>
                          ))}
                        </div>
                        {devs.length > 0 && (
                          <div style={{marginTop:'10px'}}>
                            <strong style={{fontSize:'13px', color:'#e94560'}}>Devoluções:</strong>
                            <div style={{marginTop:'6px', display:'flex', flexWrap:'wrap', gap:'8px'}}>
                              {devs.map(d => (
                                <span key={d.id} style={{background:'#fff0f3', border:'1px solid #e94560', padding:'6px 12px', borderRadius:'8px', fontSize:'12px'}}>
                                  {d.produtos?.nome} — {d.quantidade}x — R$ {parseFloat(d.valor_total).toFixed(2)} — {d.motivo}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
        {vendasFiltradas.length === 0 && (
          <p style={{textAlign:'center', padding:'32px', color:'#aaa', background:'white'}}>Nenhuma venda encontrada</p>
        )}
      </div>
    </div>
  )
}

export default Historico