import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { supabase } from '../supabase'
import html2canvas from 'html2canvas'
import { motion } from 'framer-motion'
import PageHeader from '../components/PageHeader'
import {
  User, TrendingUp, ShoppingBag, AlertCircle, Clock,
  XCircle, RefreshCw, Trophy, Target, Banknote,
  ShoppingCart, FilterX, History
} from 'lucide-react'

// ── Constantes ───────────────────────────────────────────────────────────────
const MESES_NOMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const META_MENSAL = 3000

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

// Idêntico ao Histórico
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

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, valor, sub, cor, icon }) {
  return (
    <motion.div
      whileHover={{ y:-3, boxShadow:'0 8px 20px rgba(0,0,0,0.10)' }}
      transition={{ duration:0.15 }}
      style={{ background:'#fff', borderRadius:'16px', padding:'16px', boxShadow:'0 2px 10px rgba(0,0,0,0.06)', borderLeft:`4px solid ${cor}` }}
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

  // ── Filtros KPI (mês/ano/situação) ────────────────────────────────────────
  const [filtroMes, setFiltroMes] = useState('')
  const [filtroAno, setFiltroAno] = useState('')
  const [filtroSit, setFiltroSit] = useState('')

  // ── Filtros da tabela — iguais ao Histórico ───────────────────────────────
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
        .select('*, clientes(nome), produtos(nome)')
        .order('criado_em', { ascending: false }),
      supabase
        .from('vendas')
        .select('vendedor_nome, valor_total, recebido'),
    ])

    if (vRes.data) {
      // Carrega itens para cada venda — idêntico ao Histórico
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
    if (tvRes.data)   setTodasVendas(tvRes.data)
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
                ? { ...v, valor_total:payload.new.valor_total, recebido:payload.new.recebido }
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

  // ── Vendas filtradas para KPIs (filtro mês/ano/sit) ───────────────────────
  const anosDisponiveis = useMemo(() =>
    [...new Set(vendas.map(v => new Date((v.data_para_pagar || v.data_venda) + 'T12:00:00').getFullYear()))].sort(),
    [vendas]
  )

  const vendasKpi = useMemo(() => vendas.filter(v => {
    const d = new Date((v.data_para_pagar || v.data_venda) + 'T12:00:00')
    if (filtroMes && d.getMonth()+1 !== parseInt(filtroMes)) return false
    if (filtroAno && d.getFullYear()  !== parseInt(filtroAno))  return false
    if (filtroSit && v.situacao_real?.toLowerCase() !== filtroSit) return false
    return true
  }), [vendas, filtroMes, filtroAno, filtroSit])

  // ── Vendas filtradas para a tabela — iguais ao Histórico ──────────────────
  const vendasTabela = useMemo(() => vendas.filter(v => {
    if (filtroSituacaoTab && v.situacao_real !== filtroSituacaoTab) return false
    if (filtroDataInicio  && v.data_para_pagar < filtroDataInicio)  return false
    if (filtroDataFim     && v.data_para_pagar > filtroDataFim)     return false
    return true
  }), [vendas, filtroSituacaoTab, filtroDataInicio, filtroDataFim])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalVendido  = useMemo(() => vendasKpi.reduce((a,v) => a+parseFloat(v.valor_total||0), 0), [vendasKpi])
  const totalRecebido = useMemo(() => vendasKpi.reduce((a,v) => a+parseFloat(v.recebido   ||0), 0), [vendasKpi])
  const qtdVendas     = vendasKpi.length
  const progMeta      = Math.min(100, (totalVendido / META_MENSAL) * 100)

  const hoje = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])
  const vendasHoje = useMemo(() => vendas.filter(v => {
    const d = new Date((v.data_venda || v.data_para_pagar) + 'T12:00:00')
    d.setHours(0,0,0,0)
    return d.getTime() === hoje.getTime()
  }), [vendas, hoje])

  const inadimplentes = useMemo(() => vendasKpi.filter(v => v.situacao_real === 'Atrasado'), [vendasKpi])
  const aPagar        = useMemo(() => vendasKpi.filter(v => v.situacao_real === 'Pendente'), [vendasKpi])
  const totalInadimplente = inadimplentes.reduce((a,v) => a+parseFloat(v.valor_total||0)-parseFloat(v.recebido||0), 0)
  const totalAPagar       = aPagar.reduce((a,v) => a+parseFloat(v.valor_total||0)-parseFloat(v.recebido||0), 0)

  // ── Ranking ───────────────────────────────────────────────────────────────
  const ranking = useMemo(() => {
    const r = {}
    todasVendas.forEach(v => {
      const n = v.vendedor_nome || 'Sem nome'
      if (!r[n]) r[n] = 0
      r[n] += parseFloat(v.valor_total || 0)
    })
    return Object.entries(r).sort((a,b) => b[1]-a[1])
  }, [todasVendas])

  const posicaoRanking = nomeVendedor ? ranking.findIndex(([n]) => n === nomeVendedor)+1 : 0

  // ── Devoluções de uma venda ───────────────────────────────────────────────
  function devolucoesVenda(vendaId) {
    return devolucoes.filter(d => d.venda_id === vendaId)
  }

  // ── Registrar pagamento — idêntico ao Histórico ───────────────────────────
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

      {/* ── Modal Comprovante — idêntico ao Histórico ── */}
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
              <button onClick={imprimirComprovante}    style={{ flex:1, background:'linear-gradient(135deg,#1a6b5a,#145a4a)', color:'white', border:'none', padding:'12px', borderRadius:'8px', cursor:'pointer', fontSize:'15px', fontWeight:'bold' }}>🖨️ Imprimir</button>
              <button onClick={compartilharComprovante} style={{ flex:1, background:'linear-gradient(135deg,#1a6b5a,#145a4a)', color:'white', border:'none', padding:'12px', borderRadius:'8px', cursor:'pointer', fontSize:'15px', fontWeight:'bold' }}>📤 Compartilhar</button>
              <button onClick={() => setComprovanteVenda(null)} style={{ flex:1, background:'#eee', color:'#333', border:'none', padding:'12px', borderRadius:'8px', cursor:'pointer', fontSize:'15px' }}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Pagamento — idêntico ao Histórico ── */}
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

      {/* ── Filtros KPI (mês/ano/situação) ── */}
      <div style={{ background:'#fff', borderRadius:'16px', padding:'16px 20px', boxShadow:'0 2px 10px rgba(15,23,42,0.06)', border:'1px solid #eef2f7', margin:'16px 0' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px', marginBottom:'10px' }}>
          {[
            { label:'Ano',      value:filtroAno, set:setFiltroAno, ph:'Todos os anos',   opts:anosDisponiveis.map(a=>({v:String(a),l:String(a)})) },
            { label:'Mês',      value:filtroMes, set:setFiltroMes, ph:'Todos os meses',  opts:MESES_NOMES.map((m,i)=>({v:String(i+1),l:m})) },
            { label:'Situação', value:filtroSit, set:setFiltroSit, ph:'Todas',
              opts:[{v:'pago',l:'Pago'},{v:'pendente',l:'Pendente'},{v:'atrasado',l:'Atrasado'}] },
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

      {/* ── KPIs ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'12px', marginBottom:'16px' }}>
        <KpiCard label="Vendas Hoje"   valor={fmtBRL(vendasHoje.reduce((a,v)=>a+parseFloat(v.valor_total||0),0))} sub={`${vendasHoje.length} venda(s) hoje`}      cor="#1a6b5a" icon={<ShoppingBag size={20}/>}/>
        <KpiCard label="Total Vendas"  valor={qtdVendas}          sub="no período filtrado"                       cor="#e91e8c" icon={<ShoppingCart size={20}/>}/>
        <KpiCard label="Valor Vendido" valor={fmtBRL(totalVendido)}  sub={`${qtdVendas} venda(s)`}               cor="#29abe2" icon={<TrendingUp size={20}/>}/>
        <KpiCard label="Recebido"      valor={fmtBRL(totalRecebido)} sub={`de ${fmtBRL(totalVendido)}`}          cor="#10b981" icon={<Banknote size={20}/>}/>
        <KpiCard label="Atrasadas"     valor={inadimplentes.length}  sub={`${fmtBRL(totalInadimplente)} em aberto`} cor="#ef4444" icon={<AlertCircle size={20}/>}/>
        <KpiCard label="A Receber"     valor={aPagar.length}         sub={`${fmtBRL(totalAPagar)} pendente`}      cor="#f5821f" icon={<Clock size={20}/>}/>
        <KpiCard label="Ranking"       valor={posicaoRanking?`#${posicaoRanking}`:'—'} sub={`de ${ranking.length} vendedor(es)`} cor="#8b5cf6" icon={<Trophy size={20}/>}/>
      </div>

      {/* ── Meta do Mês ── */}
      <div style={{ background:'#fff', borderRadius:'18px', padding:'20px', boxShadow:'0 2px 12px rgba(15,23,42,0.06)', border:'1px solid #eef2f7', marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px', paddingBottom:'10px', borderBottom:'1px solid #f7f7f7' }}>
          <Target size={16} color="#1a6b5a"/>
          <span style={{ fontSize:'14px', fontWeight:'700', color:'#1a6b5a' }}>Meta do Mês</span>
          {(filtroMes||filtroAno) && (
            <span style={{ fontSize:'12px', color:'#a0aec0', background:'#f7fafc', padding:'2px 10px', borderRadius:'20px' }}>
              {filtroMes?MESES_NOMES[parseInt(filtroMes)-1]:''}{filtroMes&&filtroAno?'/':''}{filtroAno}
            </span>
          )}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
          <span style={{ fontSize:'13px', color:'#4a5568' }}><strong style={{ color:'#1a6b5a' }}>{fmtBRL(totalVendido)}</strong> de {fmtBRL(META_MENSAL)}</span>
          <span style={{ fontSize:'13px', fontWeight:'bold', color:progMeta>=100?'#10b981':progMeta>=70?'#f5821f':'#ef4444' }}>{progMeta.toFixed(0)}%</span>
        </div>
        <div style={{ background:'#f0f4f8', borderRadius:'999px', height:'14px', overflow:'hidden' }}>
          <motion.div initial={{ width:0 }} animate={{ width:`${progMeta}%` }} transition={{ duration:0.8, ease:'easeOut' }}
            style={{ height:'100%', borderRadius:'999px', background:progMeta>=100?'linear-gradient(90deg,#10b981,#4ade80)':progMeta>=70?'linear-gradient(90deg,#f5821f,#f7c948)':'linear-gradient(90deg,#ef4444,#f97316)' }}/>
        </div>
        {progMeta>=100
          ? <p style={{ fontSize:'12px', color:'#10b981', fontWeight:'bold', marginTop:'8px' }}>Meta atingida!</p>
          : <p style={{ fontSize:'12px', color:'#a0aec0', marginTop:'8px' }}>Falta {fmtBRL(META_MENSAL-totalVendido)} para a meta</p>
        }
      </div>

      {/* ── Ranking ── */}
      <div style={{ background:'#fff', borderRadius:'18px', padding:'20px', boxShadow:'0 2px 12px rgba(15,23,42,0.06)', border:'1px solid #eef2f7', marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px', paddingBottom:'10px', borderBottom:'1px solid #f7f7f7' }}>
          <Trophy size={16} color="#1a6b5a"/>
          <span style={{ fontSize:'14px', fontWeight:'700', color:'#1a6b5a' }}>Ranking de Vendedores</span>
        </div>
        {ranking.map(([nome, total], i) => {
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

      {/* ══════════════════════════════════════════════════════════════════════
          MINHAS VENDAS — layout idêntico ao Histórico
      ══════════════════════════════════════════════════════════════════════ */}

      {/* Filtros da tabela — idênticos ao Histórico */}
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

      {/* Tabela — idêntica ao Histórico */}
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
              const devs    = devolucoesVenda(venda.id)
              const falta   = parseFloat(venda.valor_total) - parseFloat(venda.recebido||0)
              const sit     = venda.situacao_real
              return (
                <>
                  <tr key={venda.id} style={{ background: i%2===0 ? '#fff' : '#f9f9f9' }}>
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
                      <span style={{ ...corSituacao(sit), padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'bold', whiteSpace:'nowrap' }}>
                        {sit}
                      </span>
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

                  {/* Linha expandida — produtos e devoluções */}
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
