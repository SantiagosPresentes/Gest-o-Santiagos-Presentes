import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import {LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LabelList, ComposedChart} from 'recharts'
import PageHeader from '../components/PageHeader'
import {ShoppingCart, ClipboardList, RotateCcw, Package, TrendingUp, Boxes, Users, DollarSign, History, BarChart3, FileText} from 'lucide-react'
import {CalendarDays, Tags, RefreshCw} from 'lucide-react'
import { motion } from 'framer-motion'

const CORES = ['#1a6b5a', '#f5821f', '#29abe2', '#e91e8c', '#8b5cf6', '#f7c948', '#10b981', '#ef4444', '#06b6d4', '#84cc16']

const TODAS_DATAS_COMEMORATIVAS = [
  { mes: 1, dia: 1, nome: '🎆 Ano Novo', categorias: ['Decoração', 'Perfumaria'] },
  { mes: 2, dia: 12, nome: '❤️ Dia dos Namorados (Prévia)', categorias: ['Perfumaria', 'Decoração'] },
  { mes: 3, dia: 1, nome: '📚 Volta às Aulas', categorias: ['Escolar', 'Utilidade'] },
  { mes: 4, dia: 20, nome: '🐣 Páscoa', categorias: ['Decoração', 'Infantil'] },
  { mes: 5, dia: 11, nome: '💐 Dia das Mães', categorias: ['Perfumaria', 'Cama / Mesa / Banho', 'Decoração'] },
  { mes: 6, dia: 12, nome: '❤️ Dia dos Namorados', categorias: ['Perfumaria', 'Decoração'] },
  { mes: 7, dia: 1, nome: '🏖️ Férias Escolares', categorias: ['Infantil', 'Escolar'] },
  { mes: 8, dia: 10, nome: '👔 Dia dos Pais', categorias: ['Utilidade', 'Cozinha'] },
  { mes: 10, dia: 12, nome: '🧸 Dia das Crianças', categorias: ['Infantil', 'Escolar'] },
  { mes: 11, dia: 25, nome: '🛍️ Black Friday', categorias: ['Cama / Mesa / Banho', 'Cozinha', 'Decoração'] },
  { mes: 12, dia: 25, nome: '🎄 Natal', categorias: ['Decoração', 'Perfumaria', 'Infantil', 'Cozinha'] },
]

function proximaDataComemorativa() {
  const hoje = new Date()
  const futuras = TODAS_DATAS_COMEMORATIVAS.filter(d => {
    const dataEvento = new Date(hoje.getFullYear(), d.mes - 1, d.dia)
    return dataEvento > hoje
  })
  if (futuras.length > 0) return futuras[0]
  return TODAS_DATAS_COMEMORATIVAS[0]
}

