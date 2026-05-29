import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import {
  Line, BarChart, Bar, PieChart, Pie, Cell,
  Area, XAxis, YAxis, CartesianGrid,
  Legend, ResponsiveContainer, LabelList, ComposedChart
} from 'recharts'
import PageHeader from '../components/PageHeader'
import { motion } from 'framer-motion'
import {
  BarChart3, TrendingUp, TrendingDown, ShoppingBag, Users,
  RotateCcw, Package, DollarSign, CheckCircle, Target,
  AlertTriangle, Award, RefreshCw, Filter, X, Calendar,
  Tag, ChevronRight, Star, Minus, ArrowUpRight, ArrowDownRight,
  Gift, ShoppingCart, Layers, Truck, Eye, Clock
} from 'lucide-react'

// ── Paleta ──────────────────────────────────────────────────────────────────
const CORES = ['#1a6b5a','#f5821f','#29abe2','#e91e8c','#8b5cf6','#f7c948','#10b981','#ef4444','#06b6d4','#84cc16']

// ── Datas Comemorativas ──────────────────────────────────────────────────────
const TODAS_DATAS_COMEMORATIVAS = [
  { mes:1,  dia:1,  nome:'Ano Novo',               icone:'🎆', categorias:['Decoração','Perfumaria'] },
  { mes:2,  dia:12, nome:'Dia dos Namorados (Prévia)', icone:'💝', categorias:['Perfumaria','Decoração'] },
  { mes:3,  dia:1,  nome:'Volta às Aulas',          icone:'📚', categorias:['Escolar','Utilidade'] },
  { mes:4,  dia:20, nome:'Páscoa',                  icone:'🐣', categorias:['Decoração','Infantil'] },
  { mes:5,  dia:11, nome:'Dia das Mães',            icone:'💐', categorias:['Perfumaria','Cama / Mesa / Banho','Decoração'] },
  { mes:6,  dia:12, nome:'Dia dos Namorados',       icone:'❤️', categorias:['Perfumaria','Decoração'] },
  { mes:7,  dia:1,  nome:'Férias Escolares',        icone:'🏖️', categorias:['Infantil','Escolar'] },
  { mes:8,  dia:10, nome:'Dia dos Pais',            icone:'👔', categorias:['Utilidade','Cozinha'] },
  { mes:10, dia:12, nome:'Dia das Crianças',        icone:'🧸', categorias:['Infantil','Escolar'] },
  { mes:11, dia:25, nome:'Black Friday',            icone:'🛍️', categorias:['Cama / Mesa / Banho','Cozinha','Decoração'] },
  { mes:12, dia:25, nome:'Natal',                   icone:'🎄', categorias:['Decoração','Perfumaria','Infantil','Cozinha'] },
]

function proximaDataComemorativa() {
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  for (let anoOffset = 0; anoOffset <= 1; anoOffset++) {
    const ano = hoje.getFullYear() + anoOffset
    const ordenadas = [...TODAS_DATAS_COMEMORATIVAS].sort((a,b) => a.mes!==b.mes ? a.mes-b.mes : a.dia-b.dia)
    for (const d of ordenadas) {
      const dataEvento = new Date(ano, d.mes-1, d.dia)
      if (dataEvento > hoje) {
        const diffMs = dataEvento - hoje
        const diasRestantes = Math.ceil(diffMs/(1000*60*60*24))
        return { ...d, diasRestantes, dataEvento }
      }
    }
  }
  return { ...TODAS_DATAS_COMEMORATIVAS[0], diasRestantes:365, dataEvento:null }
}

// Próximas 3 datas comemorativas
function proximasDatas(n=3) {
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  const resultados = []
  for (let anoOffset = 0; anoOffset <= 1 && resultados.length < n; anoOffset++) {
    const ano = hoje.getFullYear() + anoOffset
    const ordenadas = [...TODAS_DATAS_COMEMORATIVAS].sort((a,b) => a.mes!==b.mes ? a.mes-b.mes : a.dia-b.dia)
    for (const d of ordenadas) {
      if (resultados.length >= n) break
      const dataEvento = new Date(ano, d.mes-1, d.dia)
      if (dataEvento > hoje) {
        const diasRestantes = Math.ceil((dataEvento - hoje)/(1000*60*60*24))
        resultados.push({ ...d, diasRestantes, dataEvento })
      }
    }
  }
  return resultados
}

const MESES_NOMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MESES_IDX   = { Jan:0,Fev:1,Mar:2,Abr:3,Mai:4,Jun:5,Jul:6,Ago:7,Set:8,Out:9,Nov:10,Dez:11 }

function ordenarMeses(arr) {
  return arr.sort((a,b) => {
    const [mA,aA] = a.mes.split('/')
    const [mB,aB] = b.mes.split('/')
    return (parseInt(aA)*12 + MESES_IDX[mA]) - (parseInt(aB)*12 + MESES_IDX[mB])
  })
}

// ── Tooltip sem popup (vazio) ────────────────────────────────────────────────
const TooltipVazio = () => null

// ── Sub-componentes ──────────────────────────────────────────────────────────
const LabelPizza = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value, name }) => {
  if (percent < 0.04) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
      {`${(percent*100).toFixed(0)}%`}
    </text>
  )
}

// ── Barra de progresso horizontal ───────────────────────────────────────────
function BarraHorizontal({ nome, valor, max, cor, sub, subDir }) {
  const pct = max > 0 ? Math.min(100, (valor/max)*100) : 2
  return (
    <div style={{ marginBottom:'14px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px', marginBottom:'5px' }}>
        <span style={{ fontSize:'13px', fontWeight:'600', color:'#2d3748', lineHeight:'1.3', wordBreak:'break-word', flex:1 }}>{nome}</span>
        <span style={{ fontSize:'13px', fontWeight:'bold', color:cor, whiteSpace:'nowrap', flexShrink:0 }}>{subDir}</span>
      </div>
      <div style={{ background:'#f0f4f8', borderRadius:'999px', height:'8px', overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, background:`linear-gradient(90deg, ${cor}, ${cor}cc)`, height:'100%', borderRadius:'999px', transition:'width 0.6s ease' }}/>
      </div>
      {sub && <div style={{ fontSize:'11px', color:'#a0aec0', marginTop:'3px' }}>{sub}</div>}
    </div>
  )
}

