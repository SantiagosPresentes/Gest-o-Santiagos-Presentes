import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import html2canvas from 'html2canvas'
import { History, FilterX } from 'lucide-react'
import PageHeader from '../components/PageHeader'

const PAGE_SIZE = 30

function SkeletonRow() {
  return (
    <tr>
      {[...Array(12)].map((_, i) => (
        <td key={i} style={{ padding: '12px 8px' }}>
          <div style={{
            height: 16,
            borderRadius: 6,
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e4e4e4 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.3s infinite',
            width: i === 0 ? '80%' : i === 10 ? '60%' : '70%',
          }} />
        </td>
      ))}
    </tr>
  )
}

function Historico() {
  const [vendas, setVendas] = useState([])
  const [devolucoes, setDevolucoes] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagina, setPagina] = useState(0)
  const [totalVendas, setTotalVendas] = useState(0)

  const [filtroSituacao, setFiltroSituacao] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')

  const [vendaExpandida, setVendaExpandida] = useState(null)
  const [pagamentoVenda, setPagamentoVenda] = useState(null)
  const [valorPago, setValorPago] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [comprovanteVenda, setComprovanteVenda] = useState(null)
  const comprovanteRef = useRef(null)

  // Carrega clientes uma única vez
  useEffect(() => {
    supabase
      .from('clientes')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => { if (data) setClientes(data) })
  }, [])

  // Recarrega vendas quando página ou filtros mudam
  useEffect(() => {
    carregarDados()
  }, [pagina, filtroSituacao, filtroDataInicio, filtroDataFim, filtroCliente])

  function calcularSituacao(venda, devolucoesLista = []) {
    const devs = devolucoesLista.filter(d => String(d.venda_id) === String(venda.id))
    if (devs.length > 0) {
      const totalDevolvido = devs.reduce((acc, d) => acc + parseFloat(d.valor_total || 0), 0)
      const referencia = parseFloat(venda.valor_bruto || venda.valor_total || 0)
      const zerada = parseFloat(venda.valor_total || 0) === 0
      const obsDevolvida = venda.observacao && venda.observacao.toLowerCase().includes('devolução')
      const valorCobre = referencia > 0 && totalDevolvido >= referencia - 0.01
      if (zerada || obsDevolvida || valorCobre) return 'Devolvido'
    }
    if (parseFloat(venda.recebido) >= parseFloat(venda.valor_total) && parseFloat(venda.valor_total) > 0) return 'Pago'
    if (!venda.data_para_pagar) return 'Pendente'
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const vencimento = new Date(venda.data_para_pagar + 'T12:00:00')
    if (hoje > vencimento) return 'Atrasado'
    return 'Pendente'
  }

  const carregarDados = useCallback(async () => {
    setLoading(true)
    try {
      // Busca vendas e devoluções em paralelo
      const [vendasRes, devolucoesRes] = await Promise.all([
        supabase
          .from('vendas')
          .select(
            `id, data_venda, data_para_pagar, valor_total, valor_bruto,
             recebido, desconto, observacao, vendedor_nome, situacao, cliente_id,
             clientes!vendas_cliente_id_fkey(nome, telefone)`,
            { count: 'exact' }
          )
          .order('data_venda', { ascending: false })
          .range(pagina * PAGE_SIZE, (pagina + 1) * PAGE_SIZE - 1),

        supabase
          .from('devolucoes')
          .select('id, cliente_id, produto_id, venda_id, quantidade, valor_unitario, valor_total, motivo, criado_em')
          .order('criado_em', { ascending: false }),
      ])

      const vendasData = vendasRes.data || []
      const devs = devolucoesRes.data || []

      setTotalVendas(vendasRes.count || 0)
      setDevolucoes(devs)

      if (vendasData.length === 0) {
        setVendas([])
        return
      }

      // UMA query para todos os itens da página — elimina N+1
      const ids = vendasData.map(v => v.id)
      const { data: todosItens } = await supabase
        .from('itens_venda')
        .select('id, venda_id, quantidade, valor_unitario, produtos(nome)')
        .in('venda_id', ids)

      // Agrupa itens por venda localmente
      const itensPorVenda = {}
      for (const item of todosItens || []) {
        if (!itensPorVenda[item.venda_id]) itensPorVenda[item.venda_id] = []
        itensPorVenda[item.venda_id].push(item)
      }

      const vendasComItens = vendasData.map(venda => ({
        ...venda,
        itens: itensPorVenda[venda.id] || [],
        situacao_real: calcularSituacao(venda, devs),
      }))

      setVendas(vendasComItens)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }, [pagina, filtroSituacao, filtroDataInicio, filtroDataFim, filtroCliente])

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

  // Filtro de situação e data aplicado client-side na página atual
  const vendasFiltradas = vendas.filter(v => {
    if (filtroCliente && v.cliente_id !== filtroCliente) return false
    if (filtroSituacao && v.situacao_real !== filtroSituacao) return false
    if (filtroDataInicio && v.data_para_pagar < filtroDataInicio) return false
    if (filtroDataFim && v.data_para_pagar > filtroDataFim) return false
    return true
  })

  function limparFiltros() {
    setFiltroSituacao('')
    setFiltroDataInicio('')
    setFiltroDataFim('')
    setFiltroCliente('')
    setPagina(0)
  }

  function corSituacao(situacao) {
    if (situacao === 'Pago')      return { background: '#e8f5e9', color: 'green' }
    if (situacao === 'Atrasado')  return { background: '#ffebee', color: 'red' }
    if (situacao === 'Devolvido') return { background: '#fff0f3', color: '#e94560' }
    return { background: '#fff8e1', color: '#f57f17' }
  }

  function devolucoesVenda(vendaId) {
    return devolucoes.filter(d => String(d.venda_id) === String(vendaId))
  }

  function extrairParcelas(venda) {
    if (!venda.observacao) return null
    const match = venda.observacao.match(/(\d+)x:(.+?)(?:\||$)/)
    if (!match) return null
    return { qtd: match[1], detalhe: match[2].trim() }
  }

  async function imprimirComprovante() {
    const conteudo = comprovanteRef.current.innerHTML
    const janela = window.open('', '_blank')
    janela.document.write(`
      <html><head><title>Comprovante - Santiagos Presentes</title>
      <style>* { margin:0; padding:0; box-sizing:border-box; } body { font-family:Arial,sans-serif; padding:20px; max-width:400px; margin:0 auto; } @media print { button { display:none; } }</style>
      </head><body>${conteudo}</body></html>
    `)
    janela.document.close()
    janela.focus()
    setTimeout(() => { janela.print() }, 500)
  }

  async function compartilharComprovante() {
    try {
      const canvas = await html2canvas(comprovanteRef.current, { scale: 2, useCORS: true })
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'comprovante-santiagos.png', { type: 'image/png' })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Comprovante - Santiagos Presentes' })
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = 'comprovante-santiagos.png'; a.click()
          URL.revokeObjectURL(url)
        }
      }, 'image/png')
    } catch (err) { console.error('Erro ao compartilhar:', err) }
  }

  const campo = { padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }
  const temFiltroAtivo = filtroSituacao !== '' || filtroDataInicio !== '' || filtroDataFim !== '' || filtroCliente !== ''
  const totalPaginas = Math.ceil(totalVendas / PAGE_SIZE)

  return (
    <div style={{ background: '#f4f6f9', minHeight: '100vh', padding: '0 0 40px 0' }}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <PageHeader
        title="Histórico"
        subtitle="Gerencie seu histórico de vendas"
        icon={<History size={22} color="white" />}
      />

      {/* ── Modal Comprovante ── */}
      {comprovanteVenda && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <div ref={comprovanteRef} style={{ padding: '24px' }}>
              <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                <img src="/logo.png" alt="Logo" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #1a6b5a' }} />
                <h2 style={{ color: '#1a6b5a', fontSize: '18px', marginTop: '8px' }}>Santiagos Presentes</h2>
                <p style={{ color: '#666', fontSize: '13px' }}>📞 (24) 98161-8699</p>
                <p style={{ color: '#999', fontSize: '12px' }}>
                  {comprovanteVenda.data_venda
                    ? new Date(comprovanteVenda.data_venda).toLocaleDateString('pt-BR')
                    : new Date(comprovanteVenda.data_para_pagar + 'T12:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div style={{ borderTop: '1px dashed #999', margin: '12px 0' }} />
              <div style={{ marginBottom: '12px', fontSize: '14px' }}>
                <strong style={{ color: '#1a6b5a' }}>Cliente:</strong> {comprovanteVenda.clientes?.nome}<br />
                {comprovanteVenda.clientes?.telefone && (
                  <span style={{ color: '#666', fontSize: '13px' }}>📞 {comprovanteVenda.clientes.telefone}</span>
                )}
              </div>
              <div style={{ borderTop: '1px dashed #999', margin: '12px 0' }} />
              <div style={{ marginBottom: '8px' }}><strong style={{ fontSize: '13px', color: '#555' }}>PRODUTOS</strong></div>
              {comprovanteVenda.itens?.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ flex: 1, paddingRight: '8px' }}>{item.produtos?.nome}</span>
                  <span style={{ color: '#666', marginRight: '8px' }}>{item.quantidade}x R$ {parseFloat(item.valor_unitario).toFixed(2)}</span>
                  <strong>R$ {(item.quantidade * parseFloat(item.valor_unitario)).toFixed(2)}</strong>
                </div>
              ))}
              <div style={{ borderTop: '2px solid #333', margin: '12px 0' }} />
              {parseFloat(comprovanteVenda.desconto || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#2e7d32', marginBottom: '4px' }}>
                  <span>Desconto</span>
                  <span>- R$ {parseFloat(comprovanteVenda.desconto).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', color: '#1a6b5a', marginBottom: '8px' }}>
                <span>TOTAL</span>
                <span>R$ {parseFloat(comprovanteVenda.valor_total).toFixed(2)}</span>
              </div>
              {(() => {
                const parcelas = extrairParcelas(comprovanteVenda)
                if (parcelas) {
                  return (
                    <div style={{ background: '#f8f8f8', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '13px', color: '#555' }}>PARCELAMENTO — {parcelas.qtd}x</strong>
                      <p style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>{parcelas.detalhe}</p>
                    </div>
                  )
                }
                return (
                  <div style={{ fontSize: '13px', color: '#555', marginBottom: '8px' }}>
                    <strong>Vencimento:</strong> {comprovanteVenda.data_para_pagar
                      ? new Date(comprovanteVenda.data_para_pagar + 'T12:00:00').toLocaleDateString('pt-BR')
                      : '—'}
                  </div>
                )
              })()}
              {comprovanteVenda.observacao && (() => {
                const obsLimpa = comprovanteVenda.observacao
                  .replace(/\d+x:.+?(\||$)/, '')
                  .replace(/Desconto: R\$ [\d.]+/, '')
                  .replace(/^\s*\|\s*/, '')
                  .replace(/\|\s*$/, '')
                  .trim()
                return obsLimpa ? (
                  <p style={{ fontSize: '12px', color: '#777', fontStyle: 'italic', marginTop: '8px' }}>Obs: {obsLimpa}</p>
                ) : null
              })()}
              {comprovanteVenda.vendedor_nome && (
                <p style={{ fontSize: '11px', color: '#bbb', marginTop: '8px', textAlign: 'right' }}>
                  Vendedor: {comprovanteVenda.vendedor_nome}
                </p>
              )}
              <div style={{ borderTop: '1px dashed #999', margin: '12px 0' }} />
              <p style={{ textAlign: 'center', fontSize: '12px', color: '#999' }}>Obrigado pela preferência!<br />Santiagos Presentes 🏪</p>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', gap: '8px' }}>
              <button onClick={imprimirComprovante} style={{ flex: 1, background: 'linear-gradient(135deg, #1a6b5a, #145a4a)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}>
                🖨️ Imprimir
              </button>
              <button onClick={compartilharComprovante} style={{ flex: 1, background: 'linear-gradient(135deg, #1a6b5a, #145a4a)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}>
                📤 Compartilhar
              </button>
              <button onClick={() => setComprovanteVenda(null)} style={{ flex: 1, background: '#eee', color: '#333', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px' }}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Pagamento ── */}
      {pagamentoVenda && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <h3 style={{ marginBottom: '8px', color: '#1a6b5a' }}>Registrar Pagamento</h3>
            <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>
              Cliente: <strong>{pagamentoVenda.clientes?.nome}</strong><br />
              Total: <strong>R$ {parseFloat(pagamentoVenda.valor_total).toFixed(2)}</strong><br />
              Já recebido: <strong style={{ color: 'green' }}>R$ {parseFloat(pagamentoVenda.recebido || 0).toFixed(2)}</strong><br />
              Falta: <strong style={{ color: 'red' }}>R$ {(parseFloat(pagamentoVenda.valor_total) - parseFloat(pagamentoVenda.recebido || 0)).toFixed(2)}</strong>
            </p>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Valor recebido agora (R$)</label><br />
            <input
              type="number"
              value={valorPago}
              onChange={e => setValorPago(e.target.value)}
              placeholder="Ex: 50.00"
              style={{ width: '100%', padding: '10px', marginTop: '6px', marginBottom: '16px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '16px' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={registrarPagamento} style={{ flex: 1, background: 'linear-gradient(135deg, #1a6b5a, #145a4a)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}>
                Confirmar
              </button>
              <button onClick={() => { setPagamentoVenda(null); setValorPago(''); setMensagem('') }} style={{ flex: 1, background: '#eee', color: '#333', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px' }}>
                Cancelar
              </button>
            </div>
            {mensagem && <p style={{ marginTop: '12px', color: mensagem.includes('sucesso') ? 'green' : 'red', fontSize: '14px' }}>{mensagem}</p>}
          </div>
        </div>
      )}

      {/* ── Filtros ── */}
      <div style={{ background: 'white', padding: '16px', borderRadius: '12px', marginTop: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: '12px', color: '#666' }}>Situação</label><br />
          <select value={filtroSituacao} onChange={e => { setFiltroSituacao(e.target.value); setPagina(0) }} style={campo}>
            <option value="">Todas</option>
            <option value="Pendente">Pendente</option>
            <option value="Atrasado">Atrasado</option>
            <option value="Pago">Pago</option>
            <option value="Devolvido">Devolvido</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', color: '#666' }}>Data (de)</label><br />
          <input type="date" value={filtroDataInicio} onChange={e => { setFiltroDataInicio(e.target.value); setPagina(0) }} style={campo} />
        </div>
        <div>
          <label style={{ fontSize: '12px', color: '#666' }}>Data (até)</label><br />
          <input type="date" value={filtroDataFim} onChange={e => { setFiltroDataFim(e.target.value); setPagina(0) }} style={campo} />
        </div>
        <div>
          <label style={{ fontSize: '12px', color: '#666' }}>Cliente</label><br />
          <select value={filtroCliente} onChange={e => { setFiltroCliente(e.target.value); setPagina(0) }} style={campo}>
            <option value="">Todos</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <button
          onClick={limparFiltros}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', borderRadius: '8px',
            border: temFiltroAtivo ? '1px solid #e94560' : '1px solid #c0392b',
            background: temFiltroAtivo ? '#e94560' : '#fff',
            color: temFiltroAtivo ? 'white' : '#c0392b',
            fontSize: '13px', fontWeight: '500',
            cursor: temFiltroAtivo ? 'pointer' : 'default',
            transition: 'all 0.2s ease',
            opacity: temFiltroAtivo ? 1 : 0.6,
          }}
          disabled={!temFiltroAtivo}
        >
          <FilterX size={15} />
          Limpar filtros
        </button>
        <div style={{ marginLeft: 'auto', color: '#666', fontSize: '13px', whiteSpace: 'nowrap' }}>
          {loading ? '...' : `${totalVendas} venda(s)`}
        </div>
      </div>

      {/* ── Mensagem de sucesso ── */}
      {mensagem && !pagamentoVenda && (
        <div style={{ background: '#e8f5e9', border: '1px solid #4caf50', borderRadius: '8px', padding: '12px 16px', marginTop: '12px', color: 'green' }}>
          {mensagem}
        </div>
      )}

      {/* ── Tabela ── */}
      <div className="tabela-wrapper" style={{ marginTop: '16px' }}>
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Cliente</th>
              <th style={{ textAlign: 'left' }}>Vendedor</th>
              <th style={{ textAlign: 'left' }}>Produtos</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th style={{ textAlign: 'right' }}>Desconto</th>
              <th style={{ textAlign: 'right' }}>Recebido</th>
              <th style={{ textAlign: 'right' }}>Falta</th>
              <th style={{ textAlign: 'center' }}>Vencimento</th>
              <th style={{ textAlign: 'center' }}>Situação</th>
              <th style={{ textAlign: 'left' }}>Observação</th>
              <th style={{ textAlign: 'center' }}>Ação</th>
              <th style={{ textAlign: 'center' }}>Comprovante</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
              : vendasFiltradas.map((venda, i) => {
                  const devs = devolucoesVenda(venda.id)
                  return (
                    <>
                      <tr key={venda.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                        <td style={{ textAlign: 'left' }}>
                          <strong>{venda.clientes?.nome}</strong><br />
                          <small style={{ color: '#888' }}>{venda.clientes?.telefone}</small>
                        </td>
                        <td style={{ textAlign: 'left', fontSize: '13px' }}>
                          {venda.vendedor_nome || '—'}
                        </td>
                        <td style={{ textAlign: 'left' }}>
                          <span
                            onClick={() => setVendaExpandida(vendaExpandida === venda.id ? null : venda.id)}
                            style={{ cursor: 'pointer', color: '#1a6b5a', textDecoration: 'underline', fontSize: '13px', whiteSpace: 'nowrap' }}
                          >
                            {venda.itens?.length} produto(s)
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}><strong>R$ {parseFloat(venda.valor_total).toFixed(2)}</strong></td>
                        <td style={{ textAlign: 'right', color: parseFloat(venda.desconto || 0) > 0 ? '#e65100' : '#aaa', fontSize: '13px' }}>
                          {parseFloat(venda.desconto || 0) > 0 ? `- R$ ${parseFloat(venda.desconto).toFixed(2)}` : '—'}
                        </td>
                        <td style={{ textAlign: 'right', color: 'green' }}>R$ {parseFloat(venda.recebido || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', color: 'red' }}>R$ {(parseFloat(venda.valor_total) - parseFloat(venda.recebido || 0)).toFixed(2)}</td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {venda.data_para_pagar ? new Date(venda.data_para_pagar + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ ...corSituacao(venda.situacao_real), padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                            {venda.situacao_real}
                          </span>
                        </td>
                        <td style={{ textAlign: 'left', fontSize: '12px', color: '#555', maxWidth: '150px' }}>
                          {venda.observacao || '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {venda.situacao_real === 'Devolvido' ? (
                            <span style={{ color: '#e94560', fontSize: '12px', whiteSpace: 'nowrap', fontWeight: 'bold' }}>↩ Devolvido</span>
                          ) : venda.situacao_real === 'Pago' ? (
                            <span style={{ color: 'green', fontSize: '12px', whiteSpace: 'nowrap' }}>✅ Pago</span>
                          ) : (
                            <button
                              onClick={() => { setPagamentoVenda(venda); setMensagem('') }}
                              style={{ background: '#1a6b5a', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}
                            >
                              💰 Pagar
                            </button>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => setComprovanteVenda(venda)}
                            style={{ background: '#f0f4ff', color: '#3b5bdb', border: '1px solid #c5d0f5', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap', fontWeight: 'bold' }}
                          >
                            🧾 Ver
                          </button>
                        </td>
                      </tr>

                      {vendaExpandida === venda.id && (
                        <tr key={venda.id + '_det'}>
                          <td colSpan="12" style={{ background: '#f0f4ff', padding: '12px 16px' }}>
                            <div style={{ display: 'flex', gap: '16px', marginBottom: '10px', fontSize: '13px', flexWrap: 'wrap' }}>
                              <span><strong>Vendedor:</strong> {venda.vendedor_nome || '—'}</span>
                              {parseFloat(venda.desconto || 0) > 0 && (
                                <span style={{ color: '#e65100' }}>
                                  <strong>Desconto aplicado:</strong> - R$ {parseFloat(venda.desconto).toFixed(2)}
                                </span>
                              )}
                            </div>
                            <strong style={{ fontSize: '13px', color: '#1a6b5a' }}>Produtos:</strong>
                            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {venda.itens?.map(item => (
                                <span key={item.id} style={{ background: 'white', border: '1px solid #ddd', padding: '6px 12px', borderRadius: '8px', fontSize: '12px' }}>
                                  {item.produtos?.nome} — {item.quantidade}x — R$ {parseFloat(item.valor_unitario).toFixed(2)}
                                </span>
                              ))}
                            </div>
                            {devs.length > 0 && (
                              <div style={{ marginTop: '10px' }}>
                                <strong style={{ fontSize: '13px', color: '#e94560' }}>Devoluções:</strong>
                                <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                  {devs.map(d => (
                                    <span key={d.id} style={{ background: '#fff0f3', border: '1px solid #e94560', padding: '6px 12px', borderRadius: '8px', fontSize: '12px' }}>
                                      {d.motivo} — {d.quantidade}x — R$ {parseFloat(d.valor_total).toFixed(2)}
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
                })
            }
          </tbody>
        </table>

        {!loading && vendasFiltradas.length === 0 && (
          <p style={{ textAlign: 'center', padding: '32px', color: '#aaa', background: 'white' }}>
            Nenhuma venda encontrada
          </p>
        )}
      </div>

      {/* ── Paginação ── */}
      {!loading && totalPaginas > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setPagina(0)}
            disabled={pagina === 0}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', background: pagina === 0 ? '#f5f5f5' : 'white', color: pagina === 0 ? '#bbb' : '#333', cursor: pagina === 0 ? 'default' : 'pointer', fontSize: '13px' }}
          >
            ««
          </button>
          <button
            onClick={() => setPagina(p => Math.max(0, p - 1))}
            disabled={pagina === 0}
            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #ddd', background: pagina === 0 ? '#f5f5f5' : 'white', color: pagina === 0 ? '#bbb' : '#333', cursor: pagina === 0 ? 'default' : 'pointer', fontSize: '13px' }}
          >
            ← Anterior
          </button>

          {[...Array(totalPaginas)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPagina(i)}
              style={{
                padding: '8px 13px', borderRadius: '8px', fontSize: '13px', fontWeight: i === pagina ? 'bold' : 'normal',
                border: i === pagina ? '1px solid #1a6b5a' : '1px solid #ddd',
                background: i === pagina ? '#1a6b5a' : 'white',
                color: i === pagina ? 'white' : '#333',
                cursor: 'pointer',
                display: Math.abs(i - pagina) <= 2 ? 'inline-block' : 'none',
              }}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))}
            disabled={pagina >= totalPaginas - 1}
            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #ddd', background: pagina >= totalPaginas - 1 ? '#f5f5f5' : 'white', color: pagina >= totalPaginas - 1 ? '#bbb' : '#333', cursor: pagina >= totalPaginas - 1 ? 'default' : 'pointer', fontSize: '13px' }}
          >
            Próxima →
          </button>
          <button
            onClick={() => setPagina(totalPaginas - 1)}
            disabled={pagina >= totalPaginas - 1}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', background: pagina >= totalPaginas - 1 ? '#f5f5f5' : 'white', color: pagina >= totalPaginas - 1 ? '#bbb' : '#333', cursor: pagina >= totalPaginas - 1 ? 'default' : 'pointer', fontSize: '13px' }}
          >
            »»
          </button>

          <span style={{ color: '#888', fontSize: '12px', marginLeft: '4px' }}>
            Página {pagina + 1} de {totalPaginas}
          </span>
        </div>
      )}
    </div>
  )
}

export default Historico