const MESES_NOMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const TooltipCustom = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div style={{background:'white', border:'none', borderRadius:'12px', padding:'14px 18px', boxShadow:'0 8px 24px rgba(0,0,0,0.15)', fontSize:'13px', minWidth:'160px'}}>
      {label && <p style={{fontWeight:'bold', color:'#333', marginBottom:'8px', borderBottom:'1px solid #f0f0f0', paddingBottom:'6px'}}>{label}</p>}
      {payload.map((p, i) => (
        <div key={i} style={{display:'flex', justifyContent:'space-between', gap:'16px', margin:'4px 0', alignItems:'center'}}>
          <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
            <div style={{width:'10px', height:'10px', borderRadius:'50%', background:p.color, flexShrink:0}}/>
            <span style={{color:'#666'}}>{p.name}</span>
          </div>
          <span style={{fontWeight:'bold', color:p.color}}>
            {p.name?.includes('Valor') || p.name?.includes('Vendido') || p.name?.includes('Recebido') || p.name?.includes('Investido') || p.name?.includes('Lucro') || p.name?.includes('Devolvido')
              ? `R$ ${parseFloat(p.value).toFixed(2)}`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

const LabelPizza = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

function BI() {
  const [vendas, setVendas] = useState([])
  const [itensVenda, setItensVenda] = useState([])
  const [devolucoes, setDevolucoes] = useState([])
  const [investimentos, setInvestimentos] = useState([])
  const [clientes, setClientes] = useState([])
  const [prods, setProds] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroMes, setFiltroMes] = useState('')
  const [filtroAno, setFiltroAno] = useState('')
  const [kpiSelecionado, setKpiSelecionado] = useState(null)

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    setCarregando(true)
    const [v, iv, d, inv, c, p] = await Promise.all([
      supabase.from('vendas').select('*, clientes(nome)').order('data_venda'),
      supabase.from('itens_venda').select('*, produtos(nome, categoria, preco_venda)'),
      supabase.from('devolucoes').select('*, produtos(nome, categoria)'),
      supabase.from('investimentos').select('*, produtos(nome, categoria)'),
      supabase.from('clientes').select('*, vendas(valor_total, situacao, recebido, data_para_pagar)'),
      supabase.from('produtos').select('*')
    ])
    if (v.data) setVendas(v.data)
    if (iv.data) setItensVenda(iv.data)
    if (d.data) setDevolucoes(d.data)
    if (inv.data) setInvestimentos(inv.data)
    if (c.data) setClientes(c.data)
    if (p.data) setProds(p.data)
    setCarregando(false)
  }

  const vendasFiltradas = vendas.filter(v => {
    const d = new Date(v.data_para_pagar + 'T12:00:00')
    if (filtroMes && d.getMonth() + 1 !== parseInt(filtroMes)) return false
    if (filtroAno && d.getFullYear() !== parseInt(filtroAno)) return false
    return true
  })

  const itensFiltrados = itensVenda.filter(i => {
    if (filtroCategoria && i.produtos?.categoria !== filtroCategoria) return false
    return true
  })

  const anosDisponiveis = [...new Set(vendas.map(v => new Date(v.data_para_pagar + 'T12:00:00').getFullYear()))].sort()
  const categorias = [...new Set(itensVenda.map(i => i.produtos?.categoria).filter(Boolean))].sort()

  const totalDevolvido = devolucoes.reduce((acc, d) => acc + parseFloat(d.valor_total || 0), 0)
  const qtdDevolucoes = devolucoes.reduce((acc, d) => acc + (d.quantidade || 1), 0)
  const totalVendidoBruto = vendasFiltradas.reduce((acc, v) => acc + parseFloat(v.valor_total), 0)
  const totalVendido = Math.max(0, totalVendidoBruto - totalDevolvido)
  const totalRecebido = vendasFiltradas.reduce((acc, v) => acc + parseFloat(v.recebido || 0), 0)
  const ticketMedio = vendasFiltradas.length > 0 ? totalVendidoBruto / vendasFiltradas.length : 0
  const atrasados = vendasFiltradas.filter(v => {
    if (parseFloat(v.recebido || 0) >= parseFloat(v.valor_total)) return false
    const hoje = new Date(); hoje.setHours(0,0,0,0)
    return new Date(v.data_para_pagar + 'T12:00:00') < hoje
  }).length
  const taxaInad = vendasFiltradas.length > 0 ? ((atrasados / vendasFiltradas.length) * 100).toFixed(1) : 0

  const dadosLinha = () => {
    const meses = {}
    vendas.forEach(v => {
      const d = new Date(v.data_para_pagar + 'T12:00:00')
      if (filtroAno && d.getFullYear() !== parseInt(filtroAno)) return
      const chave = `${MESES_NOMES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
      if (!meses[chave]) meses[chave] = { mes: chave, vendido: 0, recebido: 0, meta: 3000 }
      meses[chave].vendido += parseFloat(v.valor_total)
      meses[chave].recebido += parseFloat(v.recebido || 0)
    })
    devolucoes.forEach(dev => {
      const d = new Date(dev.criado_em)
      if (filtroAno && d.getFullYear() !== parseInt(filtroAno)) return
      const chave = `${MESES_NOMES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
      if (meses[chave]) meses[chave].vendido = Math.max(0, meses[chave].vendido - parseFloat(dev.valor_total || 0))
    })
    return Object.values(meses)
  }

  const dadosMaisVendidos = () => {
    const contagem = {}
    itensFiltrados.forEach(i => {
      const nome = i.produtos?.nome || 'Desconhecido'
      const nomeAbrev = nome.length > 20 ? nome.substring(0, 20) + '…' : nome
      if (!contagem[nomeAbrev]) contagem[nomeAbrev] = { nome: nomeAbrev, quantidade: 0, valor: 0 }
      contagem[nomeAbrev].quantidade += i.quantidade
      contagem[nomeAbrev].valor += i.quantidade * parseFloat(i.valor_unitario)
    })
    devolucoes.forEach(dev => {
      const nome = dev.produtos?.nome || 'Desconhecido'
      const nomeAbrev = nome.length > 20 ? nome.substring(0, 20) + '…' : nome
      if (contagem[nomeAbrev]) contagem[nomeAbrev].quantidade = Math.max(0, contagem[nomeAbrev].quantidade - dev.quantidade)
    })
    return Object.values(contagem).sort((a, b) => b.quantidade - a.quantidade).slice(0, 10)
  }

  const dadosMenosVendidos = () => {
    const contagem = {}
    itensFiltrados.forEach(i => {
      const nome = i.produtos?.nome || 'Desconhecido'
      const nomeAbrev = nome.length > 20 ? nome.substring(0, 20) + '…' : nome
      if (!contagem[nomeAbrev]) contagem[nomeAbrev] = { nome: nomeAbrev, quantidade: 0 }
      contagem[nomeAbrev].quantidade += i.quantidade
    })
    return Object.values(contagem).sort((a, b) => a.quantidade - b.quantidade).slice(0, 10)
  }

  const dadosMaisDevolvidos = () => {
    const contagem = {}
    devolucoes.forEach(dev => {
      const nome = dev.produtos?.nome || 'Desconhecido'
      const nomeAbrev = nome.length > 20 ? nome.substring(0, 20) + '…' : nome
      if (!contagem[nomeAbrev]) contagem[nomeAbrev] = { nome: nomeAbrev, quantidade: 0, valor: 0 }
      contagem[nomeAbrev].quantidade += dev.quantidade
      contagem[nomeAbrev].valor += parseFloat(dev.valor_total || 0)
    })
    return Object.values(contagem).sort((a, b) => b.quantidade - a.quantidade).slice(0, 10)
  }

  const dadosFornecedor = () => {
    const forns = {}
    investimentos.forEach(inv => {
      const forn = inv.fornecedor || 'Desconhecido'
      if (!forns[forn]) forns[forn] = { fornecedor: forn, investido: 0, qtdCompras: 0 }
      forns[forn].investido += parseFloat(inv.valor_total_pago)
      forns[forn].qtdCompras += 1
    })
    return Object.values(forns).sort((a, b) => b.investido - a.investido)
  }

  const dadosCategoria = () => {
    const cats = {}
    itensFiltrados.forEach(i => {
      const cat = i.produtos?.categoria || 'Outros'
      if (!cats[cat]) cats[cat] = { categoria: cat, valor: 0, quantidade: 0 }
      cats[cat].valor += i.quantidade * parseFloat(i.valor_unitario)
      cats[cat].quantidade += i.quantidade
    })
    devolucoes.forEach(dev => {
      const cat = dev.produtos?.categoria || 'Outros'
      if (cats[cat]) {
        cats[cat].valor = Math.max(0, cats[cat].valor - parseFloat(dev.valor_total || 0))
        cats[cat].quantidade = Math.max(0, cats[cat].quantidade - dev.quantidade)
      }
    })
    return Object.values(cats).sort((a, b) => b.valor - a.valor)
  }

  const dadosVendasDev = () => {
    const meses = {}
    itensVenda.forEach(i => {
      const venda = vendas.find(v => v.id === i.venda_id)
      if (!venda) return
      const d = new Date(venda.data_para_pagar + 'T12:00:00')
      if (filtroAno && d.getFullYear() !== parseInt(filtroAno)) return
      const chave = `${MESES_NOMES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
      if (!meses[chave]) meses[chave] = { mes: chave, qtdVendida: 0, valorVendido: 0, qtdDevolvida: 0, valorDevolvido: 0 }
      meses[chave].qtdVendida += i.quantidade
      meses[chave].valorVendido += i.quantidade * parseFloat(i.valor_unitario)
    })
    devolucoes.forEach(dev => {
      const d = new Date(dev.criado_em)
      if (filtroAno && d.getFullYear() !== parseInt(filtroAno)) return
      const chave = `${MESES_NOMES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
      if (!meses[chave]) meses[chave] = { mes: chave, qtdVendida: 0, valorVendido: 0, qtdDevolvida: 0, valorDevolvido: 0 }
      meses[chave].qtdDevolvida += dev.quantidade
      meses[chave].valorDevolvido += parseFloat(dev.valor_total || 0)
    })
    return Object.values(meses)
  }

  const previsaoVendas = () => {
    const dados = dadosLinha()
    if (dados.length < 2) return null
    const ultimos = dados.slice(-3)
    const media = ultimos.reduce((acc, m) => acc + m.vendido, 0) / ultimos.length
    return media.toFixed(2)
  }

  const produtosAcabando = prods.filter(p => p.estoque <= 3 && p.estoque >= 0).sort((a, b) => a.estoque - b.estoque).slice(0, 5)
  const proxData = proximaDataComemorativa()

  const prodsPrevistas = () => {
    const contagem = {}
    itensVenda.filter(i => proxData.categorias.includes(i.produtos?.categoria)).forEach(i => {
      const nome = i.produtos?.nome || 'Desconhecido'
      if (!contagem[nome]) contagem[nome] = { nome, quantidade: 0, categoria: i.produtos?.categoria }
      contagem[nome].quantidade += i.quantidade
    })
    return Object.values(contagem).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5)
  }

  if (carregando) {
    return (
      <div style={{display:'flex', alignItems:'center', justifyContent:'center', minHeight:'300px', flexDirection:'column', gap:'16px'}}>
        <div style={{width:'48px', height:'48px', border:'4px solid #eee', borderTop:'4px solid #1a6b5a', borderRadius:'50%', animation:'spin 1s linear infinite'}}/>
        <p style={{color:'#666'}}>Carregando dados...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const card = {
    background:'#fff', borderRadius:'18px', padding:'24px', boxShadow:'0 2px 12px rgba(15,23,42,0.07)', border:'1px solid #eef2f7', marginBottom:'20px'
  }
  const titulo = { fontSize:'15px', fontWeight:'bold', color:'#1a6b5a', marginBottom:'20px', paddingBottom:'12px', borderBottom:'2px solid #f0f0f0', display:'flex', alignItems:'center', gap:'8px' }

  const fornecedores = dadosFornecedor()
  const totalInvestido = fornecedores.reduce((acc, f) => acc + f.investido, 0)
  const maisDev = dadosMaisDevolvidos()

  const filtroIcones = [<CalendarDays size={16} color="#aaa"/>, <CalendarDays size={16} color="#aaa"/>, <Tags size={16} color="#aaa"/>]
  const filtroLabels = ['Ano', 'Mês', 'Categoria']

  return (
    <div style={{background:'#f4f6f9', minHeight:'100vh', padding:'0 0 40px 0'}}>
      <PageHeader
        title="Dashboard BI"
        subtitle="Análise de vendas, investimentos, devoluções e desempenho"
        icon={<BarChart3 size={22} color="white" />}
      />

      {/* Filtros — card branco estilo imagem */}
      <div style={{background:'#fff', borderRadius:'16px', padding:'20px 24px', boxShadow:'0 2px 12px rgba(15,23,42,0.07)', border:'1px solid #eef2f7', margin:'20px 0'}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'16px', alignItems:'end'}}>
          {[
            { label:'Ano', value: filtroAno, set: setFiltroAno, placeholder: 'Todos os anos', options: anosDisponiveis.map(a => ({v:String(a), l:String(a)})), icon: <CalendarDays size={16} color="#aaa"/> },
            { label:'Mês', value: filtroMes, set: setFiltroMes, placeholder: 'Todos os meses', options: MESES_NOMES.map((m, i) => ({v:String(i+1), l:m})), icon: <CalendarDays size={16} color="#aaa"/> },
            { label:'Categoria', value: filtroCategoria, set: setFiltroCategoria, placeholder: 'Todas categorias', options: categorias.map(c => ({v:c, l:c})), icon: <Tags size={16} color="#aaa"/> },
          ].map((f, i) => (
            <div key={i}>
              <label style={{display:'block', fontSize:'12px', fontWeight:'600', color:'#888', marginBottom:'6px'}}>{f.label}</label>
              <div style={{position:'relative'}}>
                <select
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  style={{
                    width:'100%',
                    padding:'10px 36px 10px 14px',
                    borderRadius:'10px',
                    border:'1.5px solid #e5e7eb',
                    fontSize:'13px',
                    color:'#555',
                    background:'#fff',
                    appearance:'none',
                    cursor:'pointer',
                    outline:'none',
                  }}
                >
                  <option value="">{f.placeholder}</option>
                  {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
                <div style={{position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none'}}>
                  {f.icon}
                </div>
              </div>
            </div>
          ))}
          <div style={{display:'flex', gap:'10px', alignItems:'flex-end'}}>
            <button
              onClick={() => { setFiltroAno(''); setFiltroMes(''); setFiltroCategoria('') }}
              style={{flex:1, background:'#e94560', color:'#fff', border:'none', padding:'10px 14px', borderRadius:'10px', cursor:'pointer', fontSize:'13px', fontWeight:'600', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px'}}
            >
              🧹 Limpar
            </button>
            <button
              onClick={carregarDados}
              style={{flex:1, background:'#1a6b5a', color:'white', border:'none', padding:'10px 14px', borderRadius:'10px', cursor:'pointer', fontSize:'13px', fontWeight:'600', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px'}}
            >
              <RefreshCw size={14}/> Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:'14px', marginBottom:'20px'}}>
        {[
          { label:'Total Vendido', valor:`R$ ${totalVendido.toFixed(2)}`, cor:'#1a6b5a', icon:'💰' },
          { label:'Total Recebido', valor:`R$ ${totalRecebido.toFixed(2)}`, cor:'#29abe2', icon:'✅' },
          { label:'Ticket Médio', valor:`R$ ${ticketMedio.toFixed(2)}`, cor:'#f5821f', icon:'🎯' },
          { label:'Inadimplência', valor:`${taxaInad}%`, cor: parseFloat(taxaInad) > 20 ? '#ef4444' : '#10b981', icon:'⚠️' },
          { label:'Total Vendas', valor:vendasFiltradas.length, cor:'#8b5cf6', icon:'🛒' },
          { label:'Clientes Ativos', valor:clientes.length, cor:'#e91e8c', icon:'👥' },
          { label:'Valor Devolvido', valor:`R$ ${totalDevolvido.toFixed(2)}`, cor:'#ef4444', icon:'↩️' },
          { label:'Qtd Devoluções', valor:qtdDevolucoes, cor:'#f97316', icon:'📦' },
        ].map((kpi, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -4, boxShadow:'0 8px 24px rgba(0,0,0,0.10)' }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.18 }}
            onClick={() => setKpiSelecionado(kpi.label)}
            style={{
              background:'#fff',
              borderRadius:'16px',
              padding:'20px 18px',
              cursor:'pointer',
              boxShadow:'0 2px 10px rgba(0,0,0,0.06)',
              borderLeft:`4px solid ${kpi.cor}`,
              border: kpiSelecionado === kpi.label ? `2px solid ${kpi.cor}` : '2px solid transparent',
              display:'flex',
              alignItems:'center',
              gap:'14px',
            }}
          >
            <div style={{fontSize:'32px', lineHeight:1}}>{kpi.icon}</div>
            <div>
              <div style={{fontSize:'11px', color:'#999', marginBottom:'4px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.5px'}}>{kpi.label}</div>
              <div style={{fontSize:'18px', fontWeight:'bold', color:kpi.cor}}>{kpi.valor}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* GRÁFICO 1 — Area + Line: Vendas por mês */}
      <div style={card}>
        <div style={titulo}>📈 Total Vendido por Mês</div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={dadosLinha()} margin={{top:10, right:20, left:10, bottom:10}}>
            <defs>
              <linearGradient id="gradVendido" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1a6b5a" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#1a6b5a" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="gradRecebido" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#29abe2" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#29abe2" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false}/>
            <XAxis dataKey="mes" tick={{fontSize:12, fill:'#666'}} axisLine={false} tickLine={false}/>
            <YAxis hide/>
            <Tooltip content={<TooltipCustom/>}/>
            <Legend iconType="circle" iconSize={10}/>
            <Area type="monotone" dataKey="vendido" name="Valor Vendido" stroke="#1a6b5a" strokeWidth={3} fill="url(#gradVendido)" dot={{r:5, fill:'#1a6b5a', strokeWidth:2, stroke:'white'}} activeDot={{r:8}}>
              <LabelList dataKey="vendido" position="top" formatter={v => v > 0 ? `R$${parseFloat(v).toFixed(0)}` : ''} style={{fontSize:'11px', fill:'#1a6b5a', fontWeight:'bold'}}/>
            </Area>
            <Area type="monotone" dataKey="recebido" name="Valor Recebido" stroke="#29abe2" strokeWidth={2} fill="url(#gradRecebido)" dot={{r:4}} strokeDasharray="5 5"/>
            <Line type="monotone" dataKey="meta" name="Meta R$3.000" stroke="#f5821f" strokeWidth={2} strokeDasharray="8 4" dot={false}/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* GRÁFICO 2 — Top 10 mais vendidos */}
      <div style={card}>
        <div style={titulo}>🏆 Top 10 Produtos Mais Vendidos</div>
        <div style={{overflowX:'auto'}}>
          <div style={{minWidth:'320px'}}>
            {dadosMaisVendidos().map((p, i) => (
              <div key={i} style={{marginBottom:'10px'}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                  <span style={{fontSize:'13px', fontWeight:'bold', color:'#333'}}>{p.nome}</span>
                  <span style={{fontSize:'13px', fontWeight:'bold', color:CORES[i % CORES.length]}}>{p.quantidade} un.</span>
                </div>
                <div style={{background:'#f0f0f0', borderRadius:'999px', height:'10px', overflow:'hidden'}}>
                  <div style={{
                    width:`${Math.min(100, (p.quantidade / (dadosMaisVendidos()[0]?.quantidade || 1)) * 100)}%`,
                    background:CORES[i % CORES.length],
                    height:'100%',
                    borderRadius:'999px',
                    transition:'width 0.5s ease'
                  }}/>
                </div>
                <div style={{fontSize:'11px', color:'#888', marginTop:'2px'}}>R$ {p.valor.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GRÁFICO 2b — Top 10 menos vendidos */}
      <div style={card}>
        <div style={titulo}>📉 Top 10 Produtos Menos Vendidos</div>
        <div style={{overflowX:'auto'}}>
          <div style={{minWidth:'320px'}}>
            {dadosMenosVendidos().map((p, i) => {
              const max = dadosMaisVendidos()[0]?.quantidade || 1
              return (
                <div key={i} style={{marginBottom:'10px'}}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                    <span style={{fontSize:'13px', fontWeight:'bold', color:'#333'}}>{p.nome}</span>
                    <span style={{fontSize:'13px', fontWeight:'bold', color:'#ef4444'}}>{p.quantidade} un.</span>
                  </div>
                  <div style={{background:'#f0f0f0', borderRadius:'999px', height:'10px', overflow:'hidden'}}>
                    <div style={{
                      width:`${Math.max(2, (p.quantidade / max) * 100)}%`,
                      background:`linear-gradient(90deg, #ef4444, #f97316)`,
                      height:'100%',
                      borderRadius:'999px'
                    }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* GRÁFICO 2c — Top 10 mais devolvidos */}
      <div style={card}>
        <div style={titulo}>↩️ Top 10 Produtos Mais Devolvidos</div>
        <div style={{overflowX:'auto'}}>
          <div style={{minWidth:'320px'}}>
            {maisDev.length === 0 ? (
              <p style={{color:'#10b981', fontWeight:'bold', textAlign:'center', padding:'20px'}}>✅ Nenhuma devolução registrada!</p>
            ) : (
              maisDev.map((p, i) => (
                <div key={i} style={{marginBottom:'10px'}}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                    <span style={{fontSize:'13px', fontWeight:'bold', color:'#333'}}>{p.nome}</span>
                    <span style={{fontSize:'13px', fontWeight:'bold', color:'#ef4444'}}>{p.quantidade} un.</span>
                  </div>
                  <div style={{background:'#f0f0f0', borderRadius:'999px', height:'10px', overflow:'hidden'}}>
                    <div style={{
                      width:`${Math.min(100, (p.quantidade / (maisDev[0]?.quantidade || 1)) * 100)}%`,
                      background:`linear-gradient(90deg, #ef4444, #f97316)`,
                      height:'100%',
                      borderRadius:'999px',
                      transition:'width 0.5s ease'
                    }}/>
                  </div>
                  <div style={{fontSize:'11px', color:'#888', marginTop:'2px'}}>R$ {p.valor.toFixed(2)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* GRÁFICO 3 — Fornecedores: Pizza + Tabela */}
      <div style={card}>
        <div style={titulo}>🏪 Investimento por Fornecedor</div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'24px', alignItems:'center'}}>
          <div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={fornecedores} dataKey="investido" nameKey="fornecedor" cx="50%" cy="50%" outerRadius={100} innerRadius={55} paddingAngle={3} labelLine={false} label={LabelPizza}>
                  {fornecedores.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]}/>)}
                </Pie>
                <Tooltip formatter={v => `R$ ${parseFloat(v).toFixed(2)}`}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            {fornecedores.map((f, i) => (
              <div key={i} style={{display:'flex', alignItems:'center', gap:'12px', padding:'10px', borderRadius:'10px', marginBottom:'8px', background:'#f9f9f9'}}>
                <div style={{width:'12px', height:'12px', borderRadius:'50%', background:CORES[i % CORES.length], flexShrink:0}}/>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:'13px', fontWeight:'bold', color:'#333', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{f.fornecedor}</div>
                  <div style={{fontSize:'11px', color:'#888'}}>{f.qtdCompras} compra(s)</div>
                </div>
                <div style={{textAlign:'right', flexShrink:0}}>
                  <div style={{fontSize:'13px', fontWeight:'bold', color:CORES[i % CORES.length]}}>R$ {f.investido.toFixed(2)}</div>
                  <div style={{fontSize:'11px', color:'#888'}}>{totalInvestido > 0 ? ((f.investido / totalInvestido) * 100).toFixed(1) : 0}%</div>
                </div>
              </div>
            ))}
            {fornecedores.length === 0 && <p style={{color:'#aaa', textAlign:'center', padding:'20px'}}>Nenhum investimento registrado</p>}
          </div>
        </div>
      </div>

      {/* GRÁFICO 4 — Categoria: Pizza + Barras */}
      <div style={card}>
        <div style={titulo}>📦 Vendas por Categoria</div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'24px', alignItems:'center'}}>
          <div>
            <p style={{textAlign:'center', fontSize:'12px', color:'#888', marginBottom:'8px'}}>Por Valor (R$)</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={dadosCategoria()} dataKey="valor" nameKey="categoria" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={3} labelLine={false} label={LabelPizza}>
                  {dadosCategoria().map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]}/>)}
                </Pie>
                <Tooltip formatter={v => `R$ ${parseFloat(v).toFixed(2)}`}/>
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{fontSize:'11px'}}>{v}</span>}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p style={{textAlign:'center', fontSize:'12px', color:'#888', marginBottom:'8px'}}>Por Quantidade</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dadosCategoria()} layout="vertical" margin={{top:0, right:40, left:0, bottom:0}} barSize={16}>
                <XAxis type="number" hide/>
                <YAxis dataKey="categoria" type="category" tick={{fontSize:11, fill:'#555'}} width={110} axisLine={false} tickLine={false}/>
                <Tooltip content={<TooltipCustom/>}/>
                <Bar dataKey="quantidade" name="Quantidade" radius={[0,8,8,0]}>
                  {dadosCategoria().map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]}/>)}
                  <LabelList dataKey="quantidade" position="right" style={{fontSize:'12px', fontWeight:'bold', fill:'#333'}}/>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* GRÁFICO 5 — Vendas vs Devoluções */}
      <div style={card}>
        <div style={titulo}>🔄 Vendas vs Devoluções por Mês</div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={dadosVendasDev()} margin={{top:10, right:20, left:10, bottom:10}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false}/>
            <XAxis dataKey="mes" tick={{fontSize:11, fill:'#666'}} axisLine={false} tickLine={false}/>
            <YAxis hide/>
            <Tooltip content={<TooltipCustom/>}/>
            <Legend iconType="circle" iconSize={10}/>
            <Bar dataKey="valorVendido" name="Valor Vendido" fill="#1a6b5a" radius={[6,6,0,0]} maxBarSize={40}>
              <LabelList dataKey="valorVendido" position="top" formatter={v => v > 0 ? `R$${parseFloat(v).toFixed(0)}` : ''} style={{fontSize:'10px', fill:'#1a6b5a', fontWeight:'bold'}}/>
            </Bar>
            <Bar dataKey="valorDevolvido" name="Valor Devolvido" fill="#ef4444" radius={[6,6,0,0]} maxBarSize={40}>
              <LabelList dataKey="valorDevolvido" position="top" formatter={v => v > 0 ? `R$${parseFloat(v).toFixed(0)}` : ''} style={{fontSize:'10px', fill:'#ef4444', fontWeight:'bold'}}/>
            </Bar>
            <Line type="monotone" dataKey="qtdVendida" name="Qtd Vendida" stroke="#29abe2" strokeWidth={2} dot={{r:4, fill:'#29abe2'}}/>
            <Line type="monotone" dataKey="qtdDevolvida" name="Qtd Devolvida" stroke="#f5821f" strokeWidth={2} dot={{r:4, fill:'#f5821f'}} strokeDasharray="5 5"/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* PREVISÕES */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'20px', marginBottom:'20px'}}>

        <div style={{...card, marginBottom:0, borderTop:'4px solid #8b5cf6'}}>
          <div style={titulo}>🔮 Previsão — Próximo Mês</div>
          {previsaoVendas() ? (
            <>
              <div style={{fontSize:'32px', fontWeight:'bold', color:'#8b5cf6', marginBottom:'8px'}}>
                R$ {parseFloat(previsaoVendas()).toFixed(2)}
              </div>
              <p style={{fontSize:'13px', color:'#666', marginBottom:'12px'}}>Média dos últimos meses com tendência</p>
              <div style={{background: parseFloat(previsaoVendas()) >= 3000 ? '#e8f5e9' : '#fff8e1', padding:'12px', borderRadius:'8px'}}>
                <strong style={{color: parseFloat(previsaoVendas()) >= 3000 ? '#2e7d32' : '#f57f17', fontSize:'13px'}}>
                  {parseFloat(previsaoVendas()) >= 3000 ? '✅ Acima da meta!' : '⚠️ Abaixo da meta de R$ 3.000'}
                </strong>
              </div>
            </>
          ) : (
            <p style={{color:'#aaa'}}>Dados insuficientes</p>
          )}
        </div>

        <div style={{...card, marginBottom:0, borderTop:'4px solid #ef4444'}}>
          <div style={titulo}>📦 Estoque Crítico</div>
          {produtosAcabando.length === 0 ? (
            <p style={{color:'#10b981', fontWeight:'bold'}}>✅ Nenhum produto crítico!</p>
          ) : (
            produtosAcabando.map((p, i) => (
              <div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px', background: p.estoque === 0 ? '#ffebee' : '#fff8e1', borderRadius:'8px', marginBottom:'8px', borderLeft:`3px solid ${p.estoque === 0 ? '#ef4444' : '#f5821f'}`}}>
                <div>
                  <strong style={{fontSize:'13px'}}>{p.nome}</strong><br/>
                  <small style={{color:'#666'}}>{p.categoria}</small>
                </div>
                <span style={{fontWeight:'bold', color: p.estoque <= 1 ? '#ef4444' : '#f5821f', fontSize:'20px'}}>{p.estoque}</span>
              </div>
            ))
          )}
        </div>

        <div style={{...card, marginBottom:0, borderTop:'4px solid #e91e8c'}}>
          <div style={titulo}>{proxData.nome}</div>
          <p style={{fontSize:'12px', color:'#888', marginBottom:'12px'}}>
            Em alta: {proxData.categorias.join(', ')}
          </p>
          {prodsPrevistas().length === 0 ? (
            <p style={{color:'#aaa', fontSize:'13px'}}>Sem histórico para prever</p>
          ) : (
            prodsPrevistas().map((p, i) => (
              <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'8px 12px', background:'#fdf0f8', borderRadius:'8px', marginBottom:'6px', borderLeft:'3px solid #e91e8c'}}>
                <div>
                  <strong style={{fontSize:'13px'}}>{p.nome}</strong><br/>
                  <small style={{color:'#888'}}>{p.categoria}</small>
                </div>
                <span style={{fontWeight:'bold', color:'#e91e8c', fontSize:'14px'}}>{p.quantidade} un.</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default BI
