import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LabelList, ComposedChart
} from 'recharts'
import PageHeader from '../components/PageHeader'
import { BarChart3 } from 'lucide-react'
import { motion } from 'framer-motion'

const CORES = ['#1a6b5a','#f5821f','#29abe2','#e91e8c','#8b5cf6','#f7c948','#10b981','#ef4444']

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

/* =========================
   DATAS COMEMORATIVAS FIX
========================= */
const DATAS = [
  { mes:1,dia:1,nome:'Ano Novo' },
  { mes:6,dia:12,nome:'Dia dos Namorados' },
  { mes:12,dia:25,nome:'Natal' },
]

function getProximaData() {
  const hoje = new Date()
  let ano = hoje.getFullYear()

  const futuras = DATAS.map(d => {
    let data = new Date(ano, d.mes-1, d.dia)
    if (data < hoje) data = new Date(ano+1, d.mes-1, d.dia)
    return { ...d, data }
  })

  futuras.sort((a,b) => a.data - b.data)
  return futuras[0]
}

/* =========================
   COMPONENTE
========================= */
function BI() {

  const [vendas, setVendas] = useState([])
  const [itens, setItens] = useState([])
  const [devolucoes, setDevolucoes] = useState([])
  const [loading, setLoading] = useState(true)

  const [filtroAno, setFiltroAno] = useState('')
  const [kpiSelecionado, setKpiSelecionado] = useState(null)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setLoading(true)

    const [v, i, d] = await Promise.all([
      supabase.from('vendas').select('*'),
      supabase.from('itens_venda').select('*'),
      supabase.from('devolucoes').select('*')
    ])

    setVendas(v.data || [])
    setItens(i.data || [])
    setDevolucoes(d.data || [])

    setLoading(false)
  }

  /* =========================
     MAP PERFORMANCE FIX
  ========================= */
  const vendasMap = useMemo(() => {
    return Object.fromEntries(vendas.map(v => [v.id, v]))
  }, [vendas])

  /* =========================
     KPIs
  ========================= */
  const totalVendido = useMemo(() => {
    return vendas.reduce((acc,v)=> acc + parseFloat(v.valor_total || 0),0)
  },[vendas])

  const totalDevolvido = useMemo(() => {
    return devolucoes.reduce((acc,d)=> acc + parseFloat(d.valor_total || 0),0)
  },[devolucoes])

  const totalLiquido = totalVendido - totalDevolvido

  /* =========================
     DADOS POR MÊS (OTIMIZADO)
  ========================= */
  const dadosLinha = useMemo(() => {

    const meses = {}

    vendas.forEach(v => {
      const d = new Date(v.data_venda)
      const key = `${MESES[d.getMonth()]}/${d.getFullYear()}`

      if (!meses[key]) meses[key] = { mes:key, valor:0 }

      meses[key].valor += parseFloat(v.valor_total || 0)
    })

    devolucoes.forEach(dev => {
      const d = new Date(dev.criado_em)
      const key = `${MESES[d.getMonth()]}/${d.getFullYear()}`

      if (meses[key]) {
        meses[key].valor -= parseFloat(dev.valor_total || 0)
      }
    })

    return Object.values(meses)
  },[vendas,devolucoes])

  /* =========================
     PREVISÃO INTELIGENTE
  ========================= */
  const previsao = useMemo(() => {
    if (dadosLinha.length < 3) return null

    const ultimos = dadosLinha.slice(-3)

    const tendencia =
      (ultimos[2].valor - ultimos[0].valor) / 2

    const media =
      ultimos.reduce((a,b)=> a+b.valor,0)/3

    return (media + tendencia).toFixed(2)
  },[dadosLinha])

  /* =========================
     TOP PRODUTOS (SEM FIND)
  ========================= */
  const topProdutos = useMemo(() => {

    const mapa = {}

    itens.forEach(i => {
      if (!mapa[i.produto_id]) {
        mapa[i.produto_id] = { qtd:0 }
      }
      mapa[i.produto_id].qtd += i.quantidade
    })

    return Object.values(mapa)
      .sort((a,b)=> b.qtd - a.qtd)
      .slice(0,5)

  },[itens])

  const proxData = getProximaData()

  /* =========================
     LOADING
  ========================= */
  if (loading) return <p>Carregando...</p>

  return (
    <div style={{padding:20}}>

      <PageHeader
        title="Dashboard BI"
        icon={<BarChart3 color="white"/>}
      />

      {/* KPIs */}
      <div style={{display:'flex',gap:10}}>

        {[
          {label:'Vendido', valor:totalVendido},
          {label:'Devolvido', valor:totalDevolvido},
          {label:'Líquido', valor:totalLiquido}
        ].map((k,i)=>(
          <motion.div
            key={i}
            whileHover={{scale:1.05}}
            onClick={()=>setKpiSelecionado(k.label)}
            style={{
              padding:20,
              background:'#fff',
              borderRadius:12,
              cursor:'pointer',
              border:kpiSelecionado===k.label?'2px solid #1a6b5a':'none'
            }}
          >
            <b>{k.label}</b>
            <div>R$ {k.valor.toFixed(2)}</div>
          </motion.div>
        ))}

      </div>

      {/* GRÁFICO */}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={dadosLinha}>
          <XAxis dataKey="mes"/>
          <Tooltip/>
          <Area dataKey="valor" stroke="#1a6b5a" fill="#1a6b5a33"/>
        </AreaChart>
      </ResponsiveContainer>

      {/* PREVISÃO */}
      <div style={{marginTop:20}}>
        <h3>Previsão próximo mês</h3>
        {previsao ? `R$ ${previsao}` : 'Sem dados'}
      </div>

      {/* DATA */}
      <div style={{marginTop:20}}>
        <h3>Próxima data:</h3>
        {proxData.nome}
      </div>

    </div>
  )
}

export default BI