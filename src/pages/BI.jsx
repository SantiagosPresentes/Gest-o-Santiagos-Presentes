import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LabelList
} from 'recharts'

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
  // Se passou todas do ano, pega a primeira do próximo ano
  return TODAS_DATAS_COMEMORATIVAS[0]
}

const MESES_NOMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const TooltipCustom = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div style={{background:'white', border:'1px solid #eee', borderRadius:'10px', padding:'12px', boxShadow:'0 4px 16px rgba(0,0,0,0.12)', fontSize:'13px'}}>
      <p style={{fontWeight:'bold', color:'#333', marginBottom:'6px'}}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{color:p.color, margin:'2px 0'}}>
          {p.name}: {typeof p.value === 'number' && p.name?.toLowerCase().includes('r$') || p.name?.toLowerCase().includes('valor') || p.name?.toLowerCase().includes('vendido') || p.name?.toLowerCase().includes('investido') || p.name?.toLowerCase().includes('devolvido')
            ? `R$ ${parseFloat(p.value).toFixed(2)}`
            : p.value}
        </p>
      ))}
    </div>
  )
}

function BI() {
  const [vendas, setVendas] = useState([])
  const [itensVenda, setItensVenda] = useState([])
  const [devolucoes, setDevolucoes] = useState([])
  const [investimentos, setInvestimentos] = useState([])
  const [clientes, setClientes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroMes, setFiltroMes] = useState('')
  const [filtroAno, setFiltroAno] = useState('')

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    setCarregando(true)
    const [v, iv, d, inv, c] = await Promise.all([
      supabase.from('vendas').select('*, clientes(nome)').order('data_venda'),
      supabase.from('itens_venda').select('*, produtos(nome, categoria, preco_venda)'),
      supabase.from('devolucoes').select('*, produtos(nome, categoria)'),
      supabase.from('investimentos').select('*, produtos(nome, categoria)'),
      supabase.from('clientes').select('*, vendas(valor_total, situacao, recebido, data_para_pagar)')
    ])
    if (v.data) setVendas(v.data)
    if (iv.data) setItensVenda(iv.data)
    if (d.data) setDevolucoes(d.data)
    if (inv.data) setInvestimentos(inv.data)
    if (c.data) setClientes(c.data)
    setCarregando(false)
  }

  // Filtra vendas por mês e ano
  const vendasFiltradas = vendas.filter(v => {
    const d = new Date(v.data_venda)
    if (filtroMes && d.getMonth() + 1 !== parseInt(filtroMes)) return false
    if (filtroAno && d.getFullYear() !== parseInt(filtroAno)) return false
    return true
  })

  const itensFiltrados = itensVenda.filter(i => {
    if (filtroCategoria && i.produtos?.categoria !== filtroCategoria) return false
    return true
  })

  // Anos disponíveis
  const anosDisponiveis = [...new Set(vendas.map(v => new Date(v.data_venda).getFullYear()))].sort()
  const categorias = [...new Set(itensVenda.map(i => i.produtos?.categoria).filter(Boolean))].sort()

  // ── KPIs ──────────────────────────────────────────────
  const totalVendido = vendasFiltradas.reduce((acc, v) => acc + parseFloat(v.valor_total), 0)
  const totalRecebido = vendasFiltradas.reduce((acc, v) => acc + parseFloat(v.recebido || 0), 0)
  const ticketMedio = vendasFiltradas.length > 0 ? totalVendido / vendasFiltradas.length : 0

  const atrasados = vendasFiltradas.filter(v => {
    if (parseFloat(v.recebido || 0) >= parseFloat(v.valor_total)) return false
    const hoje = new Date(); hoje.setHours(0,0,0,0)
    return new Date(v.data_para_pagar + 'T12:00:00') < hoje
  }).length
  const taxaInad = vendasFiltradas.length > 0 ? ((atrasados / vendasFiltradas.length) * 100).toFixed(1) : 0

  // ── GRÁFICO 1 — Linha de vendas por mês ───────────────
  const dadosLinha = () => {
    const meses = {}
    vendas.forEach(v => {
      const d = new Date(v.data_venda)
      if (filtroAno && d.getFullYear() !== parseInt(filtroAno)) return
      const chave = `${MESES_NOMES[d.getMonth()]}/${d.getFullYear()}`
      if (!meses[chave]) meses[chave] = { mes: chave, vendido: 0, recebido: 0, meta: 3000 }
      meses[chave].vendido += parseFloat(v.valor_total)
      meses[chave].recebido += parseFloat(v.recebido || 0)
    })
    // Subtrai devoluções
    devolucoes.forEach(dev => {
      const d = new Date(dev.criado_em)
      if (filtroAno && d.getFullYear() !== parseInt(filtroAno)) return
      const chave = `${MESES_NOMES[d.getMonth()]}/${d.getFullYear()}`
      if (meses[chave]) {
        meses[chave].vendido -= parseFloat(dev.valor_total || 0)
      }
    })
    return Object.values(meses)
  }

  // ── GRÁFICO 2 — 10 mais e 10 menos vendidos ───────────
  const dadosMaisMenos = () => {
    const contagem = {}
    itensFiltrados.forEach(i => {
      const nome = i.produtos?.nome || 'Desconhecido'
      if (!contagem[nome]) contagem[nome] = { nome: nome.length > 18 ? nome.substring(0,18)+'...' : nome, nomeCompleto: nome, quantidade: 0, valor: 0 }
      contagem[nome].quantidade += i.quantidade
      contagem[nome].valor += i.quantidade * parseFloat(i.valor_unitario)
    })
    // Subtrai devoluções
    devolucoes.forEach(dev => {
      const nome = dev.produtos?.nome || 'Desconhecido'
      const chave = nome.length > 18 ? nome.substring(0,18)+'...' : nome
      if (contagem[chave]) {
        contagem[chave].quantidade -= dev.quantidade
      }
    })
    const ordenado = Object.values(contagem).sort((a, b) => b.quantidade - a.quantidade)
    const top10 = ordenado.slice(0, 10).map(p => ({...p, tipo:'Mais vendido'}))
    const bottom10 = [...ordenado].sort((a, b) => a.quantidade - b.quantidade).slice(0, 10).map(p => ({...p, tipo:'Menos vendido'}))
    return { top10, bottom10 }
  }

  // ── GRÁFICO 3 — Investimento por fornecedor ────────────
  const dadosFornecedor = () => {
    const forns = {}
    investimentos.forEach(inv => {
      const forn = inv.fornecedor || 'Desconhecido'
      if (!forns[forn]) forns[forn] = { fornecedor: forn.length > 15 ? forn.substring(0,15)+'...' : forn, investido: 0, lucroEstimado: 0 }
      forns[forn].investido += parseFloat(inv.valor_total_pago)
      forns[forn].lucroEstimado += parseFloat(inv.lucro_final || 0)
    })
    return Object.values(forns).sort((a, b) => b.investido - a.investido)
  }

  // ── GRÁFICO 4 — Vendas por categoria (valor e qtd) ────
  const dadosCategoria = () => {
    const cats = {}
    itensFiltrados.forEach(i => {
      const cat = i.produtos?.categoria || 'Outros'
      if (!cats[cat]) cats[cat] = { categoria: cat, valor: 0, quantidade: 0 }
      cats[cat].valor += i.quantidade * parseFloat(i.valor_unitario)
      cats[cat].quantidade += i.quantidade
    })
    // Subtrai devoluções por categoria
    devolucoes.forEach(dev => {
      const cat = dev.produtos?.categoria || 'Outros'
      if (cats[cat]) {
        cats[cat].valor -= parseFloat(dev.valor_total || 0)
        cats[cat].quantidade -= dev.quantidade
      }
    })
    return Object.values(cats).sort((a, b) => b.valor - a.valor)
  }

  // ── GRÁFICO 5 — Vendas vs Devoluções ──────────────────
  const dadosVendasDevolucoes = () => {
    const meses = {}
    itensVenda.forEach(i => {
      const venda = vendas.find(v => v.id === i.venda_id)
      if (!venda) return
      const d = new Date(venda.data_venda)
      if (filtroAno && d.getFullYear() !== parseInt(filtroAno)) return
      const chave = `${MESES_NOMES[d.getMonth()]}/${d.getFullYear()}`
      if (!meses[chave]) meses[chave] = { mes: chave, qtdVendida: 0, valorVendido: 0, qtdDevolvida: 0, valorDevolvido: 0 }
      meses[chave].qtdVendida += i.quantidade
      meses[chave].valorVendido += i.quantidade * parseFloat(i.valor_unitario)
    })
    devolucoes.forEach(dev => {
      const d = new Date(dev.criado_em)
      if (filtroAno && d.getFullYear() !== parseInt(filtroAno)) return
      const chave = `${MESES_NOMES[d.getMonth()]}/${d.getFullYear()}`
      if (!meses[chave]) meses[chave] = { mes: chave, qtdVendida: 0, valorVendido: 0, qtdDevolvida: 0, valorDevolvido: 0 }
      meses[chave].qtdDevolvida += dev.quantidade
      meses[chave].valorDevolvido += parseFloat(dev.valor_total || 0)
    })
    return Object.values(meses)
  }

  // Previsão próxima data comemorativa
  const proxData = proximaDataComemorativa()
  const prodsPrevistas = () => {
    const contagem = {}
    itensVenda
      .filter(i => proxData.categorias.includes(i.produtos?.categoria))
      .forEach(i => {
        const nome = i.produtos?.nome || 'Desconhecido'
        if (!contagem[nome]) contagem[nome] = { nome, quantidade: 0, categoria: i.produtos?.categoria }
        contagem[nome].quantidade += i.quantidade
      })
    return Object.values(contagem).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5)
  }

  const produtosAcabando = produtos => produtos?.filter(p => p.estoque <= 3 && p.estoque >= 0).sort((a, b) => a.estoque - b.estoque).slice(0, 5) || []

  const [prods, setProds] = useState([])
  useEffect(() => {
    supabase.from('produtos').select('*').then(({ data }) => { if (data) setProds(data) })
  }, [])

  const previsaoVendas = () => {
    const dados = dadosLinha()
    if (dados.length < 2) return null
    const ultimos = dados.slice(-3)
    const media = ultimos.reduce((acc, m) => acc + m.vendido, 0) / ultimos.length
    return media.toFixed(2)
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

  const card = {background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 4px 20px rgba(0,0,0,0.07)', marginBottom:'20px'}
  const titulo = {fontSize:'15px', fontWeight:'bold', color:'#1a6b5a', marginBottom:'20px', paddingBottom:'12px', borderBottom:'2px solid #f0f0f0', display:'flex', alignItems:'center', gap:'8px'}

  const { top10, bottom10 } = dadosMaisMenos()

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px', marginBottom:'16px'}}>
        <h2>Dashboard BI</h2>
        <div style={{display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center'}}>
          <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} style={{padding:'8px 12px', borderRadius:'8px', border:'1px solid #3B3B3B', fontSize:'13px', background:'white'}}>
            <option value="">Todos os anos</option>
            {anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} style={{padding:'8px 12px', borderRadius:'8px', border:'1px solid #ddd', fontSize:'13px', background:'white'}}>
            <option value="">Todos os meses</option>
            {MESES_NOMES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} style={{padding:'8px 12px', borderRadius:'8px', border:'1px solid #ddd', fontSize:'13px', background:'white'}}>
            <option value="">Todas as categorias</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={() => { setFiltroAno(''); setFiltroMes(''); setFiltroCategoria('') }}
            style={{background:'#eee', color:'#555', border:'none', padding:'8px 14px', borderRadius:'8px', cursor:'pointer', fontSize:'13px'}}
          >
            Limpar
          </button>
          <button onClick={carregarDados} style={{background:'#1a6b5a', color:'white', border:'none', padding:'8px 16px', borderRadius:'8px', cursor:'pointer', fontSize:'13px'}}>
            🔄 Atualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'12px', marginBottom:'20px'}}>
        {[
          { label:'Total Vendido', valor:`R$ ${totalVendido.toFixed(2)}`, cor:'#1a6b5a', icon:'💰' },
          { label:'Total Recebido', valor:`R$ ${totalRecebido.toFixed(2)}`, cor:'#29abe2', icon:'✅' },
          { label:'Ticket Médio', valor:`R$ ${ticketMedio.toFixed(2)}`, cor:'#f5821f', icon:'🎯' },
          { label:'Taxa Inadimplência', valor:`${taxaInad}%`, cor: parseFloat(taxaInad) > 20 ? '#ef4444' : '#10b981', icon:'⚠️' },
          { label:'Total de Vendas', valor:vendasFiltradas.length, cor:'#8b5cf6', icon:'🛒' },
          { label:'Clientes Ativos', valor:clientes.length, cor:'#e91e8c', icon:'👥' },
        ].map((kpi, i) => (
          <div key={i} style={{background:'white', borderRadius:'14px', padding:'16px', boxShadow:'0 4px 16px rgba(0,0,0,0.07)', borderTop:`4px solid ${kpi.cor}`}}>
            <div style={{fontSize:'22px', marginBottom:'4px'}}>{kpi.icon}</div>
            <div style={{fontSize:'12px', color:'#888', marginBottom:'4px'}}>{kpi.label}</div>
            <div style={{fontSize:'18px', fontWeight:'bold', color:kpi.cor}}>{kpi.valor}</div>
          </div>
        ))}
      </div>

      {/* GRÁFICO 1 — Linha de vendas por mês */}
      <div style={card}>
        <div style={titulo}>📈 Vendas por Mês</div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dadosLinha()} margin={{top:10, right:30, left:10, bottom:10}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
            <XAxis dataKey="mes" tick={{fontSize:12}} />
            <YAxis tick={{fontSize:12}} tickFormatter={v => `R$${v}`}/>
            <Tooltip content={<TooltipCustom/>}/>
            <Legend/>
            <Line type="monotone" dataKey="vendido" name="Valor Vendido" stroke="#1a6b5a" strokeWidth={3} dot={{r:5, fill:'#1a6b5a'}} activeDot={{r:8}}>
              <LabelList dataKey="vendido" position="top" formatter={v => `R$${parseFloat(v).toFixed(0)}`} style={{fontSize:'11px', fill:'#1a6b5a', fontWeight:'bold'}}/>
            </Line>
            <Line type="monotone" dataKey="recebido" name="Valor Recebido" stroke="#29abe2" strokeWidth={2} strokeDasharray="5 5" dot={{r:4}}/>
            <Line type="monotone" dataKey="meta" name="Meta R$3.000" stroke="#f5821f" strokeWidth={2} strokeDasharray="8 3" dot={false}/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* GRÁFICO 2 — 10 mais vendidos */}
      <div style={card}>
        <div style={titulo}>🏆 Top 10 Produtos Mais Vendidos</div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={top10} layout="vertical" margin={{top:0, right:80, left:10, bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" horizontal={false}/>
            <XAxis type="number" tick={{fontSize:11}}/>
            <YAxis dataKey="nome" type="category" tick={{fontSize:11}} width={130}/>
            <Tooltip content={<TooltipCustom/>}/>
            <Bar dataKey="quantidade" name="Quantidade" radius={[0,8,8,0]} maxBarSize={28}>
              {top10.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]}/>)}
              <LabelList dataKey="quantidade" position="right" style={{fontSize:'12px', fontWeight:'bold'}}/>
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* GRÁFICO 2b — 10 menos vendidos */}
      <div style={card}>
        <div style={titulo}>📉 Top 10 Produtos Menos Vendidos</div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={bottom10} layout="vertical" margin={{top:0, right:80, left:10, bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" horizontal={false}/>
            <XAxis type="number" tick={{fontSize:11}}/>
            <YAxis dataKey="nome" type="category" tick={{fontSize:11}} width={130}/>
            <Tooltip content={<TooltipCustom/>}/>
            <Bar dataKey="quantidade" name="Quantidade" radius={[0,8,8,0]} maxBarSize={28}>
              {bottom10.map((_, i) => <Cell key={i} fill={['#ef4444','#f97316','#f59e0b','#84cc16','#06b6d4','#8b5cf6','#e91e8c','#10b981','#29abe2','#f5821f'][i % 10]}/>)}
              <LabelList dataKey="quantidade" position="right" style={{fontSize:'12px', fontWeight:'bold'}}/>
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* GRÁFICO 3 — Investimento por fornecedor */}
      <div style={card}>
        <div style={titulo}>🏪 Investimento por Fornecedor</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dadosFornecedor()} margin={{top:10, right:30, left:10, bottom:40}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
            <XAxis dataKey="fornecedor" tick={{fontSize:11}} angle={-25} textAnchor="end" interval={0}/>
            <YAxis tick={{fontSize:11}} tickFormatter={v => `R$${v}`}/>
            <Tooltip content={<TooltipCustom/>}/>
            <Legend/>
            <Bar dataKey="investido" name="Valor Investido" radius={[6,6,0,0]} maxBarSize={50}>
              {dadosFornecedor().map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]}/>)}
              <LabelList dataKey="investido" position="top" formatter={v => `R$${parseFloat(v).toFixed(0)}`} style={{fontSize:'11px', fontWeight:'bold'}}/>
            </Bar>
            <Bar dataKey="lucroEstimado" name="Lucro Estimado" radius={[6,6,0,0]} maxBarSize={50} fill="#10b981"/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* GRÁFICO 4 — Vendas por categoria */}
      <div style={card}>
        <div style={titulo}>📦 Vendas por Categoria — Valor e Quantidade</div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={dadosCategoria()} margin={{top:10, right:30, left:10, bottom:50}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
            <XAxis dataKey="categoria" tick={{fontSize:11}} angle={-30} textAnchor="end" interval={0}/>
            <YAxis yAxisId="valor" orientation="left" tick={{fontSize:11}} tickFormatter={v => `R$${v}`}/>
            <YAxis yAxisId="qtd" orientation="right" tick={{fontSize:11}}/>
            <Tooltip content={<TooltipCustom/>}/>
            <Legend/>
            <Bar yAxisId="valor" dataKey="valor" name="Valor Vendido (R$)" radius={[6,6,0,0]} maxBarSize={40}>
              {dadosCategoria().map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]}/>)}
              <LabelList dataKey="valor" position="top" formatter={v => `R$${parseFloat(v).toFixed(0)}`} style={{fontSize:'10px', fontWeight:'bold'}}/>
            </Bar>
            <Bar yAxisId="qtd" dataKey="quantidade" name="Quantidade" radius={[6,6,0,0]} maxBarSize={40} fill="#29abe2" opacity={0.7}>
              <LabelList dataKey="quantidade" position="top" style={{fontSize:'10px', fontWeight:'bold'}}/>
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* GRÁFICO 5 — Vendas vs Devoluções */}
      <div style={card}>
        <div style={titulo}>🔄 Vendas vs Devoluções por Mês</div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={dadosVendasDevolucoes()} margin={{top:10, right:30, left:10, bottom:10}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
            <XAxis dataKey="mes" tick={{fontSize:11}}/>
            <YAxis yAxisId="valor" orientation="left" tick={{fontSize:11}} tickFormatter={v => `R$${v}`}/>
            <YAxis yAxisId="qtd" orientation="right" tick={{fontSize:11}}/>
            <Tooltip content={<TooltipCustom/>}/>
            <Legend/>
            <Bar yAxisId="valor" dataKey="valorVendido" name="Valor Vendido" fill="#1a6b5a" radius={[6,6,0,0]} maxBarSize={35}>
              <LabelList dataKey="valorVendido" position="top" formatter={v => v > 0 ? `R$${parseFloat(v).toFixed(0)}` : ''} style={{fontSize:'10px', fontWeight:'bold', fill:'#1a6b5a'}}/>
            </Bar>
            <Bar yAxisId="valor" dataKey="valorDevolvido" name="Valor Devolvido" fill="#ef4444" radius={[6,6,0,0]} maxBarSize={35}>
              <LabelList dataKey="valorDevolvido" position="top" formatter={v => v > 0 ? `R$${parseFloat(v).toFixed(0)}` : ''} style={{fontSize:'10px', fontWeight:'bold', fill:'#ef4444'}}/>
            </Bar>
            <Bar yAxisId="qtd" dataKey="qtdVendida" name="Qtd Vendida" fill="#29abe2" radius={[6,6,0,0]} maxBarSize={35} opacity={0.7}/>
            <Bar yAxisId="qtd" dataKey="qtdDevolvida" name="Qtd Devolvida" fill="#f5821f" radius={[6,6,0,0]} maxBarSize={35} opacity={0.7}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* PREVISÕES */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'20px', marginBottom:'20px'}}>

        {/* Previsão de vendas */}
        <div style={{...card, marginBottom:0, borderTop:'4px solid #8b5cf6'}}>
          <div style={titulo}>🔮 Previsão — Próximo Mês</div>
          {previsaoVendas() ? (
            <>
              <div style={{fontSize:'34px', fontWeight:'bold', color:'#8b5cf6', marginBottom:'8px'}}>
                R$ {parseFloat(previsaoVendas()).toFixed(2)}
              </div>
              <p style={{fontSize:'13px', color:'#666', marginBottom:'12px'}}>
                Baseado na média dos últimos meses
              </p>
              <div style={{background: parseFloat(previsaoVendas()) >= 3000 ? '#e8f5e9' : '#fff8e1', padding:'12px', borderRadius:'8px'}}>
                <strong style={{color: parseFloat(previsaoVendas()) >= 3000 ? '#2e7d32' : '#f57f17', fontSize:'13px'}}>
                  {parseFloat(previsaoVendas()) >= 3000 ? '✅ Projeção acima da meta!' : '⚠️ Projeção abaixo da meta de R$ 3.000'}
                </strong>
              </div>
            </>
          ) : (
            <p style={{color:'#aaa'}}>Dados insuficientes para previsão</p>
          )}
        </div>

        {/* Estoque crítico */}
        <div style={{...card, marginBottom:0, borderTop:'4px solid #ef4444'}}>
          <div style={titulo}>📦 Alerta — Estoque Crítico</div>
          {produtosAcabando(prods).length === 0 ? (
            <p style={{color:'#10b981', fontWeight:'bold'}}>✅ Nenhum produto em nível crítico!</p>
          ) : (
            produtosAcabando(prods).map((p, i) => (
              <div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px', background: p.estoque === 0 ? '#ffebee' : '#fff8e1', borderRadius:'8px', marginBottom:'8px', borderLeft:`3px solid ${p.estoque === 0 ? '#ef4444' : '#f5821f'}`}}>
                <div>
                  <strong style={{fontSize:'13px'}}>{p.nome}</strong><br/>
                  <small style={{color:'#666'}}>{p.categoria}</small>
                </div>
                <span style={{fontWeight:'bold', color: p.estoque <= 1 ? '#ef4444' : '#f5821f', fontSize:'18px'}}>
                  {p.estoque} un.
                </span>
              </div>
            ))
          )}
        </div>

        {/* Próxima data comemorativa */}
        <div style={{...card, marginBottom:0, borderTop:'4px solid #e91e8c'}}>
          <div style={titulo}>🎉 {proxData.nome}</div>
          <p style={{fontSize:'12px', color:'#888', marginBottom:'12px'}}>
            Categorias em alta: {proxData.categorias.join(', ')}
          </p>
          {prodsPrevistas().length === 0 ? (
            <p style={{color:'#aaa', fontSize:'13px'}}>Sem histórico para prever</p>
          ) : (
            prodsPrevistas().map((p, i) => (
              <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'8px', background:'#fdf0f8', borderRadius:'8px', marginBottom:'6px', borderLeft:'3px solid #e91e8c'}}>
                <div>
                  <strong style={{fontSize:'13px'}}>{p.nome}</strong><br/>
                  <small style={{color:'#888'}}>{p.categoria}</small>
                </div>
                <span style={{fontWeight:'bold', color:'#e91e8c'}}>{p.quantidade} un.</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default BI