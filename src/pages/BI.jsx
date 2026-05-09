import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

// Cores modernas da marca
const CORES = ['#1a6b5a', '#f5821f', '#29abe2', '#e91e8c', '#8b5cf6', '#f7c948', '#10b981', '#ef4444']

// Datas comemorativas para previsões
const DATAS_COMEMORATIVAS = [
  { mes: 1, nome: 'Ano Novo', categorias: ['Decoração', 'Perfumaria'] },
  { mes: 2, nome: 'Dia dos Namorados (prévia)', categorias: ['Perfumaria', 'Decoração'] },
  { mes: 3, nome: 'Volta às Aulas', categorias: ['Escolar', 'Utilidade'] },
  { mes: 4, nome: 'Páscoa', categorias: ['Decoração', 'Infantil'] },
  { mes: 5, nome: 'Dia das Mães', categorias: ['Perfumaria', 'Cama / Mesa / Banho', 'Decoração'] },
  { mes: 6, nome: 'Dia dos Namorados', categorias: ['Perfumaria', 'Decoração'] },
  { mes: 7, nome: 'Férias Escolares', categorias: ['Infantil', 'Escolar'] },
  { mes: 8, nome: 'Dia dos Pais', categorias: ['Utilidade', 'Cozinha'] },
  { mes: 10, nome: 'Dia das Crianças', categorias: ['Infantil', 'Escolar'] },
  { mes: 11, nome: 'Black Friday', categorias: ['Cama / Mesa / Banho', 'Cozinha', 'Decoração'] },
  { mes: 12, nome: 'Natal', categorias: ['Decoração', 'Perfumaria', 'Infantil', 'Cozinha'] },
]

