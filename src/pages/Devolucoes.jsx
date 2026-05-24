// Importa os hooks necessários
import { useState, useEffect } from 'react'
// Importa a conexão com o Supabase
import { supabase } from '../supabase'
import {ShoppingCart, ClipboardList, RotateCcw, Package, TrendingUp, Boxes, Users, DollarSign, History, BarChart3, FileText} from 'lucide-react'
import PageHeader from '../components/PageHeader'

function Devolucoes() {
  const [clientes, setClientes] = useState([])
  const [clienteSelecionado, setClienteSelecionado] = useState('')
  const [vendas, setVendas] = useState([])
  const [vendaSelecionada, setVendaSelecionada] = useState(null)
  const [itens, setItens] = useState([])
  const [itensSelecionados, setItensSelecionados] = useState([])
  const [motivo, setMotivo] = useState('')
  const [mensagem, setMensagem] = useState('')

  // Carrega os clientes ao abrir a tela
  useEffect(() => {
    supabase.from('clientes').select('*').order('nome').then(({ data }) => {
      if (data) setClientes(data)
    })
  }, [])

  // Busca as vendas do cliente selecionado
  async function buscarVendas(clienteId) {
    if (!clienteId) return
    const { data } = await supabase
      .from('vendas')
      .select('*, clientes(nome), desconto, valor_bruto')
      .eq('cliente_id', clienteId)
      .order('data_venda', { ascending: false })
    if (!data || data.length === 0) { setMensagem('Nenhuma venda encontrada!'); return }
    setVendas(data)
    setMensagem('')
  }

  // Seleciona uma venda e carrega os itens disponíveis para devolução
  async function selecionarVenda(venda) {
    setVendaSelecionada(venda)

    const { data: itensVenda } = await supabase
      .from('itens_venda')
      .select('*, produtos(nome, codigo)')
      .eq('venda_id', venda.id)

    const { data: devolucoesFeitas } = await supabase
      .from('devolucoes')
      .select('produto_id, quantidade')
      .eq('venda_id', venda.id)

    const itensDisponiveis = (itensVenda || []).map(item => {
      const jaDevolvido = (devolucoesFeitas || [])
        .filter(d => d.produto_id === item.produto_id)
        .reduce((acc, d) => acc + d.quantidade, 0)
      const qtdDisponivel = item.quantidade - jaDevolvido
      return { ...item, qtd_disponivel: qtdDisponivel }
    }).filter(item => item.qtd_disponivel > 0)

    setItens(itensDisponiveis)
    setItensSelecionados([])
  }

  // Marca ou desmarca um item para devolução
  function toggleItem(item) {
    const existe = itensSelecionados.find(i => i.id === item.id)
    if (existe) {
      setItensSelecionados(itensSelecionados.filter(i => i.id !== item.id))
    } else {
      setItensSelecionados([...itensSelecionados, { ...item, qtd_devolver: 1 }])
    }
  }

  // Altera a quantidade a devolver, respeitando o máximo disponível
  function alterarQtd(id, qtd, qtdMaxima) {
    const qtdValidada = Math.min(Math.max(1, qtd || 1), qtdMaxima)
    setItensSelecionados(itensSelecionados.map(i => i.id === id ? { ...i, qtd_devolver: qtdValidada } : i))
  }

  // Calcula o valor unitário efetivamente pago (com desconto proporcional)
  function calcularValorPago(item, venda) {
    const valorBruto = parseFloat(venda.valor_bruto || 0)
    const proporcao = valorBruto > 0 ? (valorBruto - parseFloat(venda.desconto || 0)) / valorBruto : 1
    return parseFloat(item.valor_unitario) * proporcao
  }

  // Calcula o valor total a devolver exibido na tela
  const totalDevolver = itensSelecionados.reduce((acc, i) => {
    const valorPago = vendaSelecionada ? calcularValorPago(i, vendaSelecionada) : i.valor_unitario
    return acc + (i.qtd_devolver * valorPago)
  }, 0)

  // Confirma e registra a devolução
  async function registrarDevolucao() {
    if (itensSelecionados.length === 0) { setMensagem('Selecione pelo menos um produto!'); return }
    if (!motivo) { setMensagem('Selecione o motivo da devolução!'); return }

    for (const item of itensSelecionados) {
      const { data: prod } = await supabase.from('produtos').select('estoque').eq('id', item.produto_id).single()
      await supabase.from('produtos').update({ estoque: prod.estoque + item.qtd_devolver }).eq('id', item.produto_id)
      await supabase.from('devolucoes').insert({
        cliente_id: vendaSelecionada.cliente_id,
        produto_id: item.produto_id,
        venda_id: vendaSelecionada.id,
        quantidade: item.qtd_devolver,
        valor_unitario: calcularValorPago(item, vendaSelecionada),
        motivo: motivo
      })
    }

    const novoRecebido = Math.max(0, parseFloat(vendaSelecionada.recebido) - totalDevolver)
    const novoTotal = Math.max(0, parseFloat(vendaSelecionada.valor_total) - totalDevolver)
    await supabase.from('vendas').update({
      valor_total: novoTotal,
      recebido: novoRecebido,
      observacao: (vendaSelecionada.observacao || '') + ` | Devolução (${motivo}): R$ ${totalDevolver.toFixed(2)}`
    }).eq('id', vendaSelecionada.id)

    setMensagem(`Devolução registrada! Motivo: ${motivo} | Valor a devolver: R$ ${totalDevolver.toFixed(2)}`)
    setVendaSelecionada(null)
    setItens([])
    setItensSelecionados([])
    setVendas([])
    setClienteSelecionado('')
    setMotivo('')
  }

  const campo = { width:'100%', padding:'10px', marginTop:'6px', borderRadius:'6px', border:'1px solid #ddd' }

  return (
    <div>
      <PageHeader
        title="Devoluções"
        subtitle="Controle de trocas e produtos devolvidos"
        icon={<RotateCcw size={22} color="white" />}
      />
      <div style={{background:'white', padding:'24px', borderRadius:'12px', maxWidth:'700px', marginTop:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>

        {/* Dropdown de seleção de cliente */}
        <div style={{marginBottom:'16px'}}>
          <label style={{fontWeight:'bold', fontSize:'13px'}}>Cliente</label><br/>
          <select
            value={clienteSelecionado}
            onChange={e => {
              setClienteSelecionado(e.target.value)
              setVendas([])
              setVendaSelecionada(null)
              setItens([])
              setItensSelecionados([])
              buscarVendas(e.target.value)
            }}
            style={campo}
          >
            <option value="">Selecione o cliente...</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>

        {/* Lista de vendas do cliente para seleção */}
        {vendas.length > 0 && !vendaSelecionada && (
          <div style={{marginBottom:'16px'}}>
            <label style={{fontWeight:'bold', fontSize:'13px'}}>Selecione a venda:</label>
            {vendas.map(v => (
              <div
                key={v.id}
                onClick={() => selecionarVenda(v)}
                style={{padding:'12px', border:'1px solid #ddd', borderRadius:'8px', marginTop:'8px', cursor:'pointer', background:'#f8f8f8'}}
              >
                <strong>{v.clientes?.nome}</strong> — R$ {parseFloat(v.valor_total).toFixed(2)} — {v.situacao}<br/>
                <small style={{color:'#666'}}>Vencimento: {v.data_para_pagar ? new Date(v.data_para_pagar + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</small>
              </div>
            ))}
          </div>
        )}

        {/* Área de seleção de itens após escolher a venda */}
        {vendaSelecionada && (
          <div>
            <div style={{background:'#f0f9f0', border:'1px solid #4caf50', borderRadius:'8px', padding:'12px', marginBottom:'16px'}}>
              <strong>✅ Venda selecionada</strong> — {vendaSelecionada.clientes?.nome} — R$ {parseFloat(vendaSelecionada.valor_bruto || 0).toFixed(2)} (bruto) — Desconto: R$ {parseFloat(vendaSelecionada.desconto || 0).toFixed(2)}
            </div>

            <label style={{fontWeight:'bold', fontSize:'13px'}}>Selecione os produtos a devolver:</label>

            {itens.length === 0 && (
              <p style={{color:'#e94560', marginTop:'8px', fontSize:'14px'}}>
                ⚠️ Todos os itens desta venda já foram devolvidos anteriormente.
              </p>
            )}

            {itens.map(item => {
              const selecionado = itensSelecionados.find(i => i.id === item.id)
              const valorPago = vendaSelecionada ? calcularValorPago(item, vendaSelecionada) : item.valor_unitario
              return (
                <div key={item.id} style={{padding:'12px', border:`1px solid ${selecionado ? '#e94560' : '#ddd'}`, borderRadius:'8px', marginTop:'8px', background: selecionado ? '#fff0f3' : '#f8f8f8'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div>
                      <input type="checkbox" checked={!!selecionado} onChange={() => toggleItem(item)} style={{marginRight:'8px'}}/>
                      <strong>{item.produtos?.nome}</strong><br/>
                      <small style={{color:'#666', marginLeft:'24px'}}>
                        Disponível: {item.qtd_disponivel} un. — R$ {valorPago.toFixed(2)} cada (pago)
                      </small>
                    </div>
                    {selecionado && (
                      <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                        <label style={{fontSize:'12px'}}>Qtd:</label>
                        <input
                          type="number"
                          min="1"
                          max={item.qtd_disponivel}
                          value={selecionado.qtd_devolver}
                          onChange={e => alterarQtd(item.id, parseInt(e.target.value), item.qtd_disponivel)}
                          style={{width:'60px', padding:'4px', borderRadius:'4px', border:'1px solid #ddd'}}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {itens.length > 0 && (
              <div style={{marginTop:'16px'}}>
                <label style={{fontWeight:'bold', fontSize:'13px'}}>Motivo da Devolução</label><br/>
                <select value={motivo} onChange={e => setMotivo(e.target.value)} style={campo}>
                  <option value="">Selecione o motivo...</option>
                  <option value="Desistência">Desistência</option>
                  <option value="Código Errado">Código Errado</option>
                  <option value="Produto Danificado">Produto Danificado</option>
                </select>
              </div>
            )}

            {itensSelecionados.length > 0 && (
              <div style={{marginTop:'16px', padding:'16px', background:'#fff3f3', borderRadius:'8px', border:'1px solid #e94560'}}>
                <strong>💰 Valor a devolver ao cliente: R$ {totalDevolver.toFixed(2)}</strong>
              </div>
            )}

            {itens.length > 0 && (
              <button
                onClick={registrarDevolucao}
                style={{background:'#e94560', color:'white', border:'none', padding:'12px 24px', borderRadius:'8px', cursor:'pointer', fontSize:'16px', width:'100%', marginTop:'16px', fontWeight:'bold'}}
              >
                Confirmar Devolução
              </button>
            )}

            <button
              onClick={() => {
                setVendaSelecionada(null)
                setItens([])
                setItensSelecionados([])
                setMotivo('')
              }}
              style={{background:'#eee', color:'#333', border:'none', padding:'12px 24px', borderRadius:'8px', cursor:'pointer', fontSize:'14px', width:'100%', marginTop:'8px'}}
            >
              Cancelar
            </button>
          </div>
        )}

        {mensagem && (
          <p style={{marginTop:'16px', color: mensagem.includes('registrada') ? 'green' : 'red', fontSize:'14px'}}>
            {mensagem}
          </p>
        )}
      </div>
    </div>
  )
}

export default Devolucoes
