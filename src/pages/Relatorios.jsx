import { useState } from 'react'
import { supabase } from '../supabase'
import PageHeader from '../components/PageHeader'
import {ShoppingCart, ClipboardList, RotateCcw, Package, TrendingUp, Boxes, Users, DollarSign, History, BarChart3, FileText} from 'lucide-react'

const COR = ['#1a6b5a', '#f5821f', '#c2185b', '#7b1fa2', '#0288d1', '#388e3c']

function fmt(v) {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

function PeriodoCard({ index, periodo, onChange }) {
  return (
    <div className="periodo-card" style={{ borderTop: `3px solid ${COR[index]}` }}>
      <div className="periodo-titulo" style={{ color: COR[index] }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
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
    </div>
  )
}

function BarraComparativa({ label, valores, max, cores }) {
  return (
    <div className="barra-row">
      <span className="barra-label">{label}</span>
      <div className="barra-grupo">
        {valores.map((v, i) => (
          <div key={i} className="barra-item">
            <div className="barra-track">
              <div
                className="barra-fill"
                style={{
                  width: max > 0 ? `${(v / max) * 100}%` : '0%',
                  background: cores[i],
                  minWidth: v > 0 ? '4px' : '0'
                }}
              />
            </div>
            <span className="barra-valor" style={{ color: cores[i] }}>{fmt(v)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Relatorios() {
  const [periodos, setPeriodos] = useState([
    { inicio: '', fim: '' },
    { inicio: '', fim: '' },
  ])
  const [resultados, setResultados] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  function atualizarPeriodo(i, campo, valor) {
    const copia = [...periodos]
    copia[i] = { ...copia[i], [campo]: valor }
    setPeriodos(copia)
  }

  function adicionarPeriodo() {
    if (periodos.length >= 4) return
    setPeriodos([...periodos, { inicio: '', fim: '' }])
    setResultados([])
  }

  function removerPeriodo(i) {
    if (periodos.length <= 2) return
    const copia = periodos.filter((_, idx) => idx !== i)
    setPeriodos(copia)
    setResultados([])
  }

  async function buscarDados() {
    const invalidos = periodos.filter(p => !p.inicio || !p.fim)
    if (invalidos.length > 0) { setErro('Preencha todas as datas dos períodos.'); return }
    setErro('')
    setCarregando(true)

    try {
      const dados = await Promise.all(periodos.map(async (p) => {
        // Busca vendas do período
        const { data: vendas } = await supabase
          .from('vendas')
          .select('id, valor_total, data_para_pagar')
          .gte('data_para_pagar', p.inicio)
          .lte('data_para_pagar', p.fim)

        const totalReceita = vendas?.reduce((acc, v) => acc + (v.valor_total || 0), 0) || 0
        const qtdVendas = vendas?.length || 0
        const ticketMedio = qtdVendas > 0 ? totalReceita / qtdVendas : 0

        // Busca itens das vendas desse período para produtos mais vendidos
        const ids = vendas?.map(v => v.id) || []
        let produtosMaisVendidos = []

        if (ids.length > 0) {
          const { data: itens } = await supabase
            .from('itens_venda')
            .select('produto_id, quantidade, valor_unitario, produtos(nome)')
            .in('venda_id', ids)

          // Agrupa por produto
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

        return {
          periodo: p,
          totalReceita,
          qtdVendas,
          ticketMedio,
          produtosMaisVendidos,
        }
      }))

      setResultados(dados)
    } catch (e) {
      setErro('Erro ao buscar dados: ' + e.message)
    }

    setCarregando(false)
  }

  // Monta lista unificada de produtos para comparar entre períodos
  const todosProdutos = [...new Set(
    resultados.flatMap(r => r.produtosMaisVendidos.map(p => p.nome))
  )]

  const maxReceita = Math.max(...resultados.map(r => r.totalReceita), 1)
  const maxQtd = Math.max(...resultados.map(r => r.qtdVendas), 1)
  const maxTicket = Math.max(...resultados.map(r => r.ticketMedio), 1)
  const maxProd = Math.max(
    ...todosProdutos.flatMap(nome =>
      resultados.map(r => r.produtosMaisVendidos.find(p => p.nome === nome)?.receita || 0)
    ), 1
  )

  function labelPeriodo(p, i) {
    if (!p.inicio) return `Período ${i + 1}`
    const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    return `${fmt(p.inicio)} – ${fmt(p.fim)}`
  }

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="Relatórios estratégicos e exportação de dados"
        icon={<FileText size={22} color="white" />}
      />

      {/* CONFIGURAÇÃO DOS PERÍODOS */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a6b5a" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Selecionar Períodos
        </h3>

        <div className="periodos-grid">
          {periodos.map((p, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <PeriodoCard index={i} periodo={p} onChange={(campo, valor) => atualizarPeriodo(i, campo, valor)} />
              {periodos.length > 2 && (
                <button
                  onClick={() => removerPeriodo(i)}
                  className="btn-remover-periodo"
                  title="Remover período"
                >×</button>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          {periodos.length < 4 && (
            <button onClick={adicionarPeriodo} className="btn-secundario" style={{ flex: 1, minWidth: 140 }}>
              + Adicionar período
            </button>
          )}
          <button onClick={buscarDados} disabled={carregando} className="btn-primario" style={{ flex: 1, minWidth: 180 }}>
            {carregando ? '⏳ Buscando...' : '🔍 Comparar Períodos'}
          </button>
        </div>

        {erro && (
          <div style={{ marginTop: 12, background: '#ffebee', color: '#c62828', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
            {erro}
          </div>
        )}
      </div>

      {/* RESULTADOS */}
      {resultados.length > 0 && (
        <>
          {/* CARDS RESUMO */}
          <div className="resumo-grid" style={{ marginTop: 20 }}>
            {resultados.map((r, i) => (
              <div key={i} className="resumo-card" style={{ borderTop: `4px solid ${COR[i]}` }}>
                <div className="resumo-periodo" style={{ color: COR[i] }}>
                  {labelPeriodo(r.periodo, i)}
                </div>
                <div className="resumo-item">
                  <span>💰 Receita total</span>
                  <strong style={{ color: COR[i] }}>{fmt(r.totalReceita)}</strong>
                </div>
                <div className="resumo-item">
                  <span>🛒 Qtd. vendas</span>
                  <strong>{r.qtdVendas}</strong>
                </div>
                <div className="resumo-item">
                  <span>📊 Ticket médio</span>
                  <strong>{fmt(r.ticketMedio)}</strong>
                </div>
              </div>
            ))}
          </div>

          {/* LEGENDA */}
          <div className="legenda">
            {resultados.map((r, i) => (
              <div key={i} className="legenda-item">
                <span className="legenda-dot" style={{ background: COR[i] }} />
                <span>{labelPeriodo(r.periodo, i)}</span>
              </div>
            ))}
          </div>

          {/* COMPARATIVO RECEITA */}
          <div className="card" style={{ marginTop: 16 }}>
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a6b5a" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              Comparativo de Receita
            </h3>
            <BarraComparativa
              label="Receita total"
              valores={resultados.map(r => r.totalReceita)}
              max={maxReceita}
              cores={COR}
            />
            <BarraComparativa
              label="Qtd. de vendas"
              valores={resultados.map(r => r.qtdVendas)}
              max={maxQtd}
              cores={COR}
            />
            <BarraComparativa
              label="Ticket médio"
              valores={resultados.map(r => r.ticketMedio)}
              max={maxTicket}
              cores={COR}
            />
          </div>

          {/* PRODUTOS MAIS VENDIDOS */}
          {todosProdutos.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a6b5a" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
                Produtos Mais Vendidos
              </h3>
              {todosProdutos.map(nome => (
                <BarraComparativa
                  key={nome}
                  label={nome}
                  valores={resultados.map(r => r.produtosMaisVendidos.find(p => p.nome === nome)?.receita || 0)}
                  max={maxProd}
                  cores={COR}
                />
              ))}
            </div>
          )}

          {/* TABELA DETALHADA */}
          <div className="card" style={{ marginTop: 16 }}>
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a6b5a" strokeWidth="2">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              Tabela Comparativa
            </h3>
            <div className="tabela-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Métrica</th>
                    {resultados.map((r, i) => (
                      <th key={i} style={{ color: COR[i] }}>{labelPeriodo(r.periodo, i)}</th>
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
                              color: variacao >= 0 ? '#2e7d32' : '#c62828',
                              fontWeight: 700,
                              background: variacao >= 0 ? '#e8f5e9' : '#ffebee',
                              padding: '3px 10px', borderRadius: 20, fontSize: 13
                            }}>
                              {variacao >= 0 ? '▲' : '▼'} {Math.abs(variacao)}%
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
    </div>
  )
}