import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import PageHeader from '../components/PageHeader'
import {
  FileText, Calendar, User, X, Plus, Search,
  Loader2, DollarSign, ShoppingCart, BarChart2,
  Users, TrendingUp, TrendingDown, Package,
  ClipboardList, Printer, Wallet
} from 'lucide-react'

const COR = ['#eeeeee', '#f5821f', '#c2185b', '#7b1fa2', '#0288d1', '#388e3c']
const COR_TEXTO = ['#333333', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff']

function fmt(v) {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

function capitalizar(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function mesAtualStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function PeriodoCard({ index, periodo, onChange, vendedores }) {
  const isClaro = index === 0

  function toggleVendedor(nome) {
    const atual = periodo.vendedores || []
    const novos = atual.includes(nome)
      ? atual.filter(v => v !== nome)
      : [...atual, nome]
    onChange('vendedores', novos)
  }

  const selecionados = periodo.vendedores || []
  const disponiveis = vendedores.filter(v => !selecionados.includes(v))

  return (
    <div className="periodo-card" style={{ borderTop: `3px solid ${isClaro ? '#aaaaaa' : COR[index]}` }}>
      <div className="periodo-titulo" style={{ color: isClaro ? '#555' : COR[index] }}>
        <Calendar size={14} strokeWidth={2} />
        Período {index + 1}
      </div>

      <div className="periodo-inputs">
        <div>
          <label>De</label>
          <input type="date" value={periodo.inicio} onChange={e => onChange('inicio', e.target.value)} />
        </div>
        <div>
          <label>Até</label>
          <input type="date" value={periodo.fim} onChange={e => onChange('fim', e.target.value)} />
        </div>
      </div>

      {disponiveis.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>
            Filtrar por vendedor (opcional)
          </label>
          <select
            value=""
            onChange={e => { if (e.target.value) toggleVendedor(e.target.value) }}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #ddd',
              fontSize: 13,
              background: '#fff',
              color: '#333',
            }}
          >
            <option value="">Adicionar vendedor...</option>
            {disponiveis.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      )}

      {selecionados.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {selecionados.map(v => (
            <div
              key={v}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: isClaro ? '#e0e0e0' : COR[index],
                color: isClaro ? '#333' : COR_TEXTO[index],
                borderRadius: 20,
                padding: '3px 10px',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <User size={11} />
              {v}
              <span
                style={{ cursor: 'pointer', opacity: 0.6, fontWeight: 900, display: 'flex', alignItems: 'center' }}
                onClick={() => toggleVendedor(v)}
              >
                <X size={11} />
              </span>
            </div>
          ))}
          {selecionados.length > 1 && (
            <div
              onClick={() => onChange('vendedores', [])}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: '#ffebee',
                color: '#c62828',
                borderRadius: 20,
                padding: '3px 10px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <X size={11} /> Limpar todos
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BarraComparativa({ label, valores, max }) {
  return (
    <div className="barra-row">
      <span className="barra-label">{label}</span>
      <div className="barra-grupo">
        {valores.map((v, i) => {
          const isClaro = i === 0
          return (
            <div key={i} className="barra-item">
              <div className="barra-track">
                <div
                  className="barra-fill"
                  style={{
                    width: max > 0 ? `${(v / max) * 100}%` : '0%',
                    background: isClaro ? '#aaa' : COR[i],
                    minWidth: v > 0 ? '4px' : '0',
                  }}
                />
              </div>
              <span className="barra-valor" style={{ color: isClaro ? '#555' : COR[i] }}>
                {typeof v === 'number' && v % 1 !== 0 ? fmt(v) : v}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Relatorios() {
  const [periodos, setPeriodos] = useState([
    { inicio: '', fim: '', vendedores: [] },
    { inicio: '', fim: '', vendedores: [] },
  ])
  const [vendedores, setVendedores] = useState([])
  const [resultados, setResultados] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  // ---- Recebimento por mês ----
  const [previsaoMeses, setPrevisaoMeses] = useState([])
  const [carregandoPrevisao, setCarregandoPrevisao] = useState(false)
  const [qtdMeses, setQtdMeses] = useState(6)
  const [mesDetalhe, setMesDetalhe] = useState(mesAtualStr())
  const [detalheMes, setDetalheMes] = useState(null)
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false)
  const [erroDetalhe, setErroDetalhe] = useState('')

  useEffect(() => {
    async function carregarVendedores() {
      const { data, error } = await supabase
        .from('vendas')
        .select('vendedor_nome')
      if (!error && data) {
        const unicos = [...new Set(data.map(v => v.vendedor_nome).filter(Boolean))].sort()
        setVendedores(unicos)
      }
    }
    carregarVendedores()
  }, [])

  useEffect(() => {
    buscarDetalheMes(mesAtualStr())
  }, [])

  useEffect(() => {
    carregarPrevisao()
  }, [qtdMeses])

  async function carregarPrevisao() {
    setCarregandoPrevisao(true)
    try {
      const hoje = new Date()
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() + qtdMeses, 0)
      const inicioStr = inicio.toISOString().slice(0, 10)
      const fimStr = fim.toISOString().slice(0, 10)

      const { data, error } = await supabase
        .from('vendas')
        .select('valor_total, data_para_pagar')
        .gte('data_para_pagar', inicioStr)
        .lte('data_para_pagar', fimStr)

      if (!error && data) {
        const mapa = {}
        data.forEach(v => {
          if (!v.data_para_pagar) return
          const chave = v.data_para_pagar.slice(0, 7)
          if (!mapa[chave]) mapa[chave] = { total: 0, qtd: 0 }
          mapa[chave].total += v.valor_total || 0
          mapa[chave].qtd += 1
        })

        const meses = []
        for (let i = 0; i < qtdMeses; i++) {
          const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1)
          const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          meses.push({
            chave,
            label: capitalizar(d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })),
            total: mapa[chave]?.total || 0,
            qtd: mapa[chave]?.qtd || 0,
          })
        }
        setPrevisaoMeses(meses)
      }
    } catch (e) {
      // previsão é um complemento; não bloqueia o restante da tela
    }
    setCarregandoPrevisao(false)
  }

  function selecionarMes(chave) {
    setMesDetalhe(chave)
    buscarDetalheMes(chave)
  }

  async function buscarDetalheMes(mesParam) {
    const mesAlvo = mesParam || mesDetalhe
    if (!mesAlvo) { setErroDetalhe('Selecione um mês.'); return }
    setErroDetalhe('')
    setCarregandoDetalhe(true)

    try {
      const [ano, mes] = mesAlvo.split('-').map(Number)
      const inicio = `${mesAlvo}-01`
      const ultimoDia = new Date(ano, mes, 0).getDate()
      const fim = `${mesAlvo}-${String(ultimoDia).padStart(2, '0')}`

      const { data: vendas } = await supabase
        .from('vendas')
        .select('id, valor_total, data_para_pagar, vendedor_nome')
        .gte('data_para_pagar', inicio)
        .lte('data_para_pagar', fim)

      const totalReceita = vendas?.reduce((acc, v) => acc + (v.valor_total || 0), 0) || 0
      const qtdVendas = vendas?.length || 0
      const ticketMedio = qtdVendas > 0 ? totalReceita / qtdVendas : 0

      const porVendedorMap = {}
      vendas?.forEach(v => {
        const nome = v.vendedor_nome || 'Sem vendedor'
        if (!porVendedorMap[nome]) porVendedorMap[nome] = { nome, total: 0, qtd: 0 }
        porVendedorMap[nome].total += v.valor_total || 0
        porVendedorMap[nome].qtd += 1
      })
      const porVendedor = Object.values(porVendedorMap).sort((a, b) => b.total - a.total)

      const ids = vendas?.map(v => v.id) || []
      let produtosMaisVendidos = []
      if (ids.length > 0) {
        const { data: itens } = await supabase
          .from('itens_venda')
          .select('produto_id, quantidade, valor_unitario, produtos(nome)')
          .in('venda_id', ids)

        const mapaProd = {}
        itens?.forEach(item => {
          const nome = item.produtos?.nome || 'Produto'
          if (!mapaProd[nome]) mapaProd[nome] = { nome, quantidade: 0, receita: 0 }
          mapaProd[nome].quantidade += item.quantidade
          mapaProd[nome].receita += item.quantidade * item.valor_unitario
        })
        produtosMaisVendidos = Object.values(mapaProd)
          .sort((a, b) => b.receita - a.receita)
          .slice(0, 5)
      }

      setDetalheMes({
        totalReceita,
        qtdVendas,
        ticketMedio,
        porVendedor,
        produtosMaisVendidos,
      })
    } catch (e) {
      setErroDetalhe('Erro ao buscar dados: ' + e.message)
    }

    setCarregandoDetalhe(false)
  }
  // ---- fim recebimento por mês ----

  function atualizarPeriodo(i, campo, valor) {
    const copia = [...periodos]
    copia[i] = { ...copia[i], [campo]: valor }
    setPeriodos(copia)
  }

  function adicionarPeriodo() {
    if (periodos.length >= 6) return
    setPeriodos([...periodos, { inicio: '', fim: '', vendedores: [] }])
    setResultados([])
  }

  function removerPeriodo(i) {
    if (periodos.length <= 2) return
    setPeriodos(periodos.filter((_, idx) => idx !== i))
    setResultados([])
  }

  async function buscarDados() {
    const invalidos = periodos.filter(p => !p.inicio || !p.fim)
    if (invalidos.length > 0) { setErro('Preencha todas as datas dos períodos.'); return }
    setErro('')
    setCarregando(true)

    try {
      const dados = await Promise.all(periodos.map(async (p) => {
        let query = supabase
          .from('vendas')
          .select('id, valor_total, data_para_pagar, vendedor_nome')
          .gte('data_para_pagar', p.inicio)
          .lte('data_para_pagar', p.fim)

        if (p.vendedores?.length > 0) {
          query = query.in('vendedor_nome', p.vendedores)
        }

        const { data: vendas } = await query

        const totalReceita = vendas?.reduce((acc, v) => acc + (v.valor_total || 0), 0) || 0
        const qtdVendas = vendas?.length || 0
        const ticketMedio = qtdVendas > 0 ? totalReceita / qtdVendas : 0

        const ids = vendas?.map(v => v.id) || []
        let produtosMaisVendidos = []

        if (ids.length > 0) {
          const { data: itens } = await supabase
            .from('itens_venda')
            .select('produto_id, quantidade, valor_unitario, produtos(nome)')
            .in('venda_id', ids)

          const mapa = {}
          itens?.forEach(item => {
            const nome = item.produtos?.nome || 'Produto'
            if (!mapa[nome]) mapa[nome] = { nome, quantidade: 0, receita: 0 }
            mapa[nome].quantidade += item.quantidade
            mapa[nome].receita += item.quantidade * item.valor_unitario
          })
          produtosMaisVendidos = Object.values(mapa)
            .sort((a, b) => b.receita - a.receita)
            .slice(0, 5)
        }

        return { periodo: p, totalReceita, qtdVendas, ticketMedio, produtosMaisVendidos }
      }))

      setResultados(dados)
    } catch (e) {
      setErro('Erro ao buscar dados: ' + e.message)
    }

    setCarregando(false)
  }

  const todosProdutos = [...new Set(
    resultados.flatMap(r => r.produtosMaisVendidos.map(p => p.nome))
  )]

  const maxReceita = Math.max(...resultados.map(r => r.totalReceita), 1)
  const maxQtd    = Math.max(...resultados.map(r => r.qtdVendas), 1)
  const maxTicket = Math.max(...resultados.map(r => r.ticketMedio), 1)
  const maxProd   = Math.max(
    ...todosProdutos.flatMap(nome =>
      resultados.map(r => r.produtosMaisVendidos.find(p => p.nome === nome)?.receita || 0)
    ), 1
  )

  function labelPeriodo(p, i) {
    const base = p.inicio
      ? (() => {
          const f = d => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
          return `${f(p.inicio)} – ${f(p.fim)}`
        })()
      : `Período ${i + 1}`

    const vends = p.vendedores || []
    if (vends.length === 0) return base
    if (vends.length === 1) return `${base} · ${vends[0]}`
    return `${base} · ${vends.length} vendedores`
  }

  const mesDetalheLabel = capitalizar(
    new Date(mesDetalhe + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  )

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="Relatórios estratégicos e exportação de dados"
        icon={<FileText size={22} color="white" />}
      />

      <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button
          onClick={() => window.print()}
          className="btn-secundario"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Printer size={15} /> Imprimir relatório
        </button>
      </div>

      {/* ======================= SELEÇÃO (topo) ======================= */}

      <div className="card no-print" style={{ marginTop: 16 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={18} color="#1a6b5a" strokeWidth={2} />
          Selecionar Períodos
        </h3>

        <div className="periodos-grid">
          {periodos.map((p, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <PeriodoCard
                index={i}
                periodo={p}
                onChange={(campo, valor) => atualizarPeriodo(i, campo, valor)}
                vendedores={vendedores}
              />
              {periodos.length > 2 && (
                <button
                  onClick={() => removerPeriodo(i)}
                  className="btn-remover-periodo"
                  title="Remover período"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          {periodos.length < 6 && (
            <button onClick={adicionarPeriodo} className="btn-secundario" style={{ flex: 1, minWidth: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Plus size={15} /> Adicionar período
            </button>
          )}
          <button onClick={buscarDados} disabled={carregando} className="btn-primario" style={{ flex: 1, minWidth: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {carregando
              ? <><Loader2 size={15} style={{ animation: 'spin 0.9s linear infinite' }} /> Buscando...</>
              : <><Search size={15} /> Comparar Períodos</>
            }
          </button>
        </div>

        {erro && (
          <div style={{ marginTop: 12, background: '#ffebee', color: '#c62828', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
            {erro}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <Wallet size={18} color="#1a6b5a" strokeWidth={2} />
              Recebimento por Mês
            </h3>
            <p style={{ fontSize: 13, color: '#718096', marginTop: 4, marginBottom: 0 }}>
              Selecione um mês para ver o total já vendido com recebimento previsto nele.
            </p>
          </div>

          <div className="no-print">
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Meses a exibir</label>
            <input
              type="number"
              min={1}
              max={24}
              value={qtdMeses}
              onChange={e => {
                const v = parseInt(e.target.value, 10)
                if (Number.isNaN(v)) return
                setQtdMeses(Math.min(24, Math.max(1, v)))
              }}
              style={{ width: 80, padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }}
            />
          </div>
        </div>

        <div style={{ marginTop: 14 }} />

        {carregandoPrevisao ? (
          <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#718096', fontSize: 13, marginBottom: 14 }}>
            <Loader2 size={15} style={{ animation: 'spin 0.9s linear infinite' }} /> Carregando meses...
          </div>
        ) : (
          <div className="previsao-grid">
            {previsaoMeses.map((m, i) => (
              <div
                key={m.chave}
                className={`previsao-card no-print-hover${mesDetalhe === m.chave ? ' previsao-card-ativo' : ''}`}
                onClick={() => selecionarMes(m.chave)}
              >
                <div className="previsao-mes">{i === 0 ? 'Este mês' : m.label}</div>
                <div className="previsao-valor">{fmt(m.total)}</div>
                <div className="previsao-qtd">{m.qtd} venda{m.qtd === 1 ? '' : 's'}</div>
              </div>
            ))}
          </div>
        )}

        <div className="no-print" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Outro mês</label>
            <input
              type="month"
              value={mesDetalhe}
              onChange={e => setMesDetalhe(e.target.value)}
              style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }}
            />
          </div>
          <button
            onClick={() => buscarDetalheMes()}
            disabled={carregandoDetalhe}
            className="btn-primario"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {carregandoDetalhe
              ? <><Loader2 size={15} style={{ animation: 'spin 0.9s linear infinite' }} /> Buscando...</>
              : <><Search size={15} /> Buscar</>
            }
          </button>
        </div>

        {erroDetalhe && (
          <div style={{ marginTop: 12, background: '#ffebee', color: '#c62828', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
            {erroDetalhe}
          </div>
        )}
      </div>

      {/* ======================= RELATÓRIO (parte inferior) ======================= */}

      {(detalheMes || resultados.length > 0) && (
        <h2 className="relatorio-titulo">Relatório</h2>
      )}

      {detalheMes && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wallet size={18} color="#1a6b5a" strokeWidth={2} />
            Recebimento em {mesDetalheLabel}
          </h3>

          <div className="resumo-grid" style={{ marginTop: 12 }}>
            <div className="resumo-card" style={{ borderTop: '4px solid #1a6b5a' }}>
              <div className="resumo-periodo" style={{ color: '#1a6b5a' }}>{mesDetalheLabel}</div>
              <div className="resumo-item">
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <DollarSign size={13} color="#718096" /> Total a receber
                </span>
                <strong style={{ color: '#1a6b5a' }}>{fmt(detalheMes.totalReceita)}</strong>
              </div>
              <div className="resumo-item">
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <ShoppingCart size={13} color="#718096" /> Qtd. vendas
                </span>
                <strong>{detalheMes.qtdVendas}</strong>
              </div>
              <div className="resumo-item">
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <BarChart2 size={13} color="#718096" /> Ticket médio
                </span>
                <strong>{fmt(detalheMes.ticketMedio)}</strong>
              </div>
            </div>
          </div>

          {detalheMes.porVendedor.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#333', margin: '0 0 10px' }}>
                <Users size={15} color="#1a6b5a" /> Por vendedor
              </h4>
              <div className="tabela-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Vendedor</th>
                      <th>Qtd. vendas</th>
                      <th>Total a receber</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalheMes.porVendedor.map(v => (
                      <tr key={v.nome}>
                        <td>{v.nome}</td>
                        <td>{v.qtd}</td>
                        <td>{fmt(v.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {detalheMes.produtosMaisVendidos.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#333', margin: '0 0 10px' }}>
                <Package size={15} color="#1a6b5a" /> Produtos mais vendidos no mês
              </h4>
              <div className="tabela-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Quantidade</th>
                      <th>Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalheMes.produtosMaisVendidos.map(p => (
                      <tr key={p.nome}>
                        <td>{p.nome}</td>
                        <td>{p.quantidade}</td>
                        <td>{fmt(p.receita)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {resultados.length > 0 && (
        <>
          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={18} color="#1a6b5a" strokeWidth={2} />
              Comparativo de Períodos
            </h3>

            <div className="resumo-grid" style={{ marginTop: 12 }}>
              {resultados.map((r, i) => {
                const isClaro = i === 0
                return (
                  <div key={i} className="resumo-card" style={{ borderTop: `4px solid ${isClaro ? '#aaaaaa' : COR[i]}` }}>
                    <div className="resumo-periodo" style={{ color: isClaro ? '#555' : COR[i] }}>
                      {labelPeriodo(r.periodo, i)}
                    </div>
                    <div className="resumo-item">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <DollarSign size={13} color="#718096" /> Receita total
                      </span>
                      <strong style={{ color: isClaro ? '#333' : COR[i] }}>{fmt(r.totalReceita)}</strong>
                    </div>
                    <div className="resumo-item">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <ShoppingCart size={13} color="#718096" /> Qtd. vendas
                      </span>
                      <strong>{r.qtdVendas}</strong>
                    </div>
                    <div className="resumo-item">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <BarChart2 size={13} color="#718096" /> Ticket médio
                      </span>
                      <strong>{fmt(r.ticketMedio)}</strong>
                    </div>
                    {r.periodo.vendedores?.length > 0 && (
                      <div className="resumo-item" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #eee' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Users size={13} color="#718096" /> Vendedores
                        </span>
                        <strong style={{ color: isClaro ? '#333' : COR[i], textAlign: 'right', maxWidth: '60%' }}>
                          {r.periodo.vendedores.length === 1
                            ? r.periodo.vendedores[0]
                            : r.periodo.vendedores.join(', ')}
                        </strong>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="legenda">
              {resultados.map((r, i) => {
                const isClaro = i === 0
                return (
                  <div key={i} className="legenda-item">
                    <span
                      className="legenda-dot"
                      style={{
                        background: isClaro ? '#aaa' : COR[i],
                        border: isClaro ? '1px solid #999' : 'none',
                      }}
                    />
                    <span>{labelPeriodo(r.periodo, i)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarSign size={18} color="#1a6b5a" strokeWidth={2} />
              Comparativo de Receita
            </h3>
            <BarraComparativa label="Receita total"  valores={resultados.map(r => r.totalReceita)} max={maxReceita} />
            <BarraComparativa label="Qtd. de vendas" valores={resultados.map(r => r.qtdVendas)}    max={maxQtd} />
            <BarraComparativa label="Ticket médio"   valores={resultados.map(r => r.ticketMedio)}  max={maxTicket} />
          </div>

          {todosProdutos.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Package size={18} color="#1a6b5a" strokeWidth={2} />
                Produtos Mais Vendidos
              </h3>
              {todosProdutos.map(nome => (
                <BarraComparativa
                  key={nome}
                  label={nome}
                  valores={resultados.map(r => r.produtosMaisVendidos.find(p => p.nome === nome)?.receita || 0)}
                  max={maxProd}
                />
              ))}
            </div>
          )}

          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClipboardList size={18} color="#1a6b5a" strokeWidth={2} />
              Tabela Comparativa
            </h3>
            <div className="tabela-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Métrica</th>
                    {resultados.map((r, i) => (
                      <th key={i} style={{ color: i === 0 ? '#eeeeee' : COR[i] }}>
                        {labelPeriodo(r.periodo, i)}
                      </th>
                    ))}
                    {resultados.length === 2 && <th>Variação</th>}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Receita Total', key: 'totalReceita', fmtFn: fmt },
                    { label: 'Qtd. Vendas',   key: 'qtdVendas',   fmtFn: v => v },
                    { label: 'Ticket Médio',  key: 'ticketMedio', fmtFn: fmt },
                  ].map(({ label, key, fmtFn }) => {
                    const vals = resultados.map(r => r[key])
                    const variacao = resultados.length === 2 && vals[0] > 0
                      ? (((vals[1] - vals[0]) / vals[0]) * 100).toFixed(1)
                      : null
                    return (
                      <tr key={key}>
                        <td><strong>{label}</strong></td>
                        {vals.map((v, i) => <td key={i}>{fmtFn(v)}</td>)}
                        {variacao !== null && (
                          <td>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              color: variacao >= 0 ? '#2e7d32' : '#c62828',
                              fontWeight: 700,
                              background: variacao >= 0 ? '#e8f5e9' : '#ffebee',
                              padding: '3px 10px', borderRadius: 20, fontSize: 13
                            }}>
                              {variacao >= 0
                                ? <TrendingUp size={13} />
                                : <TrendingDown size={13} />
                              }
                              {Math.abs(variacao)}%
                            </span>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }

        .relatorio-titulo {
          margin: 28px 0 -4px;
          font-size: 15px;
          font-weight: 700;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .previsao-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 10px;
        }
        .previsao-card {
          background: #f7f9f8;
          border: 1px solid #e2e8e6;
          border-radius: 10px;
          padding: 12px 14px;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }
        .previsao-card:hover { border-color: #1a6b5a; background: #eef6f3; }
        .previsao-card-ativo { border-color: #1a6b5a; background: #e6f2ee; }
        .previsao-mes { font-size: 12px; color: #718096; margin-bottom: 4px; }
        .previsao-valor { font-size: 17px; font-weight: 700; color: #1a6b5a; }
        .previsao-qtd { font-size: 12px; color: #999; margin-top: 2px; }

        @media print {
          .no-print { display: none !important; }
          .relatorio-titulo { display: none !important; }
          .card { box-shadow: none !important; border: 1px solid #ddd; break-inside: avoid; }
          .previsao-card { cursor: default; break-inside: avoid; }
          .previsao-grid { break-inside: avoid; }
        }
      `}</style>
    </div>
  )
}
