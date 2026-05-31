import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { supabase } from '../supabase'
import html2canvas from 'html2canvas'
import { motion } from 'framer-motion'
import PageHeader from '../components/PageHeader'
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, LabelList, ReferenceLine
} from 'recharts'
import {
  User, TrendingUp, ShoppingBag, AlertCircle, Clock,
  XCircle, RefreshCw, Trophy, Target, Banknote,
  ShoppingCart, FilterX, History, RotateCcw, PackageX,
  BarChart3
} from 'lucide-react'

// ── Constantes ───────────────────────────────────────────────────────────────
const MESES_NOMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MESES_IDX   = { Jan:0,Fev:1,Mar:2,Abr:3,Mai:4,Jun:5,Jul:6,Ago:7,Set:8,Out:9,Nov:10,Dez:11 }
const META_MENSAL = 1500

const NOMES_POR_EMAIL = {
  'levilaureano@gmail.com':          'Levy Santiago',
  'bruninhaa_oliveiraa@hotmail.com': 'Bruna Ambrózio',
  'pr.ubaldosantiago@gmail.com':     'Ubaldo Santiago',
  'vivianesantiago580@gmail.com':    'Viviane Santiago',
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v || 0)
}

function fmtData(str) {
  if (!str) return '—'
  const d = new Date(str + 'T12:00:00')
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

function calcularSituacao(venda) {
  if (parseFloat(venda.recebido) >= parseFloat(venda.valor_total) && parseFloat(venda.valor_total) > 0) return 'Pago'
  if (!venda.data_para_pagar) return 'Pendente'
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  const venc = new Date(venda.data_para_pagar + 'T12:00:00')
  if (hoje > venc) return 'Atrasado'
  return 'Pendente'
}

function corSituacao(sit) {
  if (sit === 'Pago')     return { background:'#e8f5e9', color:'#2e7d32' }
  if (sit === 'Atrasado') return { background:'#ffebee', color:'#c62828' }
  return { background:'#fff8e1', color:'#f57f17' }
}

function extrairParcelas(venda) {
  if (!venda.observacao) return null
  const match = venda.observacao.match(/(\d+)x:(.+?)(?:\||$)/)
  if (!match) return null
  return { qtd: match[1], detalhe: match[2].trim() }
}

function ordenarMeses(arr) {
  return arr.sort((a,b) => {
    const [mA,aA] = a.mes.split('/')
    const [mB,aB] = b.mes.split('/')
    return (parseInt(aA)*12 + MESES_IDX[mA]) - (parseInt(aB)*12 + MESES_IDX[mB])
  })
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, valor, sub, cor, icon, destaque }) {
  return (
    <motion.div
      whileHover={{ y:-3, boxShadow:'0 8px 20px rgba(0,0,0,0.10)' }}
      transition={{ duration:0.15 }}
      style={{
        background: destaque ? `linear-gradient(135deg, ${cor}15, ${cor}08)` : '#fff',
        borderRadius:'16px',
        padding:'16px',
        boxShadow:'0 2px 10px rgba(0,0,0,0.06)',
        borderLeft:`4px solid ${cor}`,
        border: destaque ? `1.5px solid ${cor}40` : undefined,
        borderLeft:`4px solid ${cor}`,
      }}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
        <span style={{ fontSize:'11px', color:'#a0aec0', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.5px', lineHeight:'1.3', paddingRight:'4px' }}>{label}</span>
        <span style={{ color:cor, opacity:0.75, flexShrink:0 }}>{icon}</span>
      </div>
      <div style={{ fontSize:'18px', fontWeight:'bold', color:cor, marginBottom:'3px', wordBreak:'break-word', lineHeight:'1.2' }}>{valor}</div>
      <div style={{ fontSize:'11px', color:'#a0aec0' }}>{sub}</div>
    </motion.div>
  )
}

// ── Divisor de seção ──────────────────────────────────────────────────────────
function SectionLabel({ label, icon }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', margin:'20px 0 10px' }}>
      <span style={{ color:'#a0aec0' }}>{icon}</span>
      <span style={{ fontSize:'11px', fontWeight:'700', color:'#a0aec0', textTransform:'uppercase', letterSpacing:'1px' }}>{label}</span>
      <div style={{ flex:1, height:'1px', background:'#edf2f7', marginLeft:'4px' }}/>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function PainelVendedor() {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const [emailUsuario, setEmailUsuario] = useState(null)
  const [nomeVendedor, setNomeVendedor] = useState(null)
  const nomeRef = useRef(null)

  // ── Dados ─────────────────────────────────────────────────────────────────
  const [vendas,      setVendas]      = useState([])
  const [devolucoes,  setDevolucoes]  = useState([])
  const [todasVendas, setTodasVendas] = useState([])
  const [carregando,  setCarregando]  = useState(true)

  // ── Filtros KPI ───────────────────────────────────────────────────────────
  const [filtroMes, setFiltroMes] = useState('')
  const [filtroAno, setFiltroAno] = useState('')
  const [filtroSit, setFiltroSit] = useState('')

  // ── Filtros da tabela ─────────────────────────────────────────────────────
  const [filtroSituacaoTab,  setFiltroSituacaoTab]  = useState('')
  const [filtroDataInicio,   setFiltroDataInicio]   = useState('')
  const [filtroDataFim,      setFiltroDataFim]      = useState('')

  // ── Estados do Histórico ──────────────────────────────────────────────────
  const [vendaExpandida,   setVendaExpandida]   = useState(null)
  const [pagamentoVenda,   setPagamentoVenda]   = useState(null)
  const [valorPago,        setValorPago]        = useState('')
  const [mensagem,         setMensagem]         = useState('')
  const [comprovanteVenda, setComprovanteVenda] = useState(null)
  const comprovanteRef = useRef(null)

  // ── Carregamento ──────────────────────────────────────────────────────────
  const carregarVendas = useCallback(async (nome) => {
    if (!nome) return
    const [vRes, devRes, tvRes] = await Promise.all([
      supabase
        .from('vendas')
        .select(`*, clientes!vendas_cliente_id_fkey(nome, telefone)`)
        .eq('vendedor_nome', nome)
        .order('data_venda', { ascending: false }),
      supabase
        .from('devolucoes')
        .select('id, cliente_id, produto_id, venda_id, quantidade, valor_unitario, valor_total, motivo, criado_em')
        .order('criado_em', { ascending: false }),
      supabase
        .from('vendas')
        .select('vendedor_nome, valor_total, recebido, data_venda, data_para_pagar, situacao'),
    ])

    if (vRes.data) {
      const vendasComItens = await Promise.all(vRes.data.map(async (venda) => {
        const { data: itens } = await supabase
          .from('itens_venda')
          .select('*, produtos(nome)')
          .eq('venda_id', venda.id)
        return { ...venda, itens: itens || [], situacao_real: calcularSituacao(venda) }
      }))
      setVendas(vendasComItens)
    }
    if (devRes.data)  setDevolucoes(devRes.data)
    if (tvRes.data)   setTodasVendas(tvRes.data.map(v => ({ ...v, situacao_real: calcularSituacao(v) })))
  }, [])

  // ── Init + Realtime ───────────────────────────────────────────────────────
  useEffect(() => {
    let channel
    async function init() {
      setCarregando(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setCarregando(false); return }
      setEmailUsuario(user.email)
      const nome = NOMES_POR_EMAIL[user.email] || user.email.split('@')[0]
      nomeRef.current = nome
      setNomeVendedor(nome)
      await carregarVendas(nome)
      setCarregando(false)

      channel = supabase
        .channel('painel-sync-v3')
        .on('postgres_changes', { event:'*', schema:'public', table:'vendas' }, (payload) => {
          if (payload.eventType === 'UPDATE') {
            setVendas(prev => prev.map(v =>
              v.id === payload.new.id
                ? { ...v, ...payload.new, situacao_real: calcularSituacao(payload.new) }
                : v
            ))
            setTodasVendas(prev => prev.map(v =>
              v.id === payload.new.id
                ? { ...v, valor_total:payload.new.valor_total, recebido:payload.new.recebido, situacao_real: calcularSituacao(payload.new) }
                : v
            ))
          }
          if (payload.eventType === 'INSERT') carregarVendas(nomeRef.current)
        })
        .subscribe()
    }
    init()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [carregarVendas])

  // ── Anos disponíveis ──────────────────────────────────────────────────────
  const anosDisponiveis = useMemo(() =>
    [...new Set(vendas.map(v => new Date((v.data_para_pagar || v.data_venda) + 'T12:00:00').getFullYear()))].sort(),
    [vendas]
  )

  // ── Helper: vendas dentro dos filtros KPI (mês/ano/situação) ─────────────
  function passaFiltroKpi(v, fMes, fAno, fSit) {
    const d = new Date((v.data_para_pagar || v.data_venda) + 'T12:00:00')
    if (fMes && d.getMonth()+1 !== parseInt(fMes)) return false
    if (fAno && d.getFullYear()  !== parseInt(fAno))  return false
    if (fSit && v.situacao_real?.toLowerCase() !== fSit) return false
    return true
  }

  // ── Vendas filtradas para KPIs (do vendedor logado) ───────────────────────
  const vendasKpi = useMemo(() =>
    vendas.filter(v => passaFiltroKpi(v, filtroMes, filtroAno, filtroSit)),
    [vendas, filtroMes, filtroAno, filtroSit]
  )

  // ── Vendas filtradas para a tabela ────────────────────────────────────────
  const vendasTabela = useMemo(() => vendas.filter(v => {
    if (filtroSituacaoTab && v.situacao_real !== filtroSituacaoTab) return false
    if (filtroDataInicio  && v.data_para_pagar < filtroDataInicio)  return false
    if (filtroDataFim     && v.data_para_pagar > filtroDataFim)     return false
    return true
  }), [vendas, filtroSituacaoTab, filtroDataInicio, filtroDataFim])

  // ── Hoje ──────────────────────────────────────────────────────────────────
  const hoje = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])

  // ── Vendas do dia ─────────────────────────────────────────────────────────
  const vendasHoje = useMemo(() => vendas.filter(v => {
    const d = new Date((v.data_venda || v.data_para_pagar) + 'T12:00:00')
    d.setHours(0,0,0,0)
    return d.getTime() === hoje.getTime()
  }), [vendas, hoje])

  // ── IDs de vendas com devolução total ─────────────────────────────────────
  const vendasTotalmenteDevolvidas = useMemo(() => {
    const set = new Set()
    vendas.forEach(venda => {
      const devs = devolucoes.filter(d => String(d.venda_id) === String(venda.id))
      if (devs.length > 0 && parseFloat(venda.valor_total || 0) === 0) { set.add(venda.id); return }
      if (venda.observacao && venda.observacao.toLowerCase().includes('devolução')) { set.add(venda.id); return }
      if (devs.length > 0) {
        const totalDevolvido = devs.reduce((acc, d) => acc + parseFloat(d.valor_total || 0), 0)
        const referencia = parseFloat(venda.valor_bruto || venda.valor_total || 0)
        if (referencia > 0 && totalDevolvido >= referencia - 0.01) { set.add(venda.id); return }
      }
    })
    return set
  }, [vendas, devolucoes])

  // ── Devoluções do vendedor atual ──────────────────────────────────────────
  const devolucoesDoVendedor = useMemo(() => {
    const idsVendas = new Set(vendas.map(v => String(v.id)))
    return devolucoes.filter(d => idsVendas.has(String(d.venda_id)))
  }, [devolucoes, vendas])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalVendido  = useMemo(() => vendasKpi.reduce((a,v) => a+parseFloat(v.valor_total||0), 0), [vendasKpi])
  const totalRecebido = useMemo(() => vendasKpi.reduce((a,v) => a+parseFloat(v.recebido   ||0), 0), [vendasKpi])

  const qtdVendasEfetivas = useMemo(() =>
    vendasKpi.filter(v => !vendasTotalmenteDevolvidas.has(v.id)).length,
    [vendasKpi, vendasTotalmenteDevolvidas]
  )

  const vendasHojeEfetivas = useMemo(() =>
    vendasHoje.filter(v => !vendasTotalmenteDevolvidas.has(v.id)),
    [vendasHoje, vendasTotalmenteDevolvidas]
  )
  const valorVendasHoje = vendasHojeEfetivas.reduce((a,v) => a+parseFloat(v.valor_total||0), 0)
  const qtdVendasHoje   = vendasHojeEfetivas.length

  const aPagar = useMemo(() =>
    vendasKpi.filter(v => v.situacao_real === 'Pendente' && !vendasTotalmenteDevolvidas.has(v.id)),
    [vendasKpi, vendasTotalmenteDevolvidas]
  )
  const totalAPagar = aPagar.reduce((a,v) => a+parseFloat(v.valor_total||0)-parseFloat(v.recebido||0), 0)

  const inadimplentes = useMemo(() =>
    vendasKpi.filter(v => v.situacao_real === 'Atrasado' && !vendasTotalmenteDevolvidas.has(v.id)),
    [vendasKpi, vendasTotalmenteDevolvidas]
  )
  const totalInadimplente = inadimplentes.reduce((a,v) => a+parseFloat(v.valor_total||0)-parseFloat(v.recebido||0), 0)

  const qtdDevolucoes       = devolucoesDoVendedor.length
  const qtdVendasDevolvidas = vendasTotalmenteDevolvidas.size
  const valorDevolvido      = devolucoesDoVendedor.reduce((a,d) => a+parseFloat(d.valor_total||0), 0)

  // ── Ranking — responde aos filtros KPI ───────────────────────────────────
  // Filtra todasVendas pelo mesmo critério de mês/ano/situação
  const ranking = useMemo(() => {
    const r = {}
    todasVendas.forEach(v => {
      if (!passaFiltroKpi(v, filtroMes, filtroAno, filtroSit)) return
      const n = v.vendedor_nome || 'Sem nome'
      if (!r[n]) r[n] = 0
      r[n] += parseFloat(v.valor_total || 0)
    })
    // Apenas vendedores com vendas no período aparecem
    return Object.entries(r).filter(([,total]) => total > 0).sort((a,b) => b[1]-a[1])
  }, [todasVendas, filtroMes, filtroAno, filtroSit])

  const posicaoRanking = nomeVendedor ? ranking.findIndex(([n]) => n === nomeVendedor)+1 : 0

  // ── Vendas do mês vigente — para a Meta (ignora filtros) ──────────────────
  const vendasMesVigente = useMemo(() => {
    const mesAtual = hoje.getMonth() + 1
    const anoAtual = hoje.getFullYear()
    return vendas.filter(v => {
      if (vendasTotalmenteDevolvidas.has(v.id)) return false
      const d = new Date((v.data_para_pagar || v.data_venda) + 'T12:00:00')
      return d.getMonth() + 1 === mesAtual && d.getFullYear() === anoAtual
    })
  }, [vendas, vendasTotalmenteDevolvidas, hoje])

  const totalVendidoMeta = useMemo(() =>
    vendasMesVigente.reduce((a, v) => a + parseFloat(v.valor_total || 0), 0),
    [vendasMesVigente]
  )

  const progMeta = Math.min(100, (totalVendidoMeta / META_MENSAL) * 100)

  // ── Dados do gráfico — responde a todos os filtros KPI ───────────────────
  const dadosGrafico = useMemo(() => {
    const meses = {}
    vendas.forEach(v => {
      if (!passaFiltroKpi(v, filtroMes, filtroAno, filtroSit)) return
      const d = new Date((v.data_para_pagar || v.data_venda) + 'T12:00:00')
      const chave = `${MESES_NOMES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
      if (!meses[chave]) meses[chave] = { mes:chave, vendido:0, recebido:0, qtd:0 }
      if (!vendasTotalmenteDevolvidas.has(v.id)) {
        meses[chave].vendido  += parseFloat(v.valor_total||0)
        meses[chave].recebido += parseFloat(v.recebido||0)
        meses[chave].qtd      += 1
      }
    })
    return ordenarMeses(Object.values(meses))
  }, [vendas, vendasTotalmenteDevolvidas, filtroMes, filtroAno, filtroSit])

  // ── Devoluções de uma venda ───────────────────────────────────────────────
  function devolucoesVenda(vendaId) {
    return devolucoes.filter(d => String(d.venda_id) === String(vendaId))
  }

  // ── Registrar pagamento ───────────────────────────────────────────────────
  async function registrarPagamento() {
    if (!valorPago || parseFloat(valorPago) <= 0) { setMensagem('Digite um valor válido!'); return }
    const novoRecebido = parseFloat(pagamentoVenda.recebido || 0) + parseFloat(valorPago)
    const novaSituacao = novoRecebido >= parseFloat(pagamentoVenda.valor_total) ? 'Pago' : 'Pendente'
    const { error } = await supabase.from('vendas')
      .update({ recebido: novoRecebido, situacao: novaSituacao })
      .eq('id', pagamentoVenda.id)
    if (error) { setMensagem('Erro: ' + error.message); return }
    setMensagem('Pagamento registrado com sucesso!')
    setPagamentoVenda(null)
    setValorPago('')
    carregarVendas(nomeRef.current)
  }

  // ── Comprovante ───────────────────────────────────────────────────────────
  async function imprimirComprovante() {
    const conteudo = comprovanteRef.current.innerHTML
    const janela = window.open('', '_blank')
    janela.document.write(`<html><head><title>Comprovante</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;padding:20px;max-width:400px;margin:0 auto;}@media print{button{display:none;}}</style></head><body>${conteudo}</body></html>`)
    janela.document.close()
    janela.focus()
    setTimeout(() => janela.print(), 500)
  }

  async function compartilharComprovante() {
    try {
      const canvas = await html2canvas(comprovanteRef.current, { scale:2, useCORS:true })
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'comprovante-santiagos.png', { type:'image/png' })
        if (navigator.canShare && navigator.canShare({ files:[file] })) {
          await navigator.share({ files:[file], title:'Comprovante - Santiagos Presentes' })
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = 'comprovante-santiagos.png'; a.click()
          URL.revokeObjectURL(url)
        }
      }, 'image/png')
    } catch(err) { console.error(err) }
  }

  const temFiltroKpi = filtroMes !== '' || filtroAno !== '' || filtroSit !== ''
  const temFiltroTab = filtroSituacaoTab !== '' || filtroDataInicio !== '' || filtroDataFim !== ''
  const campoStyle   = { padding:'8px 12px', borderRadius:'6px', border:'1px solid #ddd', fontSize:'13px', background:'#fff' }
  const nomeExibido  = nomeVendedor || (emailUsuario ? emailUsuario.split('@')[0] : '')

  // ── Loading ───────────────────────────────────────────────────────────────
  if (carregando) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', flexDirection:'column', gap:'16px' }}>
      <div style={{ width:'44px', height:'44px', border:'3px solid #eef2f7', borderTop:'3px solid #1a6b5a', borderRadius:'50%', animation:'spin 0.9s linear infinite' }}/>
      <p style={{ color:'#a0aec0', fontSize:'14px' }}>Carregando seu painel...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!emailUsuario) return (
    <div style={{ textAlign:'center', padding:'60px 20px', color:'#a0aec0' }}>
      <User size={48} color="#cbd5e0" style={{ marginBottom:'16px' }}/>
      <p>Faça login para acessar seu painel.</p>
    </div>
  )

  return (
    <div style={{ background:'#f4f6f9', minHeight:'100vh', padding:'0 0 40px 0' }}>
      <PageHeader
        title={`Olá, ${nomeExibido}`}
        subtitle="Seu painel de vendas"
        icon={<User size={22} color="white"/>}
      />

      {/* ── Modal Comprovante ── */}
      {comprovanteVenda && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'16px' }}>
          <div style={{ background:'white', borderRadius:'16px', width:'100%', maxWidth:'440px', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 8px 32px rgba(0,0,0,0.3)' }}>
            <div ref={comprovanteRef} style={{ padding:'24px' }}>
              <div style={{ textAlign:'center', marginBottom:'12px' }}>
                <img src="/logo.png" alt="Logo" style={{ width:'80px', height:'80px', borderRadius:'50%', objectFit:'cover', border:'2px solid #1a6b5a' }}/>
                <h2 style={{ color:'#1a6b5a', fontSize:'18px', marginTop:'8px' }}>Santiagos Presentes</h2>
                <p style={{ color:'#666', fontSize:'13px' }}>📞 (24) 98161-8699</p>
                <p style={{ color:'#999', fontSize:'12px' }}>
                  {comprovanteVenda.data_venda
                    ? new Date(comprovanteVenda.data_venda).toLocaleDateString('pt-BR')
                    : new Date(comprovanteVenda.data_para_pagar+'T12:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div style={{ borderTop:'1px dashed #999', margin:'12px 0' }}/>
              <div style={{ marginBottom:'12px', fontSize:'14px' }}>
                <strong style={{ color:'#1a6b5a' }}>Cliente:</strong> {comprovanteVenda.clientes?.nome}<br/>
                {comprovanteVenda.clientes?.telefone && <span style={{ color:'#666', fontSize:'13px' }}>📞 {comprovanteVenda.clientes.telefone}</span>}
              </div>
              <div style={{ borderTop:'1px dashed #999', margin:'12px 0' }}/>
              <div style={{ marginBottom:'8px' }}><strong style={{ fontSize:'13px', color:'#555' }}>PRODUTOS</strong></div>
              {comprovanteVenda.itens?.map((item, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom:'6px' }}>
                  <span style={{ flex:1, paddingRight:'8px' }}>{item.produtos?.nome}</span>
                  <span style={{ color:'#666', marginRight:'8px' }}>{item.quantidade}x R$ {parseFloat(item.valor_unitario).toFixed(2)}</span>
                  <strong>R$ {(item.quantidade*parseFloat(item.valor_unitario)).toFixed(2)}</strong>
                </div>
              ))}
              <div style={{ borderTop:'2px solid #333', margin:'12px 0' }}/>
              {parseFloat(comprovanteVenda.desconto||0) > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', color:'#2e7d32', marginBottom:'4px' }}>
                  <span>Desconto</span><span>- R$ {parseFloat(comprovanteVenda.desconto).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'18px', fontWeight:'bold', color:'#1a6b5a', marginBottom:'8px' }}>
                <span>TOTAL</span><span>R$ {parseFloat(comprovanteVenda.valor_total).toFixed(2)}</span>
              </div>
              {(() => {
                const parcelas = extrairParcelas(comprovanteVenda)
                if (parcelas) return (
                  <div style={{ background:'#f8f8f8', borderRadius:'8px', padding:'12px', marginBottom:'8px' }}>
                    <strong style={{ fontSize:'13px', color:'#555' }}>PARCELAMENTO — {parcelas.qtd}x</strong>
                    <p style={{ fontSize:'12px', color:'#666', marginTop:'6px' }}>{parcelas.detalhe}</p>
                  </div>
                )
                return (
                  <div style={{ fontSize:'13px', color:'#555', marginBottom:'8px' }}>
                    <strong>Vencimento:</strong> {comprovanteVenda.data_para_pagar ? new Date(comprovanteVenda.data_para_pagar+'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                  </div>
                )
              })()}
              {comprovanteVenda.observacao && (() => {
                const obsLimpa = comprovanteVenda.observacao
                  .replace(/\d+x:.+?(\||$)/, '').replace(/Desconto: R\$ [\d.]+/, '')
                  .replace(/^\s*\|\s*/, '').replace(/\|\s*$/, '').trim()
                return obsLimpa ? <p style={{ fontSize:'12px', color:'#777', fontStyle:'italic', marginTop:'8px' }}>Obs: {obsLimpa}</p> : null
              })()}
              {comprovanteVenda.vendedor_nome && (
                <p style={{ fontSize:'11px', color:'#bbb', marginTop:'8px', textAlign:'right' }}>Vendedor: {comprovanteVenda.vendedor_nome}</p>
              )}
              <div style={{ borderTop:'1px dashed #999', margin:'12px 0' }}/>
              <p style={{ textAlign:'center', fontSize:'12px', color:'#999' }}>Obrigado pela preferência!<br/>Santiagos Presentes 🏪</p>
            </div>
            <div style={{ padding:'16px 24px', borderTop:'1px solid #eee', display:'flex', gap:'8px' }}>
              <button onClick={imprimirComprovante}     style={{ flex:1, background:'linear-gradient(135deg,#1a6b5a,#145a4a)', color:'white', border:'none', padding:'12px', borderRadius:'8px', cursor:'pointer', fontSize:'15px', fontWeight:'bold' }}>🖨️ Imprimir</button>
              <button onClick={compartilharComprovante} style={{ flex:1, background:'linear-gradient(135deg,#1a6b5a,#145a4a)', color:'white', border:'none', padding:'12px', borderRadius:'8px', cursor:'pointer', fontSize:'15px', fontWeight:'bold' }}>📤 Compartilhar</button>
              <button onClick={() => setComprovanteVenda(null)} style={{ flex:1, background:'#eee', color:'#333', border:'none', padding:'12px', borderRadius:'8px', cursor:'pointer', fontSize:'15px' }}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Pagamento ── */}
      {pagamentoVenda && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'16px' }}>
          <div style={{ background:'white', padding:'32px', borderRadius:'16px', width:'100%', maxWidth:'400px', boxShadow:'0 8px 32px rgba(0,0,0,0.3)' }}>
            <h3 style={{ marginBottom:'8px', color:'#1a6b5a' }}>Registrar Pagamento</h3>
            <p style={{ color:'#666', marginBottom:'16px', fontSize:'14px' }}>
              Cliente: <strong>{pagamentoVenda.clientes?.nome}</strong><br/>
              Total: <strong>R$ {parseFloat(pagamentoVenda.valor_total).toFixed(2)}</strong><br/>
              Já recebido: <strong style={{ color:'green' }}>R$ {parseFloat(pagamentoVenda.recebido||0).toFixed(2)}</strong><br/>
              Falta: <strong style={{ color:'red' }}>R$ {(parseFloat(pagamentoVenda.valor_total)-parseFloat(pagamentoVenda.recebido||0)).toFixed(2)}</strong>
            </p>
            <label style={{ fontSize:'14px', fontWeight:'bold' }}>Valor recebido agora (R$)</label><br/>
            <input
              type="number" value={valorPago} onChange={e => setValorPago(e.target.value)}
              placeholder="Ex: 50.00" autoFocus
              style={{ width:'100%', padding:'10px', marginTop:'6px', marginBottom:'16px', borderRadius:'6px', border:'1px solid #ddd', fontSize:'16px' }}
            />
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={registrarPagamento} style={{ flex:1, background:'linear-gradient(135deg,#1a6b5a,#145a4a)', color:'white', border:'none', padding:'12px', borderRadius:'8px', cursor:'pointer', fontSize:'15px', fontWeight:'bold' }}>Confirmar</button>
              <button onClick={() => { setPagamentoVenda(null); setValorPago(''); setMensagem('') }} style={{ flex:1, background:'#eee', color:'#333', border:'none', padding:'12px', borderRadius:'8px', cursor:'pointer', fontSize:'15px' }}>Cancelar</button>
            </div>
            {mensagem && <p style={{ marginTop:'12px', color:mensagem.includes('sucesso')?'green':'red', fontSize:'14px' }}>{mensagem}</p>}
          </div>
        </div>
      )}

      {/* ── Filtros KPI ── */}
      <div style={{ background:'#fff', borderRadius:'16px', padding:'16px 20px', boxShadow:'0 2px 10px rgba(15,23,42,0.06)', border:'1px solid #eef2f7', margin:'16px 0' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px', marginBottom:'10px' }}>
          {[
            { label:'Ano',      value:filtroAno, set:setFiltroAno, ph:'Todos os anos',  opts:anosDisponiveis.map(a=>({v:String(a),l:String(a)})) },
            { label:'Mês',      value:filtroMes, set:setFiltroMes, ph:'Todos os meses', opts:MESES_NOMES.map((m,i)=>({v:String(i+1),l:m})) },
            { label:'Situação', value:filtroSit, set:setFiltroSit, ph:'Todas',
              opts:[{v:'pago',l:'Pago'},{v:'pendente',l:'Pendente'},{v:'atrasado',l:'Atrasado'},{v:'devolvido',l:'Devolvido'}] },
          ].map((f,i) => (
            <div key={i}>
              <label style={{ display:'block', fontSize:'10px', fontWeight:'700', color:'#a0aec0', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'0.5px' }}>{f.label}</label>
              <select value={f.value} onChange={e=>f.set(e.target.value)}
                style={{ width:'100%', padding:'8px 10px', borderRadius:'9px', border:`1.5px solid ${f.value?'#1a6b5a':'#e2e8f0'}`, fontSize:'12px', color:f.value?'#1a6b5a':'#718096', fontWeight:f.value?'600':'400', background:'#fff', cursor:'pointer', outline:'none', appearance:'none' }}>
                <option value="">{f.ph}</option>
                {f.opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
          <button onClick={() => { setFiltroMes(''); setFiltroAno(''); setFiltroSit('') }} disabled={!temFiltroKpi}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', padding:'9px 12px', borderRadius:'9px', fontSize:'13px', fontWeight:'600', cursor:temFiltroKpi?'pointer':'default', border:temFiltroKpi?'1px solid #fed7d7':'1px solid #e2e8f0', background:temFiltroKpi?'#fff5f5':'#f7fafc', color:temFiltroKpi?'#e53e3e':'#a0aec0' }}>
            <FilterX size={14}/> Limpar filtros
          </button>
          <button onClick={() => carregarVendas(nomeRef.current)}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', padding:'9px 12px', borderRadius:'9px', border:'none', background:'#1a6b5a', color:'white', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>
            <RefreshCw size={14}/> Atualizar
          </button>
        </div>
      </div>

      {/* SEÇÃO 1 — HOJE */}
      <SectionLabel label="Hoje" icon={<ShoppingBag size={14}/>} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'12px', marginBottom:'4px' }}>
        <KpiCard label="Vendas Hoje (R$)" valor={fmtBRL(valorVendasHoje)} sub={`${qtdVendasHoje} venda(s) hoje`} cor="#1a6b5a" icon={<Banknote size={20}/>}/>
        <KpiCard label="Nº de Vendas Hoje" valor={qtdVendasHoje} sub="zerado a cada novo dia" cor="#29abe2" icon={<ShoppingCart size={20}/>}/>
      </div>

      {/* SEÇÃO 2 — PERÍODO FILTRADO */}
      <SectionLabel label="Período filtrado" icon={<TrendingUp size={14}/>} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'12px', marginBottom:'4px' }}>
        <KpiCard label="Total Vendas"  valor={qtdVendasEfetivas}      sub="vendas efetivas no período"  cor="#e91e8c" icon={<ShoppingCart size={20}/>}/>
        <KpiCard label="Valor Vendido" valor={fmtBRL(totalVendido)}   sub={`${qtdVendasEfetivas} venda(s)`} cor="#29abe2" icon={<TrendingUp size={20}/>}/>
        <KpiCard label="Recebido"      valor={fmtBRL(totalRecebido)}  sub={`de ${fmtBRL(totalVendido)}`} cor="#10b981" icon={<Banknote size={20}/>}/>
        <KpiCard label="Ranking"       valor={posicaoRanking ? `#${posicaoRanking}` : '—'} sub={`de ${ranking.length} vendedor(es)`} cor="#8b5cf6" icon={<Trophy size={20}/>}/>
      </div>

      {/* SEÇÃO 3 — PENDÊNCIAS */}
      <SectionLabel label="Pendências" icon={<AlertCircle size={14}/>} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'12px', marginBottom:'4px' }}>
        <KpiCard label="Atrasadas" valor={inadimplentes.length}  sub={`${fmtBRL(totalInadimplente)} em aberto`} cor="#ef4444" icon={<AlertCircle size={20}/>}/>
        <KpiCard label="A Receber" valor={aPagar.length}         sub={`${fmtBRL(totalAPagar)} pendente`}        cor="#f5821f" icon={<Clock size={20}/>}/>
      </div>

      {/* SEÇÃO 4 — DEVOLUÇÕES */}
      <SectionLabel label="Devoluções" icon={<RotateCcw size={14}/>} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'12px', marginBottom:'4px' }}>
        <KpiCard label="Vendas Devolvidas" valor={qtdVendasDevolvidas} sub="vendas totalmente devolvidas"       cor="#e94560" icon={<PackageX size={20}/>}/>
        <KpiCard label="Valor Devolvido"   valor={fmtBRL(valorDevolvido)} sub={`em ${qtdDevolucoes} devolução(ões)`} cor="#e94560" icon={<RotateCcw size={20}/>}/>
      </div>

      {/* ── Meta do Mês — sempre mês vigente, ignora filtros ── */}
      <div style={{ background:'#fff', borderRadius:'18px', padding:'20px', boxShadow:'0 2px 12px rgba(15,23,42,0.06)', border:'1px solid #eef2f7', margin:'20px 0 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px', paddingBottom:'10px', borderBottom:'1px solid #f7f7f7' }}>
          <Target size={16} color="#1a6b5a"/>
          <span style={{ fontSize:'14px', fontWeight:'700', color:'#1a6b5a' }}>Meta do Mês</span>
          <span style={{ fontSize:'12px', color:'#a0aec0', background:'#f7fafc', padding:'2px 10px', borderRadius:'20px' }}>
            {MESES_NOMES[hoje.getMonth()]}/{hoje.getFullYear()}
          </span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
          <span style={{ fontSize:'13px', color:'#4a5568' }}>
            <strong style={{ color:'#1a6b5a' }}>{fmtBRL(totalVendidoMeta)}</strong> de {fmtBRL(META_MENSAL)}
          </span>
          <span style={{ fontSize:'13px', fontWeight:'bold', color:progMeta>=100?'#10b981':progMeta>=70?'#f5821f':'#ef4444' }}>
            {progMeta.toFixed(0)}%
          </span>
        </div>
        <div style={{ background:'#f0f4f8', borderRadius:'999px', height:'14px', overflow:'hidden' }}>
          <motion.div
            initial={{ width:0 }}
            animate={{ width:`${progMeta}%` }}
            transition={{ duration:0.8, ease:'easeOut' }}
            style={{ height:'100%', borderRadius:'999px', background:progMeta>=100?'linear-gradient(90deg,#10b981,#4ade80)':progMeta>=70?'linear-gradient(90deg,#f5821f,#f7c948)':'linear-gradient(90deg,#ef4444,#f97316)' }}
          />
        </div>
        {progMeta >= 100
          ? <p style={{ fontSize:'12px', color:'#10b981', fontWeight:'bold', marginTop:'8px' }}>Meta atingida! 🎉</p>
          : <p style={{ fontSize:'12px', color:'#a0aec0', marginTop:'8px' }}>Falta {fmtBRL(META_MENSAL - totalVendidoMeta)} para a meta</p>
        }
      </div>

      {/* ── Gráfico — Vendas por Mês ── */}
      <div style={{ background:'#fff', borderRadius:'18px', padding:'20px', boxShadow:'0 2px 12px rgba(15,23,42,0.06)', border:'1px solid #eef2f7', marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'18px', paddingBottom:'12px', borderBottom:'1px solid #f7f7f7' }}>
          <div style={{ width:'32px', height:'32px', borderRadius:'9px', background:'#1a6b5a18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <BarChart3 size={16} color="#1a6b5a" strokeWidth={2.2}/>
          </div>
          <span style={{ fontSize:'14px', fontWeight:'700', color:'#1a202c' }}>Evolução de Vendas por Mês</span>
          {/* Badge mostra filtros ativos */}
          {temFiltroKpi && (
            <span style={{ fontSize:'12px', color:'#a0aec0', background:'#f7fafc', padding:'2px 10px', borderRadius:'20px', marginLeft:'4px' }}>
              {[filtroMes ? MESES_NOMES[parseInt(filtroMes)-1] : '', filtroAno, filtroSit].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>

        {dadosGrafico.length === 0 ? (
          <p style={{ textAlign:'center', padding:'32px', color:'#a0aec0', fontSize:'13px' }}>Nenhum dado para o período selecionado.</p>
        ) : (
          <>
            <div style={{ display:'flex', flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:'14px', gap:'8px' }}>
              {[
                { cor:'#1a6b5a', label:'Valor Vendido' },
                { cor:'#29abe2', label:'Valor Recebido' },
                { cor:'#f5821f', label:`Meta R$ ${META_MENSAL.toLocaleString('pt-BR')}`, dashed:true },
              ].map((item, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'5px', flex:1, minWidth:0 }}>
                  <div style={{
                    width:'18px', height:'3px', borderRadius:'2px', flexShrink:0,
                    background: item.dashed ? 'transparent' : item.cor,
                    borderTop: item.dashed ? `2px dashed ${item.cor}` : 'none',
                  }}/>
                  <span style={{ fontSize:'10px', color:'#718096', fontWeight:'600', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.label}</span>
                </div>
              ))}
            </div>

            <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
              <div style={{ minWidth: Math.max(360, dadosGrafico.length * 90) }}>
                <ComposedChart
                  width={Math.max(360, dadosGrafico.length * 90)}
                  height={280}
                  data={dadosGrafico}
                  margin={{ top:28, right:16, left:8, bottom:10 }}
                >
                  <defs>
                    <linearGradient id="gradVendido" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#1a6b5a" stopOpacity={0.22}/>
                      <stop offset="95%" stopColor="#1a6b5a" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gradRecebido" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#29abe2" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#29abe2" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false}/>
                  <XAxis dataKey="mes" tick={{ fontSize:11, fill:'#a0aec0' }} axisLine={false} tickLine={false} interval={0} padding={{ left:20, right:20 }}/>
                  <YAxis hide/>
                  <ReferenceLine y={META_MENSAL} stroke="#f5821f" strokeWidth={1.5} strokeDasharray="7 4"/>
                  <Area type="monotone" dataKey="vendido" name="Vendido" stroke="#1a6b5a" strokeWidth={2.5} fill="url(#gradVendido)" dot={{ r:4, fill:'#1a6b5a', strokeWidth:2, stroke:'white' }} activeDot={{ r:6 }}>
                    <LabelList dataKey="vendido" position="top" formatter={v => v > 0 ? `R$${parseFloat(v).toFixed(0)}` : ''} style={{ fontSize:'10px', fill:'#1a6b5a', fontWeight:'bold' }}/>
                  </Area>
                  <Area type="monotone" dataKey="recebido" name="Recebido" stroke="#29abe2" strokeWidth={2} fill="url(#gradRecebido)" dot={{ r:4, fill:'#29abe2', strokeWidth:2, stroke:'white' }} activeDot={{ r:6 }}>
                    <LabelList dataKey="recebido" position="bottom" formatter={v => v > 0 ? `R$${parseFloat(v).toFixed(0)}` : ''} style={{ fontSize:'10px', fill:'#29abe2', fontWeight:'bold' }}/>
                  </Area>
                </ComposedChart>
              </div>
            </div>

            {dadosGrafico.length > 5 && (
              <p style={{ fontSize:'11px', color:'#cbd5e0', textAlign:'center', marginTop:'6px' }}>← deslize para ver mais →</p>
            )}
          </>
        )}
      </div>

      {/* ── Ranking — responde aos filtros KPI ── */}
      <div style={{ background:'#fff', borderRadius:'18px', padding:'20px', boxShadow:'0 2px 12px rgba(15,23,42,0.06)', border:'1px solid #eef2f7', marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px', paddingBottom:'10px', borderBottom:'1px solid #f7f7f7' }}>
          <Trophy size={16} color="#1a6b5a"/>
          <span style={{ fontSize:'14px', fontWeight:'700', color:'#1a6b5a' }}>Ranking de Vendedores</span>
          {temFiltroKpi && (
            <span style={{ fontSize:'12px', color:'#a0aec0', background:'#f7fafc', padding:'2px 10px', borderRadius:'20px' }}>
              {[filtroMes ? MESES_NOMES[parseInt(filtroMes)-1] : '', filtroAno, filtroSit].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>
        {ranking.length === 0 ? (
          <p style={{ textAlign:'center', padding:'24px', color:'#a0aec0', fontSize:'13px' }}>Nenhum vendedor com vendas no período.</p>
        ) : ranking.map(([nome, total], i) => {
          const isMeu   = nome === nomeVendedor
          const medalha = i===0?'#f7c948':i===1?'#b0bec5':i===2?'#cd7f32':'#edf2f7'
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', borderRadius:'10px', marginBottom:'8px', background:isMeu?'#f0faf6':'#f9fafb', border:`1.5px solid ${isMeu?'#1a6b5a':'transparent'}` }}>
              <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:medalha, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize:'12px', color:i<3?'#333':'#a0aec0', flexShrink:0 }}>{i+1}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'13px', fontWeight:isMeu?'bold':'600', color:isMeu?'#1a6b5a':'#2d3748', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {nome} {isMeu && <span style={{ fontSize:'11px', color:'#a0aec0', fontWeight:'normal' }}>(você)</span>}
                </div>
                <div style={{ background:'#e2e8f0', borderRadius:'999px', height:'4px', marginTop:'4px', overflow:'hidden' }}>
                  <div style={{ width:`${(total/(ranking[0]?.[1]||1))*100}%`, height:'100%', borderRadius:'999px', background:isMeu?'#1a6b5a':'#cbd5e0' }}/>
                </div>
              </div>
              <div style={{ fontSize:'13px', fontWeight:'bold', color:isMeu?'#1a6b5a':'#4a5568', flexShrink:0 }}>{fmtBRL(total)}</div>
            </div>
          )
        })}
      </div>

      {/* ── Filtros da tabela ── */}
      <div style={{ background:'white', padding:'16px', borderRadius:'12px', marginBottom:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', display:'flex', gap:'12px', alignItems:'flex-end', flexWrap:'wrap' }}>
        <div>
          <label style={{ fontSize:'12px', color:'#666' }}>Situação</label><br/>
          <select value={filtroSituacaoTab} onChange={e=>setFiltroSituacaoTab(e.target.value)} style={campoStyle}>
            <option value="">Todas</option>
            <option value="Pendente">Pendente</option>
            <option value="Atrasado">Atrasado</option>
            <option value="Pago">Pago</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize:'12px', color:'#666' }}>Data (de)</label><br/>
          <input type="date" value={filtroDataInicio} onChange={e=>setFiltroDataInicio(e.target.value)} style={campoStyle}/>
        </div>
        <div>
          <label style={{ fontSize:'12px', color:'#666' }}>Data (até)</label><br/>
          <input type="date" value={filtroDataFim} onChange={e=>setFiltroDataFim(e.target.value)} style={campoStyle}/>
        </div>
        <button
          onClick={() => { setFiltroSituacaoTab(''); setFiltroDataInicio(''); setFiltroDataFim('') }}
          disabled={!temFiltroTab}
          style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', borderRadius:'8px', border:temFiltroTab?'1px solid #e94560':'1px solid #c0392b', background:temFiltroTab?'#e94560':'#fff', color:temFiltroTab?'white':'#c0392b', fontSize:'13px', fontWeight:'500', cursor:temFiltroTab?'pointer':'default', opacity:temFiltroTab?1:0.6 }}>
          <FilterX size={15}/> Limpar filtros
        </button>
        <div style={{ marginLeft:'auto', color:'#666', fontSize:'13px', whiteSpace:'nowrap' }}>
          {vendasTabela.length} venda(s)
        </div>
      </div>

      {mensagem && !pagamentoVenda && (
        <div style={{ background:'#e8f5e9', border:'1px solid #4caf50', borderRadius:'8px', padding:'12px 16px', marginBottom:'12px', color:'green' }}>
          {mensagem}
        </div>
      )}

      {/* ── Tabela ── */}
      <div className="tabela-wrapper">
        <table>
          <thead>
            <tr>
              <th style={{ textAlign:'left' }}>Cliente</th>
              <th style={{ textAlign:'left' }}>Produtos</th>
              <th style={{ textAlign:'right' }}>Total</th>
              <th style={{ textAlign:'right' }}>Desconto</th>
              <th style={{ textAlign:'right' }}>Recebido</th>
              <th style={{ textAlign:'right' }}>Falta</th>
              <th style={{ textAlign:'center' }}>Vencimento</th>
              <th style={{ textAlign:'center' }}>Situação</th>
              <th style={{ textAlign:'left' }}>Observação</th>
              <th style={{ textAlign:'center' }}>Ação</th>
              <th style={{ textAlign:'center' }}>Comprovante</th>
            </tr>
          </thead>
          <tbody>
            {vendasTabela.map((venda, i) => {
              const devs           = devolucoesVenda(venda.id)
              const falta          = parseFloat(venda.valor_total) - parseFloat(venda.recebido||0)
              const sit            = venda.situacao_real
              const totalDevolvida = vendasTotalmenteDevolvidas.has(venda.id)
              return (
                <>
                  <tr key={venda.id} style={{ background: totalDevolvida ? '#fff5f5' : i%2===0 ? '#fff' : '#f9f9f9' }}>
                    <td style={{ textAlign:'left' }}>
                      <strong>{venda.clientes?.nome}</strong><br/>
                      <small style={{ color:'#888' }}>{venda.clientes?.telefone}</small>
                    </td>
                    <td style={{ textAlign:'left' }}>
                      <span
                        onClick={() => setVendaExpandida(vendaExpandida===venda.id ? null : venda.id)}
                        style={{ cursor:'pointer', color:'#1a6b5a', textDecoration:'underline', fontSize:'13px', whiteSpace:'nowrap' }}
                      >
                        {venda.itens?.length} produto(s)
                      </span>
                    </td>
                    <td style={{ textAlign:'right' }}><strong>R$ {parseFloat(venda.valor_total).toFixed(2)}</strong></td>
                    <td style={{ textAlign:'right', color:parseFloat(venda.desconto||0)>0?'#e65100':'#aaa', fontSize:'13px' }}>
                      {parseFloat(venda.desconto||0)>0 ? `- R$ ${parseFloat(venda.desconto).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ textAlign:'right', color:'green' }}>R$ {parseFloat(venda.recebido||0).toFixed(2)}</td>
                    <td style={{ textAlign:'right', color:'red' }}>R$ {falta.toFixed(2)}</td>
                    <td style={{ textAlign:'center', whiteSpace:'nowrap' }}>
                      {venda.data_para_pagar ? new Date(venda.data_para_pagar+'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ textAlign:'center' }}>
                      {totalDevolvida ? (
                        <span style={{ background:'#fff0f3', color:'#e94560', padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'bold', whiteSpace:'nowrap' }}>
                          ↩ Devolvida
                        </span>
                      ) : (
                        <span style={{ ...corSituacao(sit), padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'bold', whiteSpace:'nowrap' }}>
                          {sit}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign:'left', fontSize:'12px', color:'#555', maxWidth:'150px' }}>
                      {venda.observacao || '—'}
                    </td>
                    <td style={{ textAlign:'center' }}>
                      {devs.length > 0 ? (
                        <span style={{ color:'#e65100', fontSize:'12px', whiteSpace:'nowrap', fontWeight:'bold' }}>↩ Devolvido</span>
                      ) : sit === 'Pago' ? (
                        <span style={{ color:'green', fontSize:'12px', whiteSpace:'nowrap' }}>✅ Pago</span>
                      ) : (
                        <button
                          onClick={() => { setPagamentoVenda(venda); setMensagem('') }}
                          style={{ background:'#1a6b5a', color:'white', border:'none', padding:'6px 10px', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'bold', whiteSpace:'nowrap' }}
                        >
                          💰 Pagar
                        </button>
                      )}
                    </td>
                    <td style={{ textAlign:'center' }}>
                      <button
                        onClick={() => setComprovanteVenda(venda)}
                        style={{ background:'#f0f4ff', color:'#3b5bdb', border:'1px solid #c5d0f5', padding:'6px 10px', borderRadius:'6px', cursor:'pointer', fontSize:'13px', whiteSpace:'nowrap', fontWeight:'bold' }}
                      >
                        🧾 Ver
                      </button>
                    </td>
                  </tr>

                  {vendaExpandida === venda.id && (
                    <tr key={venda.id+'_det'}>
                      <td colSpan="11" style={{ background:'#f0f4ff', padding:'12px 16px' }}>
                        <div style={{ display:'flex', gap:'16px', marginBottom:'10px', fontSize:'13px', flexWrap:'wrap' }}>
                          {parseFloat(venda.desconto||0) > 0 && (
                            <span style={{ color:'#e65100' }}>
                              <strong>Desconto aplicado:</strong> - R$ {parseFloat(venda.desconto).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <strong style={{ fontSize:'13px', color:'#1a6b5a' }}>Produtos:</strong>
                        <div style={{ marginTop:'8px', display:'flex', flexWrap:'wrap', gap:'8px' }}>
                          {venda.itens?.map(item => (
                            <span key={item.id} style={{ background:'white', border:'1px solid #ddd', padding:'6px 12px', borderRadius:'8px', fontSize:'12px' }}>
                              {item.produtos?.nome} — {item.quantidade}x — R$ {parseFloat(item.valor_unitario).toFixed(2)}
                            </span>
                          ))}
                        </div>
                        {devs.length > 0 && (
                          <div style={{ marginTop:'10px' }}>
                            <strong style={{ fontSize:'13px', color:'#e94560' }}>Devoluções:</strong>
                            <div style={{ marginTop:'6px', display:'flex', flexWrap:'wrap', gap:'8px' }}>
                              {devs.map(d => (
                                <span key={d.id} style={{ background:'#fff0f3', border:'1px solid #e94560', padding:'6px 12px', borderRadius:'8px', fontSize:'12px' }}>
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
        {vendasTabela.length === 0 && (
          <p style={{ textAlign:'center', padding:'32px', color:'#aaa', background:'white' }}>
            {vendas.length === 0 ? 'Nenhuma venda registrada ainda.' : 'Nenhuma venda encontrada para os filtros selecionados.'}
          </p>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