function BI() {
  const [vendas, setVendas] = useState([])
  const [itensVenda, setItensVenda] = useState([])
  const [produtos, setProdutos] = useState([])
  const [clientes, setClientes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtroMes, setFiltroMes] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    setCarregando(true)
    const [v, iv, p, c] = await Promise.all([
      supabase.from('vendas').select('*, clientes(nome)').order('data_venda'),
      supabase.from('itens_venda').select('*, produtos(nome, categoria, preco_venda)'),
      supabase.from('produtos').select('*'),
      supabase.from('clientes').select('*, vendas(valor_total, situacao, data_venda)')
    ])
    if (v.data) setVendas(v.data)
    if (iv.data) setItensVenda(iv.data)
    if (p.data) setProdutos(p.data)
    if (c.data) setClientes(c.data)
    setCarregando(false)
  }

  // ── DADOS PROCESSADOS ──────────────────────────────────

  // Vendas por mês
  const vendasPorMes = () => {
    const meses = {}
    vendas.forEach(v => {
      const d = new Date(v.data_venda)
      const chave = `${d.getMonth() + 1}/${d.getFullYear()}`
      const nomeMes = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      if (!meses[chave]) meses[chave] = { mes: nomeMes, vendas: 0, meta: 3000, recebido: 0 }
      meses[chave].vendas += parseFloat(v.valor_total)
      meses[chave].recebido += parseFloat(v.recebido || 0)
    })
    return Object.values(meses)
  }

  // Produtos mais vendidos
  const produtosMaisVendidos = () => {
    const contagem = {}
    let dados = itensVenda
    if (filtroCategoria) dados = dados.filter(i => i.produtos?.categoria === filtroCategoria)
    dados.forEach(i => {
      const nome = i.produtos?.nome || 'Desconhecido'
      if (!contagem[nome]) contagem[nome] = { nome, quantidade: 0, faturamento: 0 }
      contagem[nome].quantidade += i.quantidade
      contagem[nome].faturamento += i.quantidade * parseFloat(i.valor_unitario)
    })
    return Object.values(contagem).sort((a, b) => b.quantidade - a.quantidade).slice(0, 8)
  }

  // Vendas por categoria
  const vendasPorCategoria = () => {
    const cats = {}
    itensVenda.forEach(i => {
      const cat = i.produtos?.categoria || 'Outros'
      if (!cats[cat]) cats[cat] = { categoria: cat, valor: 0, quantidade: 0 }
      cats[cat].valor += i.quantidade * parseFloat(i.valor_unitario)
      cats[cat].quantidade += i.quantidade
    })
    return Object.values(cats).sort((a, b) => b.valor - a.valor)
  }

  // Top clientes
  const topClientes = () => {
    return clientes.map(c => {
      const vendasCliente = c.vendas || []
      const totalComprado = vendasCliente.reduce((acc, v) => acc + parseFloat(v.valor_total || 0), 0)
      const emAtraso = vendasCliente.filter(v => {
        if (parseFloat(v.recebido || 0) >= parseFloat(v.valor_total)) return false
        return v.situacao === 'Atrasado'
      }).length
      return { nome: c.nome, totalComprado, emAtraso, qtdCompras: vendasCliente.length }
    }).sort((a, b) => b.totalComprado - a.totalComprado).slice(0, 6)
  }

  // Inadimplência
  const inadimplencia = () => {
    const pago = vendas.filter(v => parseFloat(v.recebido || 0) >= parseFloat(v.valor_total)).length
    const atrasado = vendas.filter(v => {
      if (parseFloat(v.recebido || 0) >= parseFloat(v.valor_total)) return false
      const hoje = new Date(); hoje.setHours(0,0,0,0)
      const venc = new Date(v.data_para_pagar + 'T12:00:00')
      return hoje > venc
    }).length
    const pendente = vendas.length - pago - atrasado
    return [
      { name: 'Pago', value: pago, cor: '#1a6b5a' },
      { name: 'Pendente', value: pendente, cor: '#f5821f' },
      { name: 'Atrasado', value: atrasado, cor: '#ef4444' }
    ]
  }

  // ── PREVISÕES ──────────────────────────────────────────

  // Previsão de vendas próximo mês (média dos últimos 3 meses)
  const previsaoVendas = () => {
    const dados = vendasPorMes()
    if (dados.length < 2) return null
    const ultimos = dados.slice(-3)
    const media = ultimos.reduce((acc, m) => acc + m.vendas, 0) / ultimos.length
    const tendencia = dados.length > 1
      ? ((dados[dados.length-1].vendas - dados[0].vendas) / dados.length) * 0.3
      : 0
    return (media + tendencia).toFixed(2)
  }

  // Produtos com risco de acabar (estoque < 3)
  const produtosAcabando = () => {
    return produtos.filter(p => p.estoque <= 3 && p.estoque > 0)
      .sort((a, b) => a.estoque - b.estoque)
      .slice(0, 5)
  }

  // Previsão por data comemorativa
  const previsaoDatasComemorativas = () => {
    const hoje = new Date()
    const mesAtual = hoje.getMonth() + 1
    const proximaData = DATAS_COMEMORATIVAS.find(d => d.mes >= mesAtual) || DATAS_COMEMORATIVAS[0]
    const categorias = proximaData.categorias

    const produtosPrevistas = itensVenda
      .filter(i => categorias.includes(i.produtos?.categoria))
      .reduce((acc, i) => {
        const nome = i.produtos?.nome || 'Desconhecido'
        if (!acc[nome]) acc[nome] = { nome, quantidade: 0, categoria: i.produtos?.categoria }
        acc[nome].quantidade += i.quantidade
        return acc
      }, {})

    return {
      data: proximaData,
      produtos: Object.values(produtosPrevistas).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5)
    }
  }

  // ── CARDS DE KPI ──────────────────────────────────────
  const totalVendido = vendas.reduce((acc, v) => acc + parseFloat(v.valor_total), 0)
  const totalRecebido = vendas.reduce((acc, v) => acc + parseFloat(v.recebido || 0), 0)
  const ticketMedio = vendas.length > 0 ? totalVendido / vendas.length : 0
  const taxaInad = vendas.length > 0 ? (inadimplencia().find(i => i.name === 'Atrasado')?.value / vendas.length * 100).toFixed(1) : 0

  const previsao = previsaoVendas()
  const acabando = produtosAcabando()
  const { data: proxData, produtos: prodsPrevistas } = previsaoDatasComemorativas()

  const categorias = [...new Set(itensVenda.map(i => i.produtos?.categoria).filter(Boolean))].sort()

  if (carregando) {
    return (
      <div style={{display:'flex', alignItems:'center', justifyContent:'center', minHeight:'300px', flexDirection:'column', gap:'16px'}}>
        <div style={{width:'48px', height:'48px', border:'4px solid #eee', borderTop:'4px solid #1a6b5a', borderRadius:'50%', animation:'spin 1s linear infinite'}}/>
        <p style={{color:'#666'}}>Carregando dados...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const cardStyle = {background:'white', borderRadius:'16px', padding:'20px', boxShadow:'0 4px 16px rgba(0,0,0,0.08)'}
  const tituloGrafico = {fontSize:'15px', fontWeight:'bold', color:'#1a6b5a', marginBottom:'16px', display:'flex', alignItems:'center', gap:'8px'}

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px', marginBottom:'8px'}}>
        <h2>Dashboard BI</h2>
        <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
          <select
            value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value)}
            style={{padding:'8px 12px', borderRadius:'8px', border:'1px solid #ddd', fontSize:'13px', background:'white'}}
          >
            <option value="">Todas as categorias</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={carregarDados} style={{background:'#1a6b5a', color:'white', border:'none', padding:'8px 16px', borderRadius:'8px', cursor:'pointer', fontSize:'13px'}}>
            🔄 Atualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:'12px', marginBottom:'20px'}}>
        {[
          { label:'Total Vendido', valor:`R$ ${totalVendido.toFixed(2)}`, cor:'#1a6b5a', icon:'💰' },
          { label:'Total Recebido', valor:`R$ ${totalRecebido.toFixed(2)}`, cor:'#29abe2', icon:'✅' },
          { label:'Ticket Médio', valor:`R$ ${ticketMedio.toFixed(2)}`, cor:'#f5821f', icon:'🎯' },
          { label:'Taxa Inadimplência', valor:`${taxaInad}%`, cor: parseFloat(taxaInad) > 20 ? '#ef4444' : '#10b981', icon:'⚠️' },
          { label:'Total de Vendas', valor:vendas.length, cor:'#8b5cf6', icon:'🛒' },
          { label:'Clientes Ativos', valor:clientes.length, cor:'#e91e8c', icon:'👥' },
        ].map((kpi, i) => (
          <div key={i} style={{...cardStyle, borderTop:`4px solid ${kpi.cor}`}}>
            <div style={{fontSize:'24px', marginBottom:'4px'}}>{kpi.icon}</div>
            <div style={{fontSize:'13px', color:'#888', marginBottom:'4px'}}>{kpi.label}</div>
            <div style={{fontSize:'20px', fontWeight:'bold', color:kpi.cor}}>{kpi.valor}</div>
          </div>
        ))}
      </div>

      {/* GRÁFICO 1 — Vendas por mês (Area) */}
      <div style={{...cardStyle, marginBottom:'20px'}}>
        <div style={tituloGrafico}>📈 Evolução de Vendas por Mês</div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={vendasPorMes()} margin={{top:10, right:20, left:0, bottom:0}}>
            <defs>
              <linearGradient id="gradVendas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1a6b5a" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#1a6b5a" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="gradMeta" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f5821f" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#f5821f" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
            <XAxis dataKey="mes" tick={{fontSize:12}}/>
            <YAxis tick={{fontSize:12}} tickFormatter={v => `R$${v}`}/>
            <Tooltip formatter={(v, n) => [`R$ ${parseFloat(v).toFixed(2)}`, n === 'vendas' ? 'Vendas' : n === 'meta' ? 'Meta' : 'Recebido']}/>
            <Legend/>
            <Area type="monotone" dataKey="vendas" stroke="#1a6b5a" strokeWidth={2} fill="url(#gradVendas)" name="Vendas"/>
            <Area type="monotone" dataKey="meta" stroke="#f5821f" strokeWidth={2} strokeDasharray="5 5" fill="url(#gradMeta)" name="Meta R$ 3.000"/>
            <Area type="monotone" dataKey="recebido" stroke="#29abe2" strokeWidth={2} fill="none" name="Recebido"/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* GRÁFICO 2 e 3 — lado a lado */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'20px', marginBottom:'20px'}}>

        {/* Produtos mais vendidos (Bar horizontal) */}
        <div style={cardStyle}>
          <div style={tituloGrafico}>🏆 Produtos Mais Vendidos {filtroCategoria && `— ${filtroCategoria}`}</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={produtosMaisVendidos()} layout="vertical" margin={{top:0, right:20, left:0, bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis type="number" tick={{fontSize:11}}/>
              <YAxis dataKey="nome" type="category" tick={{fontSize:11}} width={100}/>
              <Tooltip formatter={(v, n) => [v, n === 'quantidade' ? 'Unidades' : 'Faturamento R$']}/>
              <Legend/>
              <Bar dataKey="quantidade" fill="#1a6b5a" name="Unidades" radius={[0,6,6,0]}>
                {produtosMaisVendidos().map((_, i) => (
                  <Cell key={i} fill={CORES[i % CORES.length]}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Vendas por categoria (Pie) */}
        <div style={cardStyle}>
          <div style={tituloGrafico}>🥧 Faturamento por Categoria</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={vendasPorCategoria()}
                dataKey="valor"
                nameKey="categoria"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={50}
                paddingAngle={3}
                label={({categoria, percent}) => `${categoria.split('/')[0].trim()} ${(percent*100).toFixed(0)}%`}
                labelLine={false}
              >
                {vendasPorCategoria().map((_, i) => (
                  <Cell key={i} fill={CORES[i % CORES.length]}/>
                ))}
              </Pie>
              <Tooltip formatter={(v) => `R$ ${parseFloat(v).toFixed(2)}`}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRÁFICO 4 — Top Clientes (Bar) */}
      <div style={{...cardStyle, marginBottom:'20px'}}>
        <div style={tituloGrafico}>👥 Top Clientes por Volume de Compras</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={topClientes()} margin={{top:10, right:20, left:0, bottom:40}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
            <XAxis dataKey="nome" tick={{fontSize:11}} angle={-30} textAnchor="end" interval={0}/>
            <YAxis tick={{fontSize:11}} tickFormatter={v => `R$${v}`}/>
            <Tooltip formatter={(v, n) => [`R$ ${parseFloat(v).toFixed(2)}`, 'Total Comprado']}/>
            <Bar dataKey="totalComprado" name="Total Comprado" radius={[6,6,0,0]}>
              {topClientes().map((_, i) => (
                <Cell key={i} fill={CORES[i % CORES.length]}/>
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* GRÁFICO 5 — Radar de categorias */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'20px', marginBottom:'20px'}}>
        <div style={cardStyle}>
          <div style={tituloGrafico}>🕸️ Performance por Categoria</div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={vendasPorCategoria().slice(0,7)}>
              <PolarGrid stroke="#eee"/>
              <PolarAngleAxis dataKey="categoria" tick={{fontSize:11}}/>
              <Radar name="Faturamento" dataKey="valor" stroke="#1a6b5a" fill="#1a6b5a" fillOpacity={0.3} strokeWidth={2}/>
              <Radar name="Quantidade" dataKey="quantidade" stroke="#f5821f" fill="#f5821f" fillOpacity={0.2} strokeWidth={2}/>
              <Legend/>
              <Tooltip formatter={(v, n) => [n === 'Faturamento' ? `R$ ${parseFloat(v).toFixed(2)}` : `${v} un.`, n]}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Inadimplência */}
        <div style={cardStyle}>
          <div style={tituloGrafico}>💳 Status de Pagamentos</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={inadimplencia()} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name, value}) => `${name}: ${value}`}>
                {inadimplencia().map((item, i) => (
                  <Cell key={i} fill={item.cor}/>
                ))}
              </Pie>
              <Tooltip/>
              <Legend/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginTop:'12px'}}>
            {inadimplencia().map((item, i) => (
              <div key={i} style={{textAlign:'center', padding:'8px', borderRadius:'8px', background:`${item.cor}15`}}>
                <div style={{fontSize:'20px', fontWeight:'bold', color:item.cor}}>{item.value}</div>
                <div style={{fontSize:'11px', color:'#666'}}>{item.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PREVISÕES */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'20px', marginBottom:'20px'}}>

        {/* Previsão de vendas */}
        <div style={{...cardStyle, borderTop:'4px solid #8b5cf6'}}>
          <div style={tituloGrafico}>🔮 Previsão — Próximo Mês</div>
          {previsao ? (
            <>
              <div style={{fontSize:'36px', fontWeight:'bold', color:'#8b5cf6', marginBottom:'8px'}}>
                R$ {parseFloat(previsao).toFixed(2)}
              </div>
              <p style={{fontSize:'13px', color:'#666', marginBottom:'12px'}}>
                Baseado na média dos últimos meses com análise de tendência
              </p>
              <div style={{background: parseFloat(previsao) >= 3000 ? '#e8f5e9' : '#fff8e1', padding:'12px', borderRadius:'8px'}}>
                <strong style={{color: parseFloat(previsao) >= 3000 ? '#2e7d32' : '#f57f17', fontSize:'13px'}}>
                  {parseFloat(previsao) >= 3000 ? '✅ Projeção acima da meta!' : '⚠️ Projeção abaixo da meta de R$ 3.000'}
                </strong>
              </div>
            </>
          ) : (
            <p style={{color:'#aaa'}}>Dados insuficientes para previsão</p>
          )}
        </div>

        {/* Produtos acabando */}
        <div style={{...cardStyle, borderTop:'4px solid #ef4444'}}>
          <div style={tituloGrafico}>📦 Alerta — Estoque Crítico</div>
          {acabando.length === 0 ? (
            <p style={{color:'#10b981', fontWeight:'bold'}}>✅ Nenhum produto em nível crítico!</p>
          ) : (
            acabando.map((p, i) => (
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

        {/* Previsão data comemorativa */}
        <div style={{...cardStyle, borderTop:'4px solid #e91e8c'}}>
          <div style={tituloGrafico}>🎉 Próxima Data — {proxData.nome}</div>
          <p style={{fontSize:'12px', color:'#888', marginBottom:'12px'}}>
            Categorias em alta: {proxData.categorias.join(', ')}
          </p>
          {prodsPrevistas.length === 0 ? (
            <p style={{color:'#aaa', fontSize:'13px'}}>Sem histórico para prever</p>
          ) : (
            prodsPrevistas.map((p, i) => (
              <div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px', background:'#fdf0f8', borderRadius:'8px', marginBottom:'6px', borderLeft:'3px solid #e91e8c'}}>
                <div>
                  <strong style={{fontSize:'13px'}}>{p.nome}</strong><br/>
                  <small style={{color:'#888'}}>{p.categoria}</small>
                </div>
                <span style={{fontWeight:'bold', color:'#e91e8c'}}>{p.quantidade} vendidos</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default BI