// ── Card KPI ──────────────────────────────────────────────────────────────────
function KpiCard({ label, valor, cor, icon: Icon, selecionado, onClick }) {
  return (
    <motion.div
      whileHover={{ y:-3, boxShadow:'0 10px 30px rgba(0,0,0,0.10)' }}
      whileTap={{ scale:0.97 }}
      transition={{ duration:0.15 }}
      onClick={onClick}
      style={{
        background:'#fff', borderRadius:'16px', padding:'18px 16px',
        cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
        border: selecionado ? `2px solid ${cor}` : '2px solid transparent',
        borderLeft:`4px solid ${cor}`, display:'flex', alignItems:'center', gap:'12px'
      }}
    >
      <div style={{ width:'42px', height:'42px', borderRadius:'12px', background:`${cor}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon size={20} color={cor} strokeWidth={2}/>
      </div>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:'11px', color:'#a0aec0', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'3px' }}>{label}</div>
        <div style={{ fontSize:'17px', fontWeight:'bold', color:cor, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{valor}</div>
      </div>
    </motion.div>
  )
}

// ── Card container ────────────────────────────────────────────────────────────
function Card({ titulo, icon: Icon, cor='#1a6b5a', children, style={} }) {
  return (
    <div style={{ background:'#fff', borderRadius:'18px', padding:'22px', boxShadow:'0 2px 12px rgba(15,23,42,0.06)', border:'1px solid #eef2f7', marginBottom:'16px', ...style }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'18px', paddingBottom:'14px', borderBottom:'1px solid #f7f7f7' }}>
        <div style={{ width:'32px', height:'32px', borderRadius:'9px', background:`${cor}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon size={16} color={cor} strokeWidth={2.2}/>
        </div>
        <span style={{ fontSize:'14px', fontWeight:'700', color:'#1a202c' }}>{titulo}</span>
      </div>
      {children}
    </div>
  )
}

// ── Legenda customizada para pizza ────────────────────────────────────────────
function LegendaPizza({ dados, totalValor, totalQtd }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
      {dados.map((d, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 10px', borderRadius:'10px', background:'#f9fafb' }}>
          <div style={{ width:'10px', height:'10px', borderRadius:'3px', background:CORES[i%CORES.length], flexShrink:0 }}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:'12px', fontWeight:'600', color:'#2d3748', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{d.categoria}</div>
            <div style={{ fontSize:'11px', color:'#a0aec0' }}>{d.quantidade} unidades</div>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ fontSize:'12px', fontWeight:'bold', color:CORES[i%CORES.length] }}>R$ {d.valor.toFixed(0)}</div>
            <div style={{ fontSize:'10px', color:'#a0aec0' }}>{totalValor>0?((d.valor/totalValor)*100).toFixed(1):0}%</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
function BI() {
  const [vendas,        setVendas]        = useState([])
  const [itensVenda,    setItensVenda]    = useState([])
  const [devolucoes,    setDevolucoes]    = useState([])
  const [investimentos, setInvestimentos] = useState([])
  const [clientes,      setClientes]      = useState([])
  const [prods,         setProds]         = useState([])
  const [carregando,    setCarregando]    = useState(true)
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroMes,       setFiltroMes]       = useState('')
  const [filtroAno,       setFiltroAno]       = useState('')
  const [kpiSelecionado,  setKpiSelecionado]  = useState(null)
  const [mostrarFiltros,  setMostrarFiltros]  = useState(false)

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    setCarregando(true)
    const [v, iv, d, inv, c, p] = await Promise.all([
      supabase.from('vendas').select('*, clientes(nome)').order('data_venda'),
      supabase.from('itens_venda').select('*, produtos(nome, categoria, preco_venda)'),
      supabase.from('devolucoes').select('*, produtos(nome, categoria)'),
      supabase.from('investimentos').select('*, produtos(nome, categoria)'),
      supabase.from('clientes').select('*, vendas(valor_total, situacao, recebido, data_para_pagar)'),
      supabase.from('produtos').select('*'),
    ])
    if (v.data)   setVendas(v.data)
    if (iv.data)  setItensVenda(iv.data)
    if (d.data)   setDevolucoes(d.data)
    if (inv.data) setInvestimentos(inv.data)
    if (c.data)   setClientes(c.data)
    if (p.data)   setProds(p.data)
    setCarregando(false)
  }

  const vendasMap = useMemo(
    () => Object.fromEntries(vendas.map(v => [v.id, v])),
    [vendas]
  )

  // ── Dados filtrados ──────────────────────────────────────────────────────
  const vendasFiltradas = useMemo(() => vendas.filter(v => {
    const d = new Date(v.data_para_pagar + 'T12:00:00')
    if (filtroMes && d.getMonth()+1 !== parseInt(filtroMes)) return false
    if (filtroAno && d.getFullYear()  !== parseInt(filtroAno))  return false
    return true
  }), [vendas, filtroMes, filtroAno])

  const itensFiltrados = useMemo(() => itensVenda.filter(i => {
    if (filtroCategoria && i.produtos?.categoria !== filtroCategoria) return false
    if (filtroMes || filtroAno) {
      const venda = vendasMap[i.venda_id]
      if (!venda) return false
      const d = new Date(venda.data_para_pagar + 'T12:00:00')
      if (filtroMes && d.getMonth()+1 !== parseInt(filtroMes)) return false
      if (filtroAno && d.getFullYear()  !== parseInt(filtroAno)) return false
    }
    return true
  }), [itensVenda, vendasMap, filtroCategoria, filtroMes, filtroAno])

  const devolucoesFiltradas = useMemo(() => devolucoes.filter(dev => {
    const d = new Date(dev.criado_em)
    if (filtroMes && d.getMonth()+1 !== parseInt(filtroMes)) return false
    if (filtroAno && d.getFullYear()  !== parseInt(filtroAno)) return false
    return true
  }), [devolucoes, filtroMes, filtroAno])

  const anosDisponiveis = useMemo(
    () => [...new Set(vendas.map(v => new Date(v.data_para_pagar+'T12:00:00').getFullYear()))].sort(),
    [vendas]
  )
  const categorias = useMemo(
    () => [...new Set(itensVenda.map(i => i.produtos?.categoria).filter(Boolean))].sort(),
    [itensVenda]
  )

  // ── KPIs ────────────────────────────────────────────────────────────────
  const totalDevolvido    = useMemo(() => devolucoesFiltradas.reduce((acc,d) => acc + parseFloat(d.valor_total||0), 0), [devolucoesFiltradas])
  const qtdDevolucoes     = useMemo(() => devolucoesFiltradas.reduce((acc,d) => acc + (d.quantidade||1), 0), [devolucoesFiltradas])
  const totalVendidoBruto = useMemo(() => vendasFiltradas.reduce((acc,v) => acc + parseFloat(v.valor_total||0), 0), [vendasFiltradas])
  const totalVendido      = Math.max(0, totalVendidoBruto - totalDevolvido)
  const totalRecebido     = useMemo(() => vendasFiltradas.reduce((acc,v) => acc + parseFloat(v.recebido||0), 0), [vendasFiltradas])
  const totalRetirado     = useMemo(() => vendasFiltradas.reduce((acc,v) => acc + parseFloat(v.valor_retirado||0), 0), [vendasFiltradas])
  const ticketMedio       = vendasFiltradas.length > 0 ? totalVendidoBruto / vendasFiltradas.length : 0

  const atrasados = useMemo(() => vendasFiltradas.filter(v => {
    if (parseFloat(v.recebido||0) >= parseFloat(v.valor_total||0)) return false
    const hoje = new Date(); hoje.setHours(0,0,0,0)
    return new Date(v.data_para_pagar+'T12:00:00') < hoje
  }).length, [vendasFiltradas])

  const taxaInad = vendasFiltradas.length > 0 ? ((atrasados/vendasFiltradas.length)*100).toFixed(1) : 0

  // ── Dados dos gráficos ───────────────────────────────────────────────────
  const dadosLinha = useMemo(() => {
    const meses = {}
    vendas.forEach(v => {
      const d = new Date(v.data_para_pagar+'T12:00:00')
      if (filtroAno && d.getFullYear() !== parseInt(filtroAno)) return
      const chave = `${MESES_NOMES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
      if (!meses[chave]) meses[chave] = { mes:chave, vendido:0, recebido:0, meta:3000 }
      meses[chave].vendido  += parseFloat(v.valor_total||0)
      meses[chave].recebido += parseFloat(v.recebido||0)
    })
    devolucoes.forEach(dev => {
      const d = new Date(dev.criado_em)
      if (filtroAno && d.getFullYear() !== parseInt(filtroAno)) return
      const chave = `${MESES_NOMES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
      if (meses[chave]) meses[chave].vendido = Math.max(0, meses[chave].vendido - parseFloat(dev.valor_total||0))
    })
    return ordenarMeses(Object.values(meses))
  }, [vendas, devolucoes, filtroAno])

  const dadosMaisVendidos = useMemo(() => {
    const contagem = {}
    itensFiltrados.forEach(i => {
      const nome = i.produtos?.nome || 'Desconhecido'
      const key  = nome.length > 22 ? nome.substring(0,22)+'…' : nome
      if (!contagem[key]) contagem[key] = { nome:key, quantidade:0, valor:0 }
      contagem[key].quantidade += i.quantidade
      contagem[key].valor      += i.quantidade * parseFloat(i.valor_unitario||0)
    })
    devolucoesFiltradas.forEach(dev => {
      const nome = dev.produtos?.nome || 'Desconhecido'
      const key  = nome.length > 22 ? nome.substring(0,22)+'…' : nome
      if (contagem[key]) contagem[key].quantidade = Math.max(0, contagem[key].quantidade - dev.quantidade)
    })
    return Object.values(contagem).sort((a,b) => b.quantidade - a.quantidade).slice(0,10)
  }, [itensFiltrados, devolucoesFiltradas])

  const dadosMenosVendidos = useMemo(() => {
    const contagem = {}
    itensFiltrados.forEach(i => {
      const nome = i.produtos?.nome || 'Desconhecido'
      const key  = nome.length > 22 ? nome.substring(0,22)+'…' : nome
      if (!contagem[key]) contagem[key] = { nome:key, quantidade:0, valor:0 }
      contagem[key].quantidade += i.quantidade
      contagem[key].valor      += i.quantidade * parseFloat(i.valor_unitario||0)
    })
    return Object.values(contagem).sort((a,b) => a.quantidade - b.quantidade).slice(0,10)
  }, [itensFiltrados])

  const dadosMaisDevolvidos = useMemo(() => {
    const contagem = {}
    devolucoesFiltradas.forEach(dev => {
      const nome = dev.produtos?.nome || 'Desconhecido'
      const key  = nome.length > 22 ? nome.substring(0,22)+'…' : nome
      if (!contagem[key]) contagem[key] = { nome:key, quantidade:0, valor:0 }
      contagem[key].quantidade += dev.quantidade
      contagem[key].valor      += parseFloat(dev.valor_total||0)
    })
    return Object.values(contagem).sort((a,b) => b.quantidade - a.quantidade).slice(0,10)
  }, [devolucoesFiltradas])

  const dadosFornecedor = useMemo(() => {
    const forns = {}
    investimentos.forEach(inv => {
      const forn = inv.fornecedor || 'Desconhecido'
      if (!forns[forn]) forns[forn] = { fornecedor:forn, investido:0, qtdCompras:0 }
      forns[forn].investido  += parseFloat(inv.valor_total_pago||0)
      forns[forn].qtdCompras += 1
    })
    return Object.values(forns).sort((a,b) => b.investido - a.investido)
  }, [investimentos])

  const dadosCategoria = useMemo(() => {
    const cats = {}
    itensFiltrados.forEach(i => {
      const cat = i.produtos?.categoria || 'Outros'
      if (!cats[cat]) cats[cat] = { categoria:cat, valor:0, quantidade:0 }
      cats[cat].valor     += i.quantidade * parseFloat(i.valor_unitario||0)
      cats[cat].quantidade += i.quantidade
    })
    devolucoesFiltradas.forEach(dev => {
      const cat = dev.produtos?.categoria || 'Outros'
      if (cats[cat]) {
        cats[cat].valor      = Math.max(0, cats[cat].valor - parseFloat(dev.valor_total||0))
        cats[cat].quantidade = Math.max(0, cats[cat].quantidade - dev.quantidade)
      }
    })
    return Object.values(cats).sort((a,b) => b.valor - a.valor)
  }, [itensFiltrados, devolucoesFiltradas])

  const dadosVendasDev = useMemo(() => {
    const meses = {}
    itensVenda.forEach(i => {
      const venda = vendasMap[i.venda_id]
      if (!venda) return
      const d = new Date(venda.data_para_pagar+'T12:00:00')
      if (filtroMes && d.getMonth()+1 !== parseInt(filtroMes)) return
      if (filtroAno && d.getFullYear()  !== parseInt(filtroAno)) return
      if (filtroCategoria && i.produtos?.categoria !== filtroCategoria) return
      const chave = `${MESES_NOMES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
      if (!meses[chave]) meses[chave] = { mes:chave, qtdVendida:0, valorVendido:0, qtdDevolvida:0, valorDevolvido:0 }
      meses[chave].qtdVendida   += i.quantidade
      meses[chave].valorVendido += i.quantidade * parseFloat(i.valor_unitario||0)
    })
    devolucoesFiltradas.forEach(dev => {
      const d = new Date(dev.criado_em)
      const chave = `${MESES_NOMES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
      if (!meses[chave]) meses[chave] = { mes:chave, qtdVendida:0, valorVendido:0, qtdDevolvida:0, valorDevolvido:0 }
      meses[chave].qtdDevolvida  += dev.quantidade
      meses[chave].valorDevolvido += parseFloat(dev.valor_total||0)
    })
    return ordenarMeses(Object.values(meses))
  }, [itensVenda, vendasMap, devolucoesFiltradas, filtroMes, filtroAno, filtroCategoria])

  const dadosVendedor = useMemo(() => {
    const vendedores = {}
    vendasFiltradas.forEach(v => {
      const nome = v.vendedor_nome || 'Sem vendedor'
      if (!vendedores[nome]) vendedores[nome] = { vendedor:nome, quantidade:0, valor:0 }
      vendedores[nome].quantidade += 1
      vendedores[nome].valor      += parseFloat(v.valor_total||0)
    })
    return Object.values(vendedores).sort((a,b) => b.valor - a.valor)
  }, [vendasFiltradas])

  // ── Ranking clientes ────────────────────────────────────────────────────
  const dadosClientesRanking = useMemo(() => {
    const ranking = {}
    vendasFiltradas.forEach(v => {
      const nome = v.clientes?.nome || 'Cliente Desconhecido'
      if (!ranking[nome]) ranking[nome] = { nome, totalComprado:0, qtdPedidos:0, totalRecebido:0 }
      ranking[nome].totalComprado += parseFloat(v.valor_total||0)
      ranking[nome].qtdPedidos    += 1
      ranking[nome].totalRecebido += parseFloat(v.recebido||0)
    })
    return Object.values(ranking).sort((a,b) => b.totalComprado - a.totalComprado).slice(0,10)
  }, [vendasFiltradas])

  // ── Previsão ─────────────────────────────────────────────────────────────
  const previsaoVendas = useMemo(() => {
    if (dadosLinha.length < 2) return null
    const n = dadosLinha.length
    const xs = dadosLinha.map((_,i) => i)
    const ys = dadosLinha.map(d => d.vendido)
    const sumX  = xs.reduce((a,b) => a+b, 0)
    const sumY  = ys.reduce((a,b) => a+b, 0)
    const sumXY = xs.reduce((acc,x,i) => acc + x*ys[i], 0)
    const sumX2 = xs.reduce((acc,x)   => acc + x*x,     0)
    const slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX)
    const intercept = (sumY - slope*sumX) / n
    const previsao = Math.max(0, slope*n + intercept)
    const tendencia = slope > 50 ? 'Alta' : slope < -50 ? 'Queda' : 'Estável'
    return { valor:previsao.toFixed(2), tendencia, slope }
  }, [dadosLinha])

  const produtosAcabando = useMemo(
    () => prods.filter(p => p.estoque <= 3 && p.estoque >= 0).sort((a,b) => a.estoque-b.estoque).slice(0,5),
    [prods]
  )

  const proximasDatasFestejas = useMemo(() => proximasDatas(4), [])

  // ── Produtos previstos para próxima data ───────────────────────────────
  const proxData = useMemo(() => proximaDataComemorativa(), [])
  const prodsPrevistas = useMemo(() => {
    const contagem = {}
    itensVenda.filter(i => proxData.categorias.includes(i.produtos?.categoria)).forEach(i => {
      const nome = i.produtos?.nome || 'Desconhecido'
      if (!contagem[nome]) contagem[nome] = { nome, quantidade:0, categoria:i.produtos?.categoria }
      contagem[nome].quantidade += i.quantidade
    })
    return Object.values(contagem).sort((a,b) => b.quantidade - a.quantidade).slice(0,5)
  }, [itensVenda, proxData])

  const totalInvestido = dadosFornecedor.reduce((acc,f) => acc+f.investido, 0)
  const totalCategValor = dadosCategoria.reduce((acc,c) => acc+c.valor, 0)
  const temFiltroAtivo  = filtroAno !== '' || filtroMes !== '' || filtroCategoria !== ''

  function limparFiltros() { setFiltroAno(''); setFiltroMes(''); setFiltroCategoria('') }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (carregando) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'300px', flexDirection:'column', gap:'16px' }}>
        <div style={{ width:'44px', height:'44px', border:'3px solid #eef2f7', borderTop:'3px solid #1a6b5a', borderRadius:'50%', animation:'spin 0.9s linear infinite' }}/>
        <p style={{ color:'#a0aec0', fontSize:'14px' }}>Carregando dados...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ── Rótulos inline nos gráficos (sem tooltip) ────────────────────────────
  const fmtR = v => v > 0 ? `R$${parseFloat(v).toFixed(0)}` : ''
  const fmtN = v => v > 0 ? v : ''

  return (
    <div style={{ background:'#f4f6f9', minHeight:'100vh', padding:'0 0 40px 0' }}>
      <PageHeader
        title="Dashboard BI"
        subtitle="Análise de vendas, investimentos, devoluções e desempenho"
        icon={<BarChart3 size={22} color="white"/>}
      />

      {/* ── Filtros ── */}
      <div style={{ background:'#fff', borderRadius:'16px', padding:'16px 20px', boxShadow:'0 2px 10px rgba(15,23,42,0.06)', border:'1px solid #eef2f7', margin:'16px 0' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: mostrarFiltros ? '16px' : 0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <Filter size={16} color="#1a6b5a"/>
            <span style={{ fontSize:'13px', fontWeight:'600', color:'#2d3748' }}>Filtros</span>
            {temFiltroAtivo && (
              <span style={{ background:'#1a6b5a', color:'white', fontSize:'10px', fontWeight:'bold', padding:'2px 8px', borderRadius:'20px' }}>
                Ativo
              </span>
            )}
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            {temFiltroAtivo && (
              <button onClick={limparFiltros} style={{ display:'flex', alignItems:'center', gap:'4px', padding:'6px 12px', borderRadius:'8px', border:'1px solid #fed7d7', background:'#fff5f5', color:'#e53e3e', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>
                <X size={12}/> Limpar
              </button>
            )}
            <button onClick={carregarDados} style={{ display:'flex', alignItems:'center', gap:'4px', padding:'6px 12px', borderRadius:'8px', border:'none', background:'#1a6b5a', color:'white', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>
              <RefreshCw size={12}/> Atualizar
            </button>
            <button onClick={() => setMostrarFiltros(!mostrarFiltros)} style={{ display:'flex', alignItems:'center', gap:'4px', padding:'6px 12px', borderRadius:'8px', border:'1px solid #e2e8f0', background:'#f7fafc', color:'#4a5568', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>
              {mostrarFiltros ? 'Fechar' : 'Filtrar'}
            </button>
          </div>
        </div>

        {mostrarFiltros && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:'12px' }}>
            {[
              { label:'Ano',       value:filtroAno,       set:setFiltroAno,       placeholder:'Todos os anos',    options:anosDisponiveis.map(a=>({v:String(a),l:String(a)})) },
              { label:'Mês',       value:filtroMes,       set:setFiltroMes,       placeholder:'Todos os meses',   options:MESES_NOMES.map((m,i)=>({v:String(i+1),l:m})) },
              { label:'Categoria', value:filtroCategoria, set:setFiltroCategoria, placeholder:'Todas categorias', options:categorias.map(c=>({v:c,l:c})) },
            ].map((f,i) => (
              <div key={i}>
                <label style={{ display:'block', fontSize:'11px', fontWeight:'600', color:'#718096', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'0.5px' }}>{f.label}</label>
                <select value={f.value} onChange={e => f.set(e.target.value)}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:'9px', border:`1.5px solid ${f.value?'#1a6b5a':'#e2e8f0'}`, fontSize:'13px', color:'#2d3748', background:'#fff', cursor:'pointer', outline:'none' }}>
                  <option value="">{f.placeholder}</option>
                  {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── KPIs ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(155px, 1fr))', gap:'12px', marginBottom:'16px' }}>
        <KpiCard label="Total Vendido"   valor={`R$ ${totalVendido.toFixed(2)}`}      cor="#1a6b5a" icon={DollarSign}    selecionado={kpiSelecionado==='Total Vendido'}   onClick={()=>setKpiSelecionado(kpiSelecionado==='Total Vendido'?null:'Total Vendido')}/>
        <KpiCard label="Total Recebido"  valor={`R$ ${totalRecebido.toFixed(2)}`}     cor="#29abe2" icon={CheckCircle}   selecionado={kpiSelecionado==='Total Recebido'}  onClick={()=>setKpiSelecionado(kpiSelecionado==='Total Recebido'?null:'Total Recebido')}/>
        <KpiCard label="Valor Retirado"  valor={`R$ ${totalRetirado.toFixed(2)}`}     cor="#8b5cf6" icon={ArrowUpRight}  selecionado={kpiSelecionado==='Valor Retirado'}  onClick={()=>setKpiSelecionado(kpiSelecionado==='Valor Retirado'?null:'Valor Retirado')}/>
        <KpiCard label="Ticket Médio"    valor={`R$ ${ticketMedio.toFixed(2)}`}       cor="#f5821f" icon={Target}        selecionado={kpiSelecionado==='Ticket Médio'}    onClick={()=>setKpiSelecionado(kpiSelecionado==='Ticket Médio'?null:'Ticket Médio')}/>
        <KpiCard label="Inadimplência"   valor={`${taxaInad}%`}                       cor={parseFloat(taxaInad)>20?'#ef4444':'#10b981'} icon={AlertTriangle} selecionado={kpiSelecionado==='Inadimplência'} onClick={()=>setKpiSelecionado(kpiSelecionado==='Inadimplência'?null:'Inadimplência')}/>
        <KpiCard label="Total Vendas"    valor={vendasFiltradas.length}               cor="#e91e8c" icon={ShoppingCart}  selecionado={kpiSelecionado==='Total Vendas'}    onClick={()=>setKpiSelecionado(kpiSelecionado==='Total Vendas'?null:'Total Vendas')}/>
        <KpiCard label="Clientes Ativos" valor={clientes.length}                      cor="#06b6d4" icon={Users}         selecionado={kpiSelecionado==='Clientes Ativos'} onClick={()=>setKpiSelecionado(kpiSelecionado==='Clientes Ativos'?null:'Clientes Ativos')}/>
        <KpiCard label="Valor Devolvido" valor={`R$ ${totalDevolvido.toFixed(2)}`}    cor="#ef4444" icon={RotateCcw}     selecionado={kpiSelecionado==='Valor Devolvido'} onClick={()=>setKpiSelecionado(kpiSelecionado==='Valor Devolvido'?null:'Valor Devolvido')}/>
        <KpiCard label="Qtd Devoluções"  valor={qtdDevolucoes}                        cor="#f97316" icon={ArrowDownRight} selecionado={kpiSelecionado==='Qtd Devoluções'} onClick={()=>setKpiSelecionado(kpiSelecionado==='Qtd Devoluções'?null:'Qtd Devoluções')}/>
      </div>

      {/* ── 1. Total Vendido por Mês ── */}
      <Card titulo="Total Vendido por Mês" icon={TrendingUp} cor="#1a6b5a">
        <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
          <div style={{ minWidth: Math.max(360, dadosLinha.length*90) }}>
            <ComposedChart width={Math.max(360, dadosLinha.length*90)} height={280} data={dadosLinha} margin={{top:28,right:16,left:8,bottom:10}}>
              <defs>
                <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1a6b5a" stopOpacity={0.22}/>
                  <stop offset="95%" stopColor="#1a6b5a" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#e91e8c" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#e91e8c" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false}/>
              <XAxis dataKey="mes" tick={{fontSize:11,fill:'#a0aec0'}} axisLine={false} tickLine={false} interval={0} padding={{left:20,right:20}}/>
              <YAxis hide/>
              <Legend iconType="circle" iconSize={9} wrapperStyle={{fontSize:'12px'}}/>
              <Area type="monotone" dataKey="vendido" name="Valor Vendido" stroke="#1a6b5a" strokeWidth={2.5} fill="url(#gV)" dot={{r:4,fill:'#1a6b5a',strokeWidth:2,stroke:'white'}} activeDot={{r:6}}>
                <LabelList dataKey="vendido" position="top" formatter={fmtR} style={{fontSize:'10px',fill:'#1a6b5a',fontWeight:'bold'}}/>
              </Area>
              <Area type="monotone" dataKey="recebido" name="Valor Recebido" stroke="#e91e8c" strokeWidth={2} fill="url(#gR)" dot={{r:4,fill:'#e91e8c',strokeWidth:2,stroke:'white'}} activeDot={{r:6}}>
                <LabelList dataKey="recebido" position="bottom" formatter={fmtR} style={{fontSize:'10px',fill:'#e91e8c',fontWeight:'bold'}}/>
              </Area>
              <Line type="monotone" dataKey="meta" name="Meta R$3.000" stroke="#f5821f" strokeWidth={1.5} strokeDasharray="7 4" dot={false}/>
            </ComposedChart>
          </div>
        </div>
        {dadosLinha.length > 5 && <p style={{fontSize:'11px',color:'#cbd5e0',textAlign:'center',marginTop:'6px'}}>← deslize para ver mais →</p>}
      </Card>

      {/* ── 2. Vendas vs Devoluções por Mês ── */}
      <Card titulo="Vendas vs Devoluções por Mês" icon={RotateCcw} cor="#ef4444">
        <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
          <div style={{ minWidth: Math.max(360, dadosVendasDev.length*120) }}>
            <ComposedChart
              width={Math.max(360, dadosVendasDev.length*120)}
              height={320}
              data={dadosVendasDev}
              margin={{top:28,right:20,left:8,bottom:10}}
              barCategoryGap="22%"
              barGap={2}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false}/>
              <XAxis dataKey="mes" tick={{fontSize:11,fill:'#a0aec0'}} axisLine={false} tickLine={false} interval={0} padding={{left:20,right:20}}/>
              <YAxis yAxisId="valor" hide domain={[0, dataMax => dataMax*1.4]}/>
              <YAxis yAxisId="qtd"   hide domain={[0, dataMax => dataMax*2.4]} orientation="right"/>
              <Legend iconType="circle" iconSize={9} wrapperStyle={{fontSize:'12px'}}/>
              <Bar yAxisId="valor" dataKey="valorVendido"   name="Valor Vendido"   fill="#1a6b5a" radius={[5,5,0,0]} maxBarSize={26}>
                <LabelList dataKey="valorVendido"   position="top" formatter={fmtR} style={{fontSize:'10px',fill:'#1a6b5a',fontWeight:'bold'}}/>
              </Bar>
              <Bar yAxisId="valor" dataKey="valorDevolvido" name="Valor Devolvido" fill="#ef4444" radius={[5,5,0,0]} maxBarSize={26}>
                <LabelList dataKey="valorDevolvido" position="top" formatter={fmtR} style={{fontSize:'10px',fill:'#ef4444',fontWeight:'bold'}}/>
              </Bar>
              <Bar yAxisId="qtd"   dataKey="qtdVendida"     name="Qtd Vendida"     fill="#29abe2" radius={[5,5,0,0]} maxBarSize={26}>
                <LabelList dataKey="qtdVendida"     position="top" formatter={fmtN} style={{fontSize:'10px',fill:'#29abe2',fontWeight:'bold'}}/>
              </Bar>
              <Bar yAxisId="qtd"   dataKey="qtdDevolvida"   name="Qtd Devolvida"   fill="#f5821f" radius={[5,5,0,0]} maxBarSize={26}>
                <LabelList dataKey="qtdDevolvida"   position="top" formatter={fmtN} style={{fontSize:'10px',fill:'#f5821f',fontWeight:'bold'}}/>
              </Bar>
            </ComposedChart>
          </div>
        </div>
        {dadosVendasDev.length > 5 && <p style={{fontSize:'11px',color:'#cbd5e0',textAlign:'center',marginTop:'6px'}}>← deslize para ver mais →</p>}
      </Card>

      {/* ── 3. Desempenho por Vendedor ── */}
      <Card titulo="Desempenho por Vendedor" icon={Award} cor="#8b5cf6">
        {dadosVendedor.length === 0 ? (
          <p style={{color:'#a0aec0',textAlign:'center',padding:'28px',fontSize:'13px'}}>Nenhuma venda encontrada para o período selecionado.</p>
        ) : (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'20px', marginBottom:'20px' }}>
              <div>
                <p style={{textAlign:'center',fontSize:'11px',color:'#a0aec0',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'10px'}}>Por Valor (R$)</p>
                <ResponsiveContainer width="100%" height={Math.max(160, dadosVendedor.length*50)}>
                  <BarChart data={dadosVendedor} layout="vertical" margin={{top:0,right:75,left:0,bottom:0}} barSize={18}>
                    <XAxis type="number" hide/>
                    <YAxis dataKey="vendedor" type="category" tick={{fontSize:12,fill:'#4a5568'}} width={110} axisLine={false} tickLine={false}/>
                    <Bar dataKey="valor" name="Valor Vendido" radius={[0,6,6,0]}>
                      {dadosVendedor.map((_,i) => <Cell key={i} fill={CORES[i%CORES.length]}/>)}
                      <LabelList dataKey="valor" position="right" formatter={v=>`R$${parseFloat(v).toFixed(0)}`} style={{fontSize:'11px',fontWeight:'bold',fill:'#2d3748'}}/>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p style={{textAlign:'center',fontSize:'11px',color:'#a0aec0',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'10px'}}>Por Qtd de Vendas</p>
                <ResponsiveContainer width="100%" height={Math.max(160, dadosVendedor.length*50)}>
                  <BarChart data={dadosVendedor} layout="vertical" margin={{top:0,right:50,left:0,bottom:0}} barSize={18}>
                    <XAxis type="number" hide/>
                    <YAxis dataKey="vendedor" type="category" tick={{fontSize:12,fill:'#4a5568'}} width={110} axisLine={false} tickLine={false}/>
                    <Bar dataKey="quantidade" name="Qtd Vendas" radius={[0,6,6,0]}>
                      {dadosVendedor.map((_,i) => <Cell key={i} fill={CORES[i%CORES.length]}/>)}
                      <LabelList dataKey="quantidade" position="right" style={{fontSize:'11px',fontWeight:'bold',fill:'#2d3748'}}/>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px',minWidth:'380px'}}>
                <thead>
                  <tr style={{background:'#f7fafc'}}>
                    {['Vendedor','Qtd Vendas','Valor Total','Ticket Médio'].map((h,i) => (
                      <th key={i} style={{padding:'10px 12px',textAlign:i===0?'left':'center',color:'#718096',fontWeight:'600',fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.5px'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dadosVendedor.map((v,i) => (
                    <tr key={i} style={{borderBottom:'1px solid #f7fafc'}}>
                      <td style={{padding:'10px 12px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <div style={{width:'8px',height:'8px',borderRadius:'50%',background:CORES[i%CORES.length],flexShrink:0}}/>
                          <strong style={{fontSize:'13px',color:'#2d3748'}}>{v.vendedor}</strong>
                        </div>
                      </td>
                      <td style={{padding:'10px 12px',textAlign:'center',color:'#4a5568'}}>{v.quantidade}</td>
                      <td style={{padding:'10px 12px',textAlign:'center',fontWeight:'bold',color:CORES[i%CORES.length]}}>R$ {v.valor.toFixed(2)}</td>
                      <td style={{padding:'10px 12px',textAlign:'center',color:'#718096'}}>R$ {(v.valor/v.quantidade).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* ── 4. Top 10 Mais Vendidos ── */}
      <Card titulo="Top 10 Produtos Mais Vendidos" icon={TrendingUp} cor="#1a6b5a">
        {dadosMaisVendidos.length === 0
          ? <p style={{color:'#a0aec0',textAlign:'center',padding:'24px',fontSize:'13px'}}>Nenhum produto encontrado.</p>
          : dadosMaisVendidos.map((p,i) => (
            <BarraHorizontal
              key={i}
              nome={`${i+1}. ${p.nome}`}
              valor={p.quantidade}
              max={dadosMaisVendidos[0]?.quantidade||1}
              cor={CORES[i%CORES.length]}
              sub={`R$ ${p.valor.toFixed(2)}`}
              subDir={`${p.quantidade} un.`}
            />
          ))
        }
      </Card>

      {/* ── 5. Top 10 Menos Vendidos ── */}
      <Card titulo="Top 10 Produtos Menos Vendidos" icon={TrendingDown} cor="#ef4444">
        {dadosMenosVendidos.length === 0
          ? <p style={{color:'#a0aec0',textAlign:'center',padding:'24px',fontSize:'13px'}}>Nenhum produto encontrado.</p>
          : dadosMenosVendidos.map((p,i) => {
            const maxRef = dadosMaisVendidos[0]?.quantidade || 1
            return (
              <BarraHorizontal
                key={i}
                nome={`${i+1}. ${p.nome}`}
                valor={p.quantidade}
                max={maxRef}
                cor="#ef4444"
                sub={`R$ ${p.valor.toFixed(2)}`}
                subDir={`${p.quantidade} un.`}
              />
            )
          })
        }
      </Card>

      {/* ── 6. Top 10 Mais Devolvidos ── */}
      <Card titulo="Top 10 Produtos Mais Devolvidos" icon={RotateCcw} cor="#f97316">
        {dadosMaisDevolvidos.length === 0 ? (
          <div style={{textAlign:'center',padding:'24px'}}>
            <CheckCircle size={32} color="#10b981" style={{marginBottom:'8px'}}/>
            <p style={{color:'#10b981',fontWeight:'bold',fontSize:'13px'}}>Nenhuma devolução registrada!</p>
          </div>
        ) : dadosMaisDevolvidos.map((p,i) => (
          <BarraHorizontal
            key={i}
            nome={`${i+1}. ${p.nome}`}
            valor={p.quantidade}
            max={dadosMaisDevolvidos[0]?.quantidade||1}
            cor="#f97316"
            sub={`R$ ${p.valor.toFixed(2)}`}
            subDir={`${p.quantidade} un.`}
          />
        ))}
      </Card>

      {/* ── 7. Vendas por Categoria — MELHORADO ── */}
      <Card titulo="Vendas por Categoria" icon={Layers} cor="#29abe2">
        {dadosCategoria.length === 0 ? (
          <p style={{color:'#a0aec0',textAlign:'center',padding:'24px',fontSize:'13px'}}>Nenhuma categoria encontrada.</p>
        ) : (
          <>
            {/* Pizza + Legenda */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'24px', alignItems:'center', marginBottom:'24px' }}>
              <div>
                <p style={{textAlign:'center',fontSize:'11px',color:'#a0aec0',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'10px'}}>Distribuição por Valor (R$)</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={dadosCategoria} dataKey="valor" nameKey="categoria" cx="50%" cy="50%" outerRadius={95} innerRadius={48} paddingAngle={3} labelLine={false} label={LabelPizza}>
                      {dadosCategoria.map((_,i) => <Cell key={i} fill={CORES[i%CORES.length]}/>)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Total centralizado */}
                <p style={{textAlign:'center',fontSize:'12px',color:'#718096',marginTop:'4px'}}>
                  Total: <strong style={{color:'#1a6b5a'}}>R$ {totalCategValor.toFixed(2)}</strong>
                </p>
              </div>
              <div>
                <p style={{textAlign:'center',fontSize:'11px',color:'#a0aec0',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'10px'}}>Legenda detalhada</p>
                <LegendaPizza dados={dadosCategoria} totalValor={totalCategValor}/>
              </div>
            </div>

            {/* Barra horizontal por quantidade — completo, com todos os labels */}
            <div style={{ borderTop:'1px solid #f7fafc', paddingTop:'18px' }}>
              <p style={{fontSize:'11px',color:'#a0aec0',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'14px'}}>Por Quantidade vendida</p>
              <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
                <div style={{ minWidth: Math.max(320, dadosCategoria.length * 80) }}>
                  <ResponsiveContainer width="100%" height={Math.max(180, dadosCategoria.length*44)}>
                    <BarChart data={dadosCategoria} layout="vertical" margin={{top:0,right:70,left:4,bottom:0}} barSize={20}>
                      <XAxis type="number" hide/>
                      <YAxis dataKey="categoria" type="category" tick={{fontSize:12,fill:'#4a5568'}} width={130} axisLine={false} tickLine={false}/>
                      <Bar dataKey="quantidade" name="Qtd" radius={[0,6,6,0]}>
                        {dadosCategoria.map((_,i) => <Cell key={i} fill={CORES[i%CORES.length]}/>)}
                        <LabelList dataKey="quantidade" position="right" style={{fontSize:'12px',fontWeight:'bold',fill:'#2d3748'}}/>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Tabela resumo */}
            <div style={{ borderTop:'1px solid #f7fafc', paddingTop:'18px', marginTop:'4px', overflowX:'auto' }}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px',minWidth:'320px'}}>
                <thead>
                  <tr style={{background:'#f7fafc'}}>
                    {['Categoria','Valor R$','Qtd','% Valor'].map((h,i)=>(
                      <th key={i} style={{padding:'8px 10px',textAlign:i===0?'left':'center',color:'#718096',fontWeight:'600',fontSize:'10px',textTransform:'uppercase',letterSpacing:'0.5px'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dadosCategoria.map((c,i) => (
                    <tr key={i} style={{borderBottom:'1px solid #f7fafc'}}>
                      <td style={{padding:'8px 10px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                          <div style={{width:'8px',height:'8px',borderRadius:'2px',background:CORES[i%CORES.length],flexShrink:0}}/>
                          <span style={{fontWeight:'600',color:'#2d3748'}}>{c.categoria}</span>
                        </div>
                      </td>
                      <td style={{padding:'8px 10px',textAlign:'center',fontWeight:'bold',color:CORES[i%CORES.length]}}>R$ {c.valor.toFixed(2)}</td>
                      <td style={{padding:'8px 10px',textAlign:'center',color:'#4a5568'}}>{c.quantidade}</td>
                      <td style={{padding:'8px 10px',textAlign:'center',color:'#718096'}}>{totalCategValor>0?((c.valor/totalCategValor)*100).toFixed(1):0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* ── 8. Investimento por Fornecedor ── */}
      <Card titulo="Investimento por Fornecedor" icon={Truck} cor="#f5821f">
        {dadosFornecedor.length === 0 ? (
          <p style={{color:'#a0aec0',textAlign:'center',padding:'24px',fontSize:'13px'}}>Nenhum investimento registrado.</p>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'24px', alignItems:'center' }}>
            <div>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={dadosFornecedor} dataKey="investido" nameKey="fornecedor" cx="50%" cy="50%" outerRadius={100} innerRadius={52} paddingAngle={3} labelLine={false} label={LabelPizza}>
                    {dadosFornecedor.map((_,i) => <Cell key={i} fill={CORES[i%CORES.length]}/>)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              {dadosFornecedor.map((f,i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px',borderRadius:'10px',marginBottom:'8px',background:'#f9fafb'}}>
                  <div style={{width:'10px',height:'10px',borderRadius:'3px',background:CORES[i%CORES.length],flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'13px',fontWeight:'600',color:'#2d3748',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}} title={f.fornecedor}>{f.fornecedor}</div>
                    <div style={{fontSize:'11px',color:'#a0aec0'}}>{f.qtdCompras} compra(s)</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontSize:'13px',fontWeight:'bold',color:CORES[i%CORES.length]}}>R$ {f.investido.toFixed(2)}</div>
                    <div style={{fontSize:'10px',color:'#a0aec0'}}>{totalInvestido>0?((f.investido/totalInvestido)*100).toFixed(1):0}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* ── 9. Ranking Clientes ── */}
      <Card titulo="Clientes que Mais Compraram" icon={Star} cor="#e91e8c">
        {dadosClientesRanking.length === 0 ? (
          <p style={{color:'#a0aec0',textAlign:'center',padding:'24px',fontSize:'13px'}}>Nenhuma venda encontrada para o período.</p>
        ) : (
          <>
            {dadosClientesRanking.map((c,i) => {
              const pago = c.totalRecebido
              const pendente = Math.max(0, c.totalComprado - pago)
              return (
                <div key={i} style={{ marginBottom:'14px', padding:'12px', borderRadius:'12px', background:'#fafafa', border:'1px solid #f0f0f0' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
                    {/* Medalha */}
                    <div style={{
                      width:'32px', height:'32px', borderRadius:'50%', flexShrink:0,
                      background: i===0 ? 'linear-gradient(135deg,#f6d365,#fda085)' : i===1 ? 'linear-gradient(135deg,#d3d3d3,#a9a9a9)' : i===2 ? 'linear-gradient(135deg,#c97b4b,#9c5a2a)' : '#f0f4f8',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'13px', fontWeight:'bold', color: i<3 ? 'white' : '#718096'
                    }}>
                      {i < 3 ? ['1º','2º','3º'][i] : `${i+1}º`}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:'700', color:'#2d3748', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.nome}</div>
                      <div style={{ fontSize:'11px', color:'#a0aec0' }}>{c.qtdPedidos} pedido(s)</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:'14px', fontWeight:'bold', color:'#e91e8c' }}>R$ {c.totalComprado.toFixed(2)}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <div style={{ flex:1, background:'#e8f5e9', borderRadius:'8px', padding:'6px 10px', textAlign:'center' }}>
                      <div style={{ fontSize:'10px', color:'#2e7d32', fontWeight:'600' }}>Pago</div>
                      <div style={{ fontSize:'12px', color:'#1a6b5a', fontWeight:'bold' }}>R$ {pago.toFixed(2)}</div>
                    </div>
                    <div style={{ flex:1, background: pendente > 0 ? '#fff8e1' : '#f7fafc', borderRadius:'8px', padding:'6px 10px', textAlign:'center' }}>
                      <div style={{ fontSize:'10px', color: pendente > 0 ? '#f57f17' : '#a0aec0', fontWeight:'600' }}>Pendente</div>
                      <div style={{ fontSize:'12px', color: pendente > 0 ? '#f5821f' : '#a0aec0', fontWeight:'bold' }}>R$ {pendente.toFixed(2)}</div>
                    </div>
                    <div style={{ flex:1, background:'#f7fafc', borderRadius:'8px', padding:'6px 10px', textAlign:'center' }}>
                      <div style={{ fontSize:'10px', color:'#718096', fontWeight:'600' }}>Ticket</div>
                      <div style={{ fontSize:'12px', color:'#4a5568', fontWeight:'bold' }}>R$ {(c.totalComprado/c.qtdPedidos).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </Card>

      {/* ── 10-12. Cards de Previsão, Estoque e Datas ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'16px', marginBottom:'0' }}>

        {/* Previsão */}
        <div style={{ background:'#fff', borderRadius:'18px', padding:'22px', boxShadow:'0 2px 12px rgba(15,23,42,0.06)', border:'1px solid #eef2f7', borderTop:'3px solid #8b5cf6' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px', paddingBottom:'12px', borderBottom:'1px solid #f7f7f7' }}>
            <div style={{ width:'32px', height:'32px', borderRadius:'9px', background:'#8b5cf618', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Eye size={16} color="#8b5cf6" strokeWidth={2.2}/>
            </div>
            <span style={{ fontSize:'14px', fontWeight:'700', color:'#1a202c' }}>Previsão — Próximo Mês</span>
          </div>
          {previsaoVendas ? (
            <>
              <div style={{ fontSize:'28px', fontWeight:'bold', color:'#8b5cf6', marginBottom:'4px' }}>
                R$ {parseFloat(previsaoVendas.valor).toFixed(2)}
              </div>
              <p style={{ fontSize:'11px', color:'#a0aec0', marginBottom:'10px' }}>Regressão linear — {dadosLinha.length} meses de dados</p>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'12px' }}>
                {previsaoVendas.tendencia === 'Alta'
                  ? <TrendingUp size={16} color="#10b981"/>
                  : previsaoVendas.tendencia === 'Queda'
                  ? <TrendingDown size={16} color="#ef4444"/>
                  : <Minus size={16} color="#a0aec0"/>
                }
                <span style={{ fontSize:'13px', color: previsaoVendas.tendencia === 'Alta' ? '#10b981' : previsaoVendas.tendencia === 'Queda' ? '#ef4444' : '#718096', fontWeight:'600' }}>
                  Tendência de {previsaoVendas.tendencia}
                </span>
              </div>
              <div style={{ background: parseFloat(previsaoVendas.valor)>=3000 ? '#e8f5e9' : '#fff8e1', padding:'10px 14px', borderRadius:'10px', display:'flex', alignItems:'center', gap:'8px' }}>
                {parseFloat(previsaoVendas.valor)>=3000
                  ? <CheckCircle size={16} color="#2e7d32"/>
                  : <AlertTriangle size={16} color="#f57f17"/>
                }
                <span style={{ fontSize:'12px', fontWeight:'600', color: parseFloat(previsaoVendas.valor)>=3000 ? '#2e7d32' : '#f57f17' }}>
                  {parseFloat(previsaoVendas.valor)>=3000 ? 'Acima da meta de R$ 3.000' : 'Abaixo da meta de R$ 3.000'}
                </span>
              </div>
            </>
          ) : (
            <p style={{color:'#a0aec0',fontSize:'13px'}}>Dados insuficientes para previsão.</p>
          )}
        </div>

        {/* Estoque Crítico */}
        <div style={{ background:'#fff', borderRadius:'18px', padding:'22px', boxShadow:'0 2px 12px rgba(15,23,42,0.06)', border:'1px solid #eef2f7', borderTop:'3px solid #ef4444' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px', paddingBottom:'12px', borderBottom:'1px solid #f7f7f7' }}>
            <div style={{ width:'32px', height:'32px', borderRadius:'9px', background:'#ef444418', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Package size={16} color="#ef4444" strokeWidth={2.2}/>
            </div>
            <span style={{ fontSize:'14px', fontWeight:'700', color:'#1a202c' }}>Estoque Crítico</span>
          </div>
          {produtosAcabando.length === 0 ? (
            <div style={{textAlign:'center',padding:'16px'}}>
              <CheckCircle size={28} color="#10b981" style={{marginBottom:'8px'}}/>
              <p style={{color:'#10b981',fontWeight:'bold',fontSize:'13px'}}>Nenhum produto crítico!</p>
            </div>
          ) : produtosAcabando.map((p,i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background: p.estoque===0 ? '#fff5f5' : '#fffbeb', borderRadius:'10px', marginBottom:'8px', borderLeft:`3px solid ${p.estoque===0?'#ef4444':'#f5821f'}` }}>
              <div>
                <strong style={{fontSize:'13px',color:'#2d3748'}}>{p.nome}</strong>
                <div style={{fontSize:'11px',color:'#a0aec0'}}>{p.categoria}</div>
              </div>
              <div style={{ width:'36px', height:'36px', borderRadius:'10px', background: p.estoque===0 ? '#fee2e2' : '#fef3c7', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{fontWeight:'bold',color:p.estoque===0?'#ef4444':'#f5821f',fontSize:'16px'}}>{p.estoque}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Próximas Datas Festivas */}
        <div style={{ background:'#fff', borderRadius:'18px', padding:'22px', boxShadow:'0 2px 12px rgba(15,23,42,0.06)', border:'1px solid #eef2f7', borderTop:'3px solid #e91e8c' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px', paddingBottom:'12px', borderBottom:'1px solid #f7f7f7' }}>
            <div style={{ width:'32px', height:'32px', borderRadius:'9px', background:'#e91e8c18', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Gift size={16} color="#e91e8c" strokeWidth={2.2}/>
            </div>
            <span style={{ fontSize:'14px', fontWeight:'700', color:'#1a202c' }}>Próximas Datas Festivas</span>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
            {proximasDatasFestejas.map((d, i) => (
              <div key={i} style={{
                padding:'12px',
                borderRadius:'12px',
                background: i===0 ? '#fdf0f8' : '#f9fafb',
                border: i===0 ? '1px solid #f8c8e8' : '1px solid #f0f0f0',
                display:'flex', alignItems:'center', gap:'12px'
              }}>
                <div style={{ width:'42px', height:'42px', borderRadius:'10px', background: i===0 ? '#e91e8c' : '#f0f4f8', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'18px' }}>
                  {d.icone}
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:'13px',fontWeight:'700',color:'#2d3748',marginBottom:'2px'}}>{d.nome}</div>
                  <div style={{fontSize:'11px',color:'#a0aec0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{d.categorias.join(', ')}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:'13px',fontWeight:'bold',color: i===0 ? '#e91e8c' : '#718096'}}>{d.diasRestantes}d</div>
                  <div style={{fontSize:'10px',color:'#a0aec0'}}>faltam</div>
                </div>
              </div>
            ))}
          </div>
          {prodsPrevistas.length > 0 && (
            <div style={{ marginTop:'16px', paddingTop:'14px', borderTop:'1px solid #f7fafc' }}>
              <p style={{fontSize:'11px',color:'#a0aec0',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'10px'}}>
                Mais vendidos em "{proxData.nome}"
              </p>
              {prodsPrevistas.map((p,i) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 10px',background:'#fdf0f8',borderRadius:'8px',marginBottom:'6px',borderLeft:'3px solid #e91e8c'}}>
                  <div>
                    <strong style={{fontSize:'12px',color:'#2d3748'}}>{p.nome}</strong>
                    <div style={{fontSize:'10px',color:'#a0aec0'}}>{p.categoria}</div>
                  </div>
                  <span style={{fontWeight:'bold',color:'#e91e8c',fontSize:'13px'}}>{p.quantidade} un.</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BI
