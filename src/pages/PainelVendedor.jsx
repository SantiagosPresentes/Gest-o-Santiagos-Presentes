import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { motion, AnimatePresence } from 'framer-motion'
import PageHeader from '../components/PageHeader'
import {
  User, TrendingUp, ShoppingBag, AlertCircle, Clock,
  CheckCircle2, XCircle, ChevronDown, ChevronUp,
  RefreshCw, Eye, Trophy, Target, Banknote, Package, Filter, FilterX
} from 'lucide-react'

const MESES_NOMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const META_MENSAL = 3000

function fmt(v) { return `R$ ${parseFloat(v || 0).toFixed(2)}` }

function fmtData(str) {
  if (!str) return '—'
  const d = new Date(str + 'T12:00:00')
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

const SITUACOES = {
  'pago':         { label: 'Pago',         bg: '#e8f5e9', color: '#2e7d32', icon: <CheckCircle2 size={13}/> },
  'parcial':      { label: 'Parcial',      bg: '#fff8e1', color: '#f57f17', icon: <Clock size={13}/> },
  'pendente':     { label: 'Pendente',     bg: '#fff3e0', color: '#e65100', icon: <Clock size={13}/> },
  'inadimplente': { label: 'Inadimplente', bg: '#ffebee', color: '#c62828', icon: <XCircle size={13}/> },
}

function calcSituacao(venda) {
  const total    = parseFloat(venda.valor_total || 0)
  const recebido = parseFloat(venda.recebido   || 0)
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  const venc = new Date(venda.data_para_pagar + 'T12:00:00')
  if (recebido >= total && total > 0) return 'pago'
  if (recebido > 0)                   return 'parcial'
  if (venc < hoje)                    return 'inadimplente'
  return 'pendente'
}

export default function PainelVendedor() {
  const [vendedor,       setVendedor]       = useState(null)
  const [vendas,         setVendas]         = useState([])
  const [itensVenda,     setItensVenda]     = useState([])
  const [todasVendas,    setTodasVendas]    = useState([])
  const [carregando,     setCarregando]     = useState(true)
  const [filtroMes,      setFiltroMes]      = useState(String(new Date().getMonth() + 1))
  const [filtroAno,      setFiltroAno]      = useState(String(new Date().getFullYear()))
  const [filtroSit,      setFiltroSit]      = useState('')
  const [expandido,      setExpandido]      = useState(null)
  const [pagando,        setPagando]        = useState({})
  const [comprovanteUrl, setComprovanteUrl] = useState(null)

  useEffect(() => { init() }, [])

  async function init() {
    setCarregando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCarregando(false); return }
    setVendedor(user.email)

    const [vRes, ivRes, tvRes] = await Promise.all([
      supabase.from('vendas')
        .select('*, clientes(nome, telefone)')
        .eq('vendedor_nome', user.email)
        .order('data_venda', { ascending: false }),
      supabase.from('itens_venda')
        .select('*, produtos(nome, categoria, preco_venda)'),
      supabase.from('vendas')
        .select('vendedor_nome, valor_total, recebido'),
    ])
    if (vRes.data)  setVendas(vRes.data)
    if (ivRes.data) setItensVenda(ivRes.data)
    if (tvRes.data) setTodasVendas(tvRes.data)
    setCarregando(false)
  }

  // mapa id→itens O(1)
  const itensMap = useMemo(() => {
    const m = {}
    itensVenda.forEach(i => {
      if (!m[i.venda_id]) m[i.venda_id] = []
      m[i.venda_id].push(i)
    })
    return m
  }, [itensVenda])

  const anosDisponiveis = useMemo(() =>
    [...new Set(vendas.map(v => new Date(v.data_para_pagar + 'T12:00:00').getFullYear()))].sort(),
    [vendas]
  )

  const vendasFiltradas = useMemo(() => vendas.filter(v => {
    const d = new Date(v.data_para_pagar + 'T12:00:00')
    if (filtroMes && d.getMonth() + 1 !== parseInt(filtroMes)) return false
    if (filtroAno && d.getFullYear()   !== parseInt(filtroAno)) return false
    if (filtroSit && calcSituacao(v)  !== filtroSit)            return false
    return true
  }), [vendas, filtroMes, filtroAno, filtroSit])

  // KPIs
  const totalVendido  = useMemo(() => vendasFiltradas.reduce((a,v) => a + parseFloat(v.valor_total||0), 0), [vendasFiltradas])
  const totalRecebido = useMemo(() => vendasFiltradas.reduce((a,v) => a + parseFloat(v.recebido   ||0), 0), [vendasFiltradas])
  const qtdVendas     = vendasFiltradas.length
  const progMeta      = Math.min(100, (totalVendido / META_MENSAL) * 100)

  const hoje = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])
  const vendasHoje = useMemo(() => vendas.filter(v => {
    const d = new Date(v.data_venda || v.data_para_pagar)
    d.setHours(0,0,0,0)
    return d.getTime() === hoje.getTime()
  }), [vendas, hoje])
  const totalHoje = vendasHoje.reduce((a,v) => a + parseFloat(v.valor_total||0), 0)

  const inadimplentes = useMemo(() => vendasFiltradas.filter(v => calcSituacao(v) === 'inadimplente'), [vendasFiltradas])
  const aPagar        = useMemo(() => vendasFiltradas.filter(v => ['pendente','parcial'].includes(calcSituacao(v))), [vendasFiltradas])

  // ranking geral
  const ranking = useMemo(() => {
    const r = {}
    todasVendas.forEach(v => {
      const nome = v.vendedor_nome || 'Sem nome'
      if (!r[nome]) r[nome] = 0
      r[nome] += parseFloat(v.valor_total || 0)
    })
    return Object.entries(r).sort((a,b) => b[1] - a[1])
  }, [todasVendas])

  const posicaoRanking = ranking.findIndex(([nome]) => nome === vendedor) + 1

  // marcar como pago — atualiza vendas e situacao (Histórico usa a mesma tabela)
  async function handlePagar(venda) {
    if (calcSituacao(venda) === 'pago') return
    setPagando(p => ({ ...p, [venda.id]: true }))
    const novoRecebido = parseFloat(venda.valor_total || 0)
    const { error } = await supabase.from('vendas').update({
      recebido: novoRecebido,
      situacao: 'pago',
    }).eq('id', venda.id)
    if (!error) {
      setVendas(prev => prev.map(v =>
        v.id === venda.id ? { ...v, recebido: novoRecebido, situacao: 'pago' } : v
      ))
    }
    setPagando(p => ({ ...p, [venda.id]: false }))
  }

  async function verComprovante(venda) {
    if (!venda.comprovante_url) return
    const { data } = await supabase.storage
      .from('comprovantes')
      .createSignedUrl(venda.comprovante_url, 60)
    if (data?.signedUrl) setComprovanteUrl(data.signedUrl)
  }

  const card  = { background:'#fff', borderRadius:'18px', padding:'20px', boxShadow:'0 2px 12px rgba(15,23,42,0.07)', border:'1px solid #eef2f7', marginBottom:'16px' }
  const titulo = { fontSize:'14px', fontWeight:'700', color:'#1a6b5a', marginBottom:'16px', paddingBottom:'10px', borderBottom:'2px solid #f0f0f0', display:'flex', alignItems:'center', gap:'8px' }

  if (carregando) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh',flexDirection:'column',gap:'16px'}}>
      <div style={{width:'44px',height:'44px',border:'4px solid #eee',borderTop:'4px solid #1a6b5a',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
      <p style={{color:'#888',fontSize:'14px'}}>Carregando seu painel...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!vendedor) return (
    <div style={{textAlign:'center',padding:'60px 20px',color:'#888'}}>
      <User size={48} color="#ccc" style={{marginBottom:'16px'}}/>
      <p>Faça login para acessar seu painel.</p>
    </div>
  )

  const nomeExibido = vendedor.split('@')[0]

  return (
    <div style={{background:'#f4f6f9',minHeight:'100vh',padding:'0 0 40px 0'}}>
      <PageHeader
        title={`Olá, ${nomeExibido} 👋`}
        subtitle="Seu painel de vendas"
        icon={<User size={22} color="white"/>}
      />

      {/* Filtros */}
      <div style={{background:'#fff',borderRadius:'16px',padding:'16px 20px',boxShadow:'0 2px 12px rgba(15,23,42,0.07)',border:'1px solid #eef2f7',margin:'16px 0'}}>
        {/* Filtros — 3 lado a lado */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px',marginBottom:'12px'}}>
          {[
            { label:'Ano',      value:filtroAno, set:setFiltroAno, opts:anosDisponiveis.map(a=>({v:String(a),l:String(a)})), ph:'Todos anos'  },
            { label:'Mês',      value:filtroMes, set:setFiltroMes, opts:MESES_NOMES.map((m,i)=>({v:String(i+1),l:m})),       ph:'Todos meses' },
            { label:'Situação', value:filtroSit, set:setFiltroSit, opts:Object.entries(SITUACOES).map(([k,v])=>({v:k,l:v.label})), ph:'Todas' },
          ].map((f,i) => (
            <div key={i}>
              <label style={{display:'block',fontSize:'11px',fontWeight:'600',color:'#888',marginBottom:'5px'}}>{f.label}</label>
              <div style={{position:'relative'}}>
                <select value={f.value} onChange={e=>f.set(e.target.value)}
                  style={{width:'100%',padding:'9px 28px 9px 10px',borderRadius:'10px',border:'1.5px solid #e5e7eb',fontSize:'12px',color:'#555',background:'#fff',appearance:'none',cursor:'pointer',outline:'none',boxSizing:'border-box'}}>
                  <option value="">{f.ph}</option>
                  {f.opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
                <Filter size={12} color="#aaa" style={{position:'absolute',right:'8px',top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}/>
              </div>
            </div>
          ))}
        </div>
        {/* Botões — abaixo dos filtros */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
          <button
            onClick={()=>{setFiltroMes(String(new Date().getMonth()+1));setFiltroAno(String(new Date().getFullYear()));setFiltroSit('')}}
            disabled={!(filtroMes !== String(new Date().getMonth()+1) || filtroAno !== String(new Date().getFullYear()) || filtroSit !== '')}
            style={{
              display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',
              padding:'9px 12px',borderRadius:'8px',
              border:(filtroMes !== String(new Date().getMonth()+1) || filtroAno !== String(new Date().getFullYear()) || filtroSit !== '')?'1px solid #e94560':'1px solid #c0392b',
              background:(filtroMes !== String(new Date().getMonth()+1) || filtroAno !== String(new Date().getFullYear()) || filtroSit !== '')?'#e94560':'#fff',
              color:(filtroMes !== String(new Date().getMonth()+1) || filtroAno !== String(new Date().getFullYear()) || filtroSit !== '')?'white':'#c0392b',
              fontSize:'13px',fontWeight:'500',
              cursor:(filtroMes !== String(new Date().getMonth()+1) || filtroAno !== String(new Date().getFullYear()) || filtroSit !== '')?'pointer':'default',
              transition:'all 0.2s ease',
              opacity:(filtroMes !== String(new Date().getMonth()+1) || filtroAno !== String(new Date().getFullYear()) || filtroSit !== '')?1:0.6,
            }}>
            <FilterX size={14}/> Limpar filtros
          </button>
          <button onClick={init}
            style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',padding:'9px 12px',borderRadius:'8px',border:'none',background:'#1a6b5a',color:'white',fontSize:'13px',fontWeight:'600',cursor:'pointer'}}>
            <RefreshCw size={14}/> Atualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'12px',marginBottom:'16px'}}>
        {[
          { label:'Vendas Hoje',    valor:fmt(totalHoje),       sub:`${vendasHoje.length} venda(s)`,   cor:'#1a6b5a', icon:<ShoppingBag size={20}/> },
          { label:'Vendido no Mês', valor:fmt(totalVendido),    sub:`${qtdVendas} venda(s)`,           cor:'#29abe2', icon:<TrendingUp size={20}/> },
          { label:'Recebido',       valor:fmt(totalRecebido),   sub:`de ${fmt(totalVendido)}`,          cor:'#10b981', icon:<Banknote size={20}/> },
          { label:'Inadimplentes',  valor:inadimplentes.length, sub:fmt(inadimplentes.reduce((a,v)=>a+parseFloat(v.valor_total||0)-parseFloat(v.recebido||0),0))+' em aberto', cor:'#ef4444', icon:<AlertCircle size={20}/> },
          { label:'A Receber',      valor:aPagar.length,        sub:fmt(aPagar.reduce((a,v)=>a+parseFloat(v.valor_total||0)-parseFloat(v.recebido||0),0))+' pendente',         cor:'#f5821f', icon:<Clock size={20}/> },
          { label:'Ranking',        valor:`#${posicaoRanking}`, sub:`de ${ranking.length} vendedores`, cor:'#8b5cf6', icon:<Trophy size={20}/> },
        ].map((kpi,i) => (
          <motion.div key={i} whileHover={{y:-3,boxShadow:'0 8px 20px rgba(0,0,0,0.10)'}} transition={{duration:0.15}}
            style={{background:'#fff',borderRadius:'16px',padding:'16px',boxShadow:'0 2px 10px rgba(0,0,0,0.06)',borderLeft:`4px solid ${kpi.cor}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
              <span style={{fontSize:'11px',color:'#999',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>{kpi.label}</span>
              <span style={{color:kpi.cor,opacity:0.7}}>{kpi.icon}</span>
            </div>
            <div style={{fontSize:'20px',fontWeight:'bold',color:kpi.cor,marginBottom:'2px'}}>{kpi.valor}</div>
            <div style={{fontSize:'11px',color:'#aaa'}}>{kpi.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Meta do mês */}
      <div style={card}>
        <div style={titulo}><Target size={16}/> Meta do Mês — {MESES_NOMES[parseInt(filtroMes||new Date().getMonth()+1)-1]}</div>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
          <span style={{fontSize:'13px',color:'#555'}}>
            <strong style={{color:'#1a6b5a'}}>{fmt(totalVendido)}</strong> de {fmt(META_MENSAL)}
          </span>
          <span style={{fontSize:'13px',fontWeight:'bold',color:progMeta>=100?'#10b981':progMeta>=70?'#f5821f':'#ef4444'}}>
            {progMeta.toFixed(0)}%
          </span>
        </div>
        <div style={{background:'#f0f0f0',borderRadius:'999px',height:'14px',overflow:'hidden'}}>
          <motion.div initial={{width:0}} animate={{width:`${progMeta}%`}} transition={{duration:0.8,ease:'easeOut'}}
            style={{height:'100%',borderRadius:'999px',background:progMeta>=100?'linear-gradient(90deg,#10b981,#4ade80)':progMeta>=70?'linear-gradient(90deg,#f5821f,#f7c948)':'linear-gradient(90deg,#ef4444,#f97316)'}}/>
        </div>
        {progMeta >= 100
          ? <p style={{fontSize:'12px',color:'#10b981',fontWeight:'bold',marginTop:'8px'}}>🎉 Meta atingida!</p>
          : <p style={{fontSize:'12px',color:'#888',marginTop:'8px'}}>Falta {fmt(META_MENSAL - totalVendido)} para a meta</p>
        }
      </div>

      {/* Ranking */}
      <div style={card}>
        <div style={titulo}><Trophy size={16}/> Ranking de Vendedores</div>
        {ranking.map(([nome, total], i) => {
          const isMeu   = nome === vendedor
          const nomeEx  = nome.split('@')[0]
          const medalha = i===0?'#f7c948':i===1?'#b0bec5':i===2?'#cd7f32':'#e0e0e0'
          return (
            <div key={i} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 12px',borderRadius:'10px',marginBottom:'8px',background:isMeu?'#f0faf6':'#f9f9f9',border:isMeu?'1.5px solid #1a6b5a':'1.5px solid transparent'}}>
              <div style={{width:'28px',height:'28px',borderRadius:'50%',background:medalha,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'bold',fontSize:'13px',color:i<3?'#333':'#888',flexShrink:0}}>
                {i+1}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'13px',fontWeight:isMeu?'bold':'600',color:isMeu?'#1a6b5a':'#333',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {nomeEx} {isMeu && '(você)'}
                </div>
                <div style={{background:'#e0e0e0',borderRadius:'999px',height:'5px',marginTop:'4px',overflow:'hidden'}}>
                  <div style={{width:`${(total/(ranking[0]?.[1]||1))*100}%`,height:'100%',background:isMeu?'#1a6b5a':'#bbb',borderRadius:'999px'}}/>
                </div>
              </div>
              <div style={{fontSize:'13px',fontWeight:'bold',color:isMeu?'#1a6b5a':'#555',flexShrink:0}}>{fmt(total)}</div>
            </div>
          )
        })}
      </div>

      {/* Lista de vendas */}
      <div style={card}>
        <div style={titulo}><Package size={16}/> Minhas Vendas ({vendasFiltradas.length})</div>
        {vendasFiltradas.length === 0 ? (
          <p style={{color:'#aaa',textAlign:'center',padding:'30px',fontSize:'14px'}}>Nenhuma venda encontrada para o período.</p>
        ) : vendasFiltradas.map(venda => {
          const sit       = calcSituacao(venda)
          const sitInfo   = SITUACOES[sit]
          const isOpen    = expandido === venda.id
          const itens     = itensMap[venda.id] || []
          const emAberto  = parseFloat(venda.valor_total||0) - parseFloat(venda.recebido||0)
          const isPagando = pagando[venda.id]
          const clienteNome = venda.clientes?.nome || '—'

          return (
            <div key={venda.id} style={{border:'1.5px solid #eef2f7',borderRadius:'14px',marginBottom:'10px',overflow:'hidden'}}>

              {/* Cabeçalho */}
              <div onClick={()=>setExpandido(isOpen?null:venda.id)}
                style={{padding:'14px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:'12px',background:isOpen?'#f8fffe':'#fff'}}>
                <div style={{display:'flex',alignItems:'center',gap:'4px',padding:'4px 10px',borderRadius:'20px',background:sitInfo.bg,color:sitInfo.color,fontSize:'11px',fontWeight:'700',flexShrink:0}}>
                  {sitInfo.icon} {sitInfo.label}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'13px',fontWeight:'bold',color:'#333',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{clienteNome}</div>
                  <div style={{fontSize:'11px',color:'#888',marginTop:'2px'}}>{fmtData(venda.data_para_pagar)} · {itens.length} produto(s)</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:'14px',fontWeight:'bold',color:'#1a6b5a'}}>{fmt(venda.valor_total)}</div>
                  {emAberto > 0.01 && <div style={{fontSize:'11px',color:'#ef4444'}}>-{fmt(emAberto)} aberto</div>}
                </div>
                <div style={{color:'#aaa',flexShrink:0}}>{isOpen?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</div>
              </div>

              {/* Detalhe */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.2}}
                    style={{borderTop:'1px solid #f0f0f0',background:'#fafafa',overflow:'hidden'}}>
                    <div style={{padding:'14px 16px'}}>

                      {/* Produtos */}
                      <p style={{fontSize:'11px',fontWeight:'700',color:'#888',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'8px'}}>Produtos</p>
                      {itens.length === 0
                        ? <p style={{fontSize:'13px',color:'#aaa',marginBottom:'12px'}}>Sem itens registrados</p>
                        : itens.map((item,idx) => (
                          <div key={idx} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',background:'#fff',borderRadius:'8px',marginBottom:'6px',border:'1px solid #eee'}}>
                            <div style={{flex:1,minWidth:0,paddingRight:'8px'}}>
                              <div style={{fontSize:'13px',fontWeight:'600',color:'#333',wordBreak:'break-word'}}>{item.produtos?.nome || '—'}</div>
                              <div style={{fontSize:'11px',color:'#aaa'}}>{item.produtos?.categoria} · {item.quantidade} un.</div>
                            </div>
                            <div style={{textAlign:'right',flexShrink:0}}>
                              <div style={{fontSize:'13px',fontWeight:'bold',color:'#1a6b5a'}}>{fmt(item.quantidade * parseFloat(item.valor_unitario||0))}</div>
                              <div style={{fontSize:'11px',color:'#aaa'}}>{fmt(item.valor_unitario)} /un.</div>
                            </div>
                          </div>
                        ))
                      }

                      {/* Pagamento */}
                      <p style={{fontSize:'11px',fontWeight:'700',color:'#888',textTransform:'uppercase',letterSpacing:'0.5px',margin:'14px 0 8px'}}>Pagamento</p>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'12px'}}>
                        {[
                          { label:'Total',     valor:fmt(venda.valor_total),     cor:'#333' },
                          { label:'Recebido',  valor:fmt(venda.recebido),        cor:'#10b981' },
                          { label:'Em aberto', valor:fmt(emAberto),              cor:emAberto>0.01?'#ef4444':'#10b981' },
                          { label:'Vencimento',valor:fmtData(venda.data_para_pagar), cor:'#555' },
                        ].map((r,i) => (
                          <div key={i} style={{background:'#fff',borderRadius:'8px',padding:'8px 10px',border:'1px solid #eee'}}>
                            <div style={{fontSize:'10px',color:'#aaa',fontWeight:'600',textTransform:'uppercase'}}>{r.label}</div>
                            <div style={{fontSize:'13px',fontWeight:'bold',color:r.cor,marginTop:'2px'}}>{r.valor}</div>
                          </div>
                        ))}
                      </div>

                      {/* Ações */}
                      <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                        {sit !== 'pago' ? (
                          <button onClick={()=>handlePagar(venda)} disabled={isPagando}
                            style={{flex:1,minWidth:'140px',padding:'10px 14px',borderRadius:'10px',border:'none',background:isPagando?'#ccc':'linear-gradient(135deg,#1a6b5a,#10b981)',color:'white',fontWeight:'700',fontSize:'13px',cursor:isPagando?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
                            {isPagando
                              ? <><RefreshCw size={13} style={{animation:'spin 1s linear infinite'}}/> Salvando...</>
                              : <><CheckCircle2 size={14}/> Marcar como Pago</>
                            }
                          </button>
                        ) : (
                          <div style={{flex:1,minWidth:'140px',padding:'10px 14px',borderRadius:'10px',background:'#e8f5e9',color:'#2e7d32',fontWeight:'700',fontSize:'13px',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
                            <CheckCircle2 size={14}/> Pago
                          </div>
                        )}
                        {venda.comprovante_url && (
                          <button onClick={()=>verComprovante(venda)}
                            style={{padding:'10px 14px',borderRadius:'10px',border:'1.5px solid #1a6b5a',background:'#fff',color:'#1a6b5a',fontWeight:'700',fontSize:'13px',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}>
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
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={()=>setComprovanteUrl(null)}
            style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
            <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}}
              onClick={e=>e.stopPropagation()}
              style={{background:'#fff',borderRadius:'16px',padding:'16px',maxWidth:'90vw',maxHeight:'85vh',overflow:'auto'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                <span style={{fontWeight:'bold',color:'#333'}}>Comprovante</span>
                <button onClick={()=>setComprovanteUrl(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#aaa'}}>✕</button>
              </div>
              <img src={comprovanteUrl} alt="Comprovante" style={{maxWidth:'100%',borderRadius:'8px'}}/>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
