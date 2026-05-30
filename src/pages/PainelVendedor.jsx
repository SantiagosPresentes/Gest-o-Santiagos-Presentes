import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { supabase } from '../supabase'
import { motion, AnimatePresence } from 'framer-motion'
import PageHeader from '../components/PageHeader'
import {
  User, TrendingUp, ShoppingBag, AlertCircle, Clock,
  CheckCircle2, XCircle, ChevronDown, ChevronUp,
  RefreshCw, Eye, Trophy, Target, Banknote, Package,
  ShoppingCart, Filter
} from 'lucide-react'

// ── Constantes ───────────────────────────────────────────────────────────────
const MESES_NOMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const META_MENSAL = 3000

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v || 0)
}

function fmtData(str) {
  if (!str) return '—'
  const d = new Date(str + 'T12:00:00')
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

function calcSituacao(venda) {
  const total    = parseFloat(venda.valor_total || 0)
  const recebido = parseFloat(venda.recebido   || 0)
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  const venc = new Date((venda.data_para_pagar || venda.data_venda) + 'T12:00:00')
  if (recebido >= total && total > 0) return 'pago'
  if (recebido > 0)                   return 'parcial'
  if (venc < hoje)                    return 'inadimplente'
  return 'pendente'
}

const SITUACOES = {
  pago:         { label:'Pago',         bg:'#e8f5e9', color:'#2e7d32', icon:<CheckCircle2 size={13}/> },
  parcial:      { label:'Parcial',      bg:'#fff8e1', color:'#f57f17', icon:<Clock size={13}/> },
  pendente:     { label:'Pendente',     bg:'#fff3e0', color:'#e65100', icon:<Clock size={13}/> },
  inadimplente: { label:'Inadimplente', bg:'#ffebee', color:'#c62828', icon:<XCircle size={13}/> },
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, valor, sub, cor, icon }) {
  return (
    <motion.div
      whileHover={{ y:-3, boxShadow:'0 8px 20px rgba(0,0,0,0.10)' }}
      transition={{ duration:0.15 }}
      style={{
        background:'#fff', borderRadius:'16px', padding:'16px',
        boxShadow:'0 2px 10px rgba(0,0,0,0.06)', borderLeft:`4px solid ${cor}`
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

// ── Modal de seleção de nome (caso não encontre perfil) ───────────────────────
function ModalSelecionarNome({ nomesDisponiveis, onSelecionar }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      <div style={{ background:'#fff', borderRadius:'20px', padding:'28px', width:'100%', maxWidth:'340px', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ width:'48px', height:'48px', borderRadius:'14px', background:'#1a6b5a18', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'16px' }}>
          <User size={24} color="#1a6b5a"/>
        </div>
        <h3 style={{ fontSize:'17px', fontWeight:'700', color:'#1a202c', marginBottom:'8px' }}>Qual é o seu nome?</h3>
        <p style={{ fontSize:'13px', color:'#a0aec0', marginBottom:'20px', lineHeight:'1.5' }}>
          Selecione seu nome para carregar suas vendas corretamente.
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          {nomesDisponiveis.map((nome, i) => (
            <button key={i} onClick={() => onSelecionar(nome)}
              style={{
                padding:'12px 16px', borderRadius:'12px', border:'1.5px solid #e2e8f0',
                background:'#f7fafc', color:'#2d3748', fontSize:'14px', fontWeight:'600',
                cursor:'pointer', textAlign:'left', transition:'all 0.15s'
              }}
              onMouseEnter={e => { e.target.style.background='#1a6b5a'; e.target.style.color='white'; e.target.style.borderColor='#1a6b5a' }}
              onMouseLeave={e => { e.target.style.background='#f7fafc'; e.target.style.color='#2d3748'; e.target.style.borderColor='#e2e8f0' }}
            >
              {nome}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function PainelVendedor() {
  // ── Auth & identidade ────────────────────────────────────────────────────
  const [emailUsuario,   setEmailUsuario]   = useState(null)
  const [nomeVendedor,   setNomeVendedor]   = useState(null)   // "Levy Santiago"
  const nomeRef          = useRef(null)                        // ref síncrona
  const [nomesParaEscolher, setNomesParaEscolher] = useState([])  // mantido por compatibilidade (não usado)

  // ── Dados ────────────────────────────────────────────────────────────────
  const [vendas,       setVendas]       = useState([])
  const [itensVenda,   setItensVenda]   = useState([])
  const [todasVendas,  setTodasVendas]  = useState([])
  const [carregando,   setCarregando]   = useState(true)

  // ── Filtros — todos vazios por padrão ───────────────────────────────────
  const [filtroMes, setFiltroMes] = useState('')
  const [filtroAno, setFiltroAno] = useState('')
  const [filtroSit, setFiltroSit] = useState('')

  const [expandido,      setExpandido]      = useState(null)
  const [pagando,        setPagando]        = useState({})
  const [comprovanteUrl, setComprovanteUrl] = useState(null)

  // ── Carrega vendas pelo nome do vendedor ─────────────────────────────────
  const carregarVendas = useCallback(async (nome) => {
    if (!nome) return
    const [vRes, ivRes, tvRes] = await Promise.all([
      supabase
        .from('vendas')
        .select('*, clientes(nome, telefone)')
        .eq('vendedor_nome', nome)
        .order('data_venda', { ascending: false }),
      supabase
        .from('itens_venda')
        .select('*, produtos(nome, categoria, preco_venda)'),
      supabase
        .from('vendas')
        .select('vendedor_nome, valor_total, recebido'),
    ])
    if (vRes.data)  setVendas(vRes.data)
    if (ivRes.data) setItensVenda(ivRes.data)
    if (tvRes.data) setTodasVendas(tvRes.data)
  }, [])

  // ── Mapeamento idêntico ao de Vendas.jsx ────────────────────────────────
  const NOMES_POR_EMAIL = {
    'levilaureano@gmail.com':           'Levy Santiago',
    'bruninhaa_oliveiraa@hotmail.com':  'Bruna Ambrózio',
    'pr.ubaldosantiago@gmail.com':      'Ubaldo Santiago',
    'vivianesantiago580@gmail.com':     'Viviane Santiago',
  }

  // ── Init principal ───────────────────────────────────────────────────────
  useEffect(() => {
    let channel

    async function init() {
      setCarregando(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setCarregando(false); return }
      setEmailUsuario(user.email)

      // Resolve nome pelo mapeamento — mesmo critério da tela de Vendas
      const nomeEncontrado = NOMES_POR_EMAIL[user.email] || user.email.split('@')[0]

      nomeRef.current = nomeEncontrado
      setNomeVendedor(nomeEncontrado)
      await carregarVendas(nomeEncontrado)

      setCarregando(false)

      // 4. Realtime — sincroniza com o Histórico automaticamente
      channel = supabase
        .channel('painel-sync-v2')
        .on('postgres_changes', { event: '*', schema:'public', table:'vendas' }, (payload) => {
          if (payload.eventType === 'UPDATE') {
            setVendas(prev => prev.map(v =>
              v.id === payload.new.id ? { ...v, ...payload.new } : v
            ))
            setTodasVendas(prev => prev.map(v =>
              v.id === payload.new.id
                ? { ...v, valor_total:payload.new.valor_total, recebido:payload.new.recebido }
                : v
            ))
          }
          if (payload.eventType === 'INSERT') {
            carregarVendas(nomeRef.current)
          }
        })
        .subscribe()
    }

    init()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [carregarVendas])

  // ── Mapa id→itens ─────────────────────────────────────────────────────────
  const itensMap = useMemo(() => {
    const m = {}
    itensVenda.forEach(i => {
      if (!m[i.venda_id]) m[i.venda_id] = []
      m[i.venda_id].push(i)
    })
    return m
  }, [itensVenda])

  const anosDisponiveis = useMemo(() =>
    [...new Set(vendas.map(v => new Date((v.data_para_pagar || v.data_venda) + 'T12:00:00').getFullYear()))].sort(),
    [vendas]
  )

  // ── Vendas filtradas ─────────────────────────────────────────────────────
  const vendasFiltradas = useMemo(() => vendas.filter(v => {
    const d = new Date((v.data_para_pagar || v.data_venda) + 'T12:00:00')
    if (filtroMes && d.getMonth() + 1 !== parseInt(filtroMes)) return false
    if (filtroAno && d.getFullYear()   !== parseInt(filtroAno))  return false
    if (filtroSit && calcSituacao(v)   !== filtroSit)             return false
    return true
  }), [vendas, filtroMes, filtroAno, filtroSit])

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const totalVendido  = useMemo(() => vendasFiltradas.reduce((a,v) => a + parseFloat(v.valor_total||0), 0), [vendasFiltradas])
  const totalRecebido = useMemo(() => vendasFiltradas.reduce((a,v) => a + parseFloat(v.recebido   ||0), 0), [vendasFiltradas])
  const qtdVendas     = vendasFiltradas.length
  const progMeta      = Math.min(100, (totalVendido / META_MENSAL) * 100)

  const hoje = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])
  const vendasHoje = useMemo(() => vendas.filter(v => {
    const d = new Date((v.data_venda || v.data_para_pagar) + 'T12:00:00')
    d.setHours(0,0,0,0)
    return d.getTime() === hoje.getTime()
  }), [vendas, hoje])
  const totalHoje = vendasHoje.reduce((a,v) => a + parseFloat(v.valor_total||0), 0)

  const inadimplentes = useMemo(() => vendasFiltradas.filter(v => calcSituacao(v) === 'inadimplente'), [vendasFiltradas])
  const aPagar        = useMemo(() => vendasFiltradas.filter(v => ['pendente','parcial'].includes(calcSituacao(v))), [vendasFiltradas])
  const totalInadimplente = inadimplentes.reduce((a,v) => a + parseFloat(v.valor_total||0) - parseFloat(v.recebido||0), 0)
  const totalAPagar       = aPagar.reduce((a,v) => a + parseFloat(v.valor_total||0) - parseFloat(v.recebido||0), 0)

  // ── Ranking ──────────────────────────────────────────────────────────────
  const ranking = useMemo(() => {
    const r = {}
    todasVendas.forEach(v => {
      const nome = v.vendedor_nome || 'Sem nome'
      if (!r[nome]) r[nome] = 0
      r[nome] += parseFloat(v.valor_total || 0)
    })
    return Object.entries(r).sort((a,b) => b[1] - a[1])
  }, [todasVendas])

  const posicaoRanking = nomeVendedor
    ? ranking.findIndex(([nome]) => nome === nomeVendedor) + 1
    : 0

  // ── Marcar como pago ─────────────────────────────────────────────────────
  async function handlePagar(venda) {
    if (calcSituacao(venda) === 'pago') return
    setPagando(p => ({ ...p, [venda.id]:true }))
    const novoRecebido = parseFloat(venda.valor_total || 0)
    const { error } = await supabase.from('vendas').update({
      recebido: novoRecebido,
      situacao: 'pago',
    }).eq('id', venda.id)
    if (!error) {
      setVendas(prev => prev.map(v =>
        v.id === venda.id ? { ...v, recebido:novoRecebido, situacao:'pago' } : v
      ))
      setTodasVendas(prev => prev.map(v =>
        v.id === venda.id ? { ...v, recebido:novoRecebido } : v
      ))
    }
    setPagando(p => ({ ...p, [venda.id]:false }))
  }

  // ── Comprovante ──────────────────────────────────────────────────────────
  async function verComprovante(venda) {
    if (!venda.comprovante_url) return
    const { data } = await supabase.storage
      .from('comprovantes')
      .createSignedUrl(venda.comprovante_url, 60)
    if (data?.signedUrl) setComprovanteUrl(data.signedUrl)
  }

  const temFiltro = filtroMes !== '' || filtroAno !== '' || filtroSit !== ''
  function limparFiltros() { setFiltroMes(''); setFiltroAno(''); setFiltroSit('') }

  const nomeExibido = nomeVendedor || (emailUsuario ? emailUsuario.split('@')[0] : '')

  // ── Estilos ───────────────────────────────────────────────────────────────
  const cardStyle = {
    background:'#fff', borderRadius:'18px', padding:'20px',
    boxShadow:'0 2px 12px rgba(15,23,42,0.06)', border:'1px solid #eef2f7', marginBottom:'16px'
  }
  const tituloStyle = {
    fontSize:'14px', fontWeight:'700', color:'#1a6b5a',
    marginBottom:'16px', paddingBottom:'10px', borderBottom:'1px solid #f7f7f7',
    display:'flex', alignItems:'center', gap:'8px'
  }

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

      {/* ── Filtros — 3 lado a lado ── */}
      <div style={{ background:'#fff', borderRadius:'16px', padding:'16px 20px', boxShadow:'0 2px 10px rgba(15,23,42,0.06)', border:'1px solid #eef2f7', margin:'16px 0' }}>

        {/* 3 selects em grid lado a lado */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px', marginBottom:'10px' }}>
          {[
            {
              label:'Ano', value:filtroAno, set:setFiltroAno,
              ph:'Todos os anos',
              opts: anosDisponiveis.map(a => ({ v:String(a), l:String(a) }))
            },
            {
              label:'Mês', value:filtroMes, set:setFiltroMes,
              ph:'Todos os meses',
              opts: MESES_NOMES.map((m,i) => ({ v:String(i+1), l:m }))
            },
            {
              label:'Situação', value:filtroSit, set:setFiltroSit,
              ph:'Todas',
              opts: Object.entries(SITUACOES).map(([k,v]) => ({ v:k, l:v.label }))
            },
          ].map((f, i) => (
            <div key={i}>
              <label style={{ display:'block', fontSize:'10px', fontWeight:'700', color:'#a0aec0', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                {f.label}
              </label>
              <select
                value={f.value}
                onChange={e => f.set(e.target.value)}
                style={{
                  width:'100%', padding:'8px 10px', borderRadius:'9px',
                  border:`1.5px solid ${f.value ? '#1a6b5a' : '#e2e8f0'}`,
                  fontSize:'12px',
                  color: f.value ? '#1a6b5a' : '#718096',
                  fontWeight: f.value ? '600' : '400',
                  background:'#fff', cursor:'pointer', outline:'none',
                  appearance:'none'
                }}
              >
                <option value="">{f.ph}</option>
                {f.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
          ))}
        </div>

        {/* Botões */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
          <button
            onClick={limparFiltros}
            disabled={!temFiltro}
            style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
              padding:'9px 12px', borderRadius:'9px', fontSize:'13px', fontWeight:'600',
              cursor: temFiltro ? 'pointer' : 'default',
              border: temFiltro ? '1px solid #fed7d7' : '1px solid #e2e8f0',
              background: temFiltro ? '#fff5f5' : '#f7fafc',
              color: temFiltro ? '#e53e3e' : '#a0aec0',
              transition:'all 0.2s'
            }}
          >
            <XCircle size={14}/> Limpar filtros
          </button>
          <button
            onClick={() => carregarVendas(nomeRef.current)}
            style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
              padding:'9px 12px', borderRadius:'9px', border:'none',
              background:'#1a6b5a', color:'white', fontSize:'13px', fontWeight:'600', cursor:'pointer'
            }}
          >
            <RefreshCw size={14}/> Atualizar
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'12px', marginBottom:'16px' }}>
        <KpiCard label="Vendas Hoje"   valor={fmtBRL(totalHoje)}       sub={`${vendasHoje.length} venda(s) hoje`}           cor="#1a6b5a" icon={<ShoppingBag size={20}/>}/>
        <KpiCard label="Total Vendas"  valor={qtdVendas}               sub="no período filtrado"                             cor="#e91e8c" icon={<ShoppingCart size={20}/>}/>
        <KpiCard label="Valor Vendido" valor={fmtBRL(totalVendido)}    sub={`${qtdVendas} venda(s)`}                        cor="#29abe2" icon={<TrendingUp size={20}/>}/>
        <KpiCard label="Recebido"      valor={fmtBRL(totalRecebido)}   sub={`de ${fmtBRL(totalVendido)}`}                   cor="#10b981" icon={<Banknote size={20}/>}/>
        <KpiCard label="Inadimplentes" valor={inadimplentes.length}    sub={`${fmtBRL(totalInadimplente)} em aberto`}       cor="#ef4444" icon={<AlertCircle size={20}/>}/>
        <KpiCard label="A Receber"     valor={aPagar.length}           sub={`${fmtBRL(totalAPagar)} pendente`}              cor="#f5821f" icon={<Clock size={20}/>}/>
        <KpiCard label="Ranking"       valor={posicaoRanking ? `#${posicaoRanking}` : '—'} sub={`de ${ranking.length} vendedor(es)`} cor="#8b5cf6" icon={<Trophy size={20}/>}/>
      </div>

      {/* ── Meta do mês ── */}
      <div style={cardStyle}>
        <div style={tituloStyle}>
          <Target size={16}/>
          Meta do Mês
          {(filtroMes || filtroAno) && (
            <span style={{ fontSize:'12px', fontWeight:'normal', color:'#a0aec0', background:'#f7fafc', padding:'2px 10px', borderRadius:'20px', marginLeft:'4px' }}>
              {filtroMes ? MESES_NOMES[parseInt(filtroMes)-1] : ''}{filtroMes && filtroAno ? '/' : ''}{filtroAno}
            </span>
          )}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
          <span style={{ fontSize:'13px', color:'#4a5568' }}>
            <strong style={{ color:'#1a6b5a' }}>{fmtBRL(totalVendido)}</strong>{' '}de {fmtBRL(META_MENSAL)}
          </span>
          <span style={{ fontSize:'13px', fontWeight:'bold', color:progMeta>=100?'#10b981':progMeta>=70?'#f5821f':'#ef4444' }}>
            {progMeta.toFixed(0)}%
          </span>
        </div>
        <div style={{ background:'#f0f4f8', borderRadius:'999px', height:'14px', overflow:'hidden' }}>
          <motion.div
            initial={{ width:0 }} animate={{ width:`${progMeta}%` }} transition={{ duration:0.8, ease:'easeOut' }}
            style={{ height:'100%', borderRadius:'999px', background:progMeta>=100?'linear-gradient(90deg,#10b981,#4ade80)':progMeta>=70?'linear-gradient(90deg,#f5821f,#f7c948)':'linear-gradient(90deg,#ef4444,#f97316)' }}
          />
        </div>
        {progMeta >= 100
          ? <p style={{ fontSize:'12px', color:'#10b981', fontWeight:'bold', marginTop:'8px' }}>Meta atingida!</p>
          : <p style={{ fontSize:'12px', color:'#a0aec0', marginTop:'8px' }}>Falta {fmtBRL(META_MENSAL - totalVendido)} para a meta</p>
        }
      </div>

      {/* ── Ranking ── */}
      <div style={cardStyle}>
        <div style={tituloStyle}><Trophy size={16}/> Ranking de Vendedores</div>
        {ranking.length === 0
          ? <p style={{ color:'#a0aec0', textAlign:'center', padding:'20px', fontSize:'13px' }}>Sem dados de ranking.</p>
          : ranking.map(([nome, total], i) => {
            const isMeu   = nome === nomeVendedor
            const medalha = i===0?'#f7c948':i===1?'#b0bec5':i===2?'#cd7f32':'#edf2f7'
            const corTxt  = i < 3 ? '#333' : '#a0aec0'
            return (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:'10px',
                padding:'10px 12px', borderRadius:'10px', marginBottom:'8px',
                background: isMeu ? '#f0faf6' : '#f9fafb',
                border: `1.5px solid ${isMeu ? '#1a6b5a' : 'transparent'}`
              }}>
                <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:medalha, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize:'12px', color:corTxt, flexShrink:0 }}>
                  {i+1}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'13px', fontWeight:isMeu?'bold':'600', color:isMeu?'#1a6b5a':'#2d3748', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {nome} {isMeu && <span style={{ fontSize:'11px', color:'#a0aec0', fontWeight:'normal' }}>(você)</span>}
                  </div>
                  <div style={{ background:'#e2e8f0', borderRadius:'999px', height:'4px', marginTop:'4px', overflow:'hidden' }}>
                    <div style={{ width:`${(total/(ranking[0]?.[1]||1))*100}%`, height:'100%', borderRadius:'999px', background:isMeu?'#1a6b5a':'#cbd5e0' }}/>
                  </div>
                </div>
                <div style={{ fontSize:'13px', fontWeight:'bold', color:isMeu?'#1a6b5a':'#4a5568', flexShrink:0 }}>
                  {fmtBRL(total)}
                </div>
              </div>
            )
          })
        }
      </div>

      {/* ── Minhas Vendas ── */}
      <div style={cardStyle}>
        <div style={tituloStyle}>
          <Package size={16}/> Minhas Vendas
          <span style={{ marginLeft:'4px', fontSize:'12px', fontWeight:'normal', color:'#a0aec0', background:'#f7fafc', padding:'2px 10px', borderRadius:'20px' }}>
            {vendasFiltradas.length} resultado(s)
          </span>
        </div>

        {vendasFiltradas.length === 0 ? (
          <p style={{ color:'#a0aec0', textAlign:'center', padding:'30px', fontSize:'14px' }}>
            {vendas.length === 0
              ? 'Nenhuma venda registrada ainda.'
              : 'Nenhuma venda para o período selecionado.'}
          </p>
        ) : vendasFiltradas.map(venda => {
          const sit       = calcSituacao(venda)
          const sitInfo   = SITUACOES[sit]
          const isOpen    = expandido === venda.id
          const itens     = itensMap[venda.id] || []
          const emAberto  = Math.max(0, parseFloat(venda.valor_total||0) - parseFloat(venda.recebido||0))
          const isPagando = pagando[venda.id]
          const clienteNome = venda.clientes?.nome || '—'

          return (
            <div key={venda.id} style={{ border:'1.5px solid #eef2f7', borderRadius:'14px', marginBottom:'10px', overflow:'hidden' }}>

              {/* Cabeçalho */}
              <div
                onClick={() => setExpandido(isOpen ? null : venda.id)}
                style={{ padding:'14px 16px', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', background:isOpen?'#f8fffe':'#fff' }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:'4px', padding:'4px 10px', borderRadius:'20px', background:sitInfo.bg, color:sitInfo.color, fontSize:'11px', fontWeight:'700', flexShrink:0 }}>
                  {sitInfo.icon} {sitInfo.label}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'13px', fontWeight:'bold', color:'#2d3748', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{clienteNome}</div>
                  <div style={{ fontSize:'11px', color:'#a0aec0', marginTop:'2px' }}>{fmtData(venda.data_para_pagar)} · {itens.length} produto(s)</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:'14px', fontWeight:'bold', color:'#1a6b5a' }}>{fmtBRL(venda.valor_total)}</div>
                  {emAberto > 0.01 && <div style={{ fontSize:'11px', color:'#ef4444' }}>-{fmtBRL(emAberto)} aberto</div>}
                </div>
                <div style={{ color:'#a0aec0', flexShrink:0 }}>
                  {isOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </div>
              </div>

              {/* Detalhe expandido */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
                    transition={{ duration:0.2 }}
                    style={{ borderTop:'1px solid #f0f0f0', background:'#fafafa', overflow:'hidden' }}
                  >
                    <div style={{ padding:'14px 16px' }}>

                      {/* Produtos */}
                      <p style={{ fontSize:'11px', fontWeight:'700', color:'#a0aec0', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>Produtos</p>
                      {itens.length === 0
                        ? <p style={{ fontSize:'13px', color:'#a0aec0', marginBottom:'12px' }}>Sem itens registrados</p>
                        : itens.map((item, idx) => (
                          <div key={idx} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', background:'#fff', borderRadius:'8px', marginBottom:'6px', border:'1px solid #eef2f7' }}>
                            <div style={{ flex:1, minWidth:0, paddingRight:'8px' }}>
                              <div style={{ fontSize:'13px', fontWeight:'600', color:'#2d3748', wordBreak:'break-word' }}>{item.produtos?.nome || '—'}</div>
                              <div style={{ fontSize:'11px', color:'#a0aec0' }}>{item.produtos?.categoria} · {item.quantidade} un.</div>
                            </div>
                            <div style={{ textAlign:'right', flexShrink:0 }}>
                              <div style={{ fontSize:'13px', fontWeight:'bold', color:'#1a6b5a' }}>{fmtBRL(item.quantidade * parseFloat(item.valor_unitario||0))}</div>
                              <div style={{ fontSize:'11px', color:'#a0aec0' }}>{fmtBRL(item.valor_unitario)} /un.</div>
                            </div>
                          </div>
                        ))
                      }

                      {/* Pagamento */}
                      <p style={{ fontSize:'11px', fontWeight:'700', color:'#a0aec0', textTransform:'uppercase', letterSpacing:'0.5px', margin:'14px 0 8px' }}>Pagamento</p>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
                        {[
                          { label:'Total',      valor:fmtBRL(venda.valor_total),      cor:'#2d3748' },
                          { label:'Recebido',   valor:fmtBRL(venda.recebido),         cor:'#10b981' },
                          { label:'Em aberto',  valor:fmtBRL(emAberto),               cor:emAberto>0.01?'#ef4444':'#10b981' },
                          { label:'Vencimento', valor:fmtData(venda.data_para_pagar), cor:'#4a5568' },
                        ].map((r,i) => (
                          <div key={i} style={{ background:'#fff', borderRadius:'8px', padding:'8px 10px', border:'1px solid #eef2f7' }}>
                            <div style={{ fontSize:'10px', color:'#a0aec0', fontWeight:'600', textTransform:'uppercase' }}>{r.label}</div>
                            <div style={{ fontSize:'13px', fontWeight:'bold', color:r.cor, marginTop:'2px' }}>{r.valor}</div>
                          </div>
                        ))}
                      </div>

                      {/* Ações — idênticas ao Histórico */}
                      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                        {sit !== 'pago' ? (
                          <button onClick={() => handlePagar(venda)} disabled={isPagando}
                            style={{ flex:1, minWidth:'140px', padding:'10px 14px', borderRadius:'10px', border:'none', color:'white', fontWeight:'700', fontSize:'13px', cursor:isPagando?'default':'pointer', background:isPagando?'#a0aec0':'linear-gradient(135deg,#1a6b5a,#10b981)', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
                            {isPagando
                              ? <><RefreshCw size={13} style={{ animation:'spin 1s linear infinite' }}/> Salvando...</>
                              : <><CheckCircle2 size={14}/> Marcar como Pago</>
                            }
                          </button>
                        ) : (
                          <div style={{ flex:1, minWidth:'140px', padding:'10px 14px', borderRadius:'10px', background:'#e8f5e9', color:'#2e7d32', fontWeight:'700', fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
                            <CheckCircle2 size={14}/> Pago
                          </div>
                        )}
                        {venda.comprovante_url && (
                          <button onClick={() => verComprovante(venda)}
                            style={{ padding:'10px 14px', borderRadius:'10px', border:'1.5px solid #1a6b5a', background:'#fff', color:'#1a6b5a', fontWeight:'700', fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
                            <Eye size={14}/> Comprovante
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Modal comprovante */}
      <AnimatePresence>
        {comprovanteUrl && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={() => setComprovanteUrl(null)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
            <motion.div initial={{ scale:0.9 }} animate={{ scale:1 }} exit={{ scale:0.9 }}
              onClick={e => e.stopPropagation()}
              style={{ background:'#fff', borderRadius:'16px', padding:'16px', maxWidth:'90vw', maxHeight:'85vh', overflow:'auto' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                <span style={{ fontWeight:'bold', color:'#2d3748' }}>Comprovante</span>
                <button onClick={() => setComprovanteUrl(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'20px', color:'#a0aec0' }}>✕</button>
              </div>
              <img src={comprovanteUrl} alt="Comprovante" style={{ maxWidth:'100%', borderRadius:'8px' }}/>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
