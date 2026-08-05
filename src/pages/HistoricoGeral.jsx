import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import html2canvas from 'html2canvas'
import PageHeader from '../components/PageHeader'
import { History, Filter, Printer, Share2, X, ChevronRight } from 'lucide-react'
import { NOMES_POR_EMAIL } from '../utils/logMovimentacao'

const TELAS = ['Vendas', 'Estoque', 'Clientes', 'Devoluções', 'Encomendas', 'Fornecedores', 'Capital', 'Investimentos', 'Retiradas']
const TIPOS = ['Criação', 'Edição', 'Exclusão', 'Pagamento']

// Formata um valor de qualquer tipo para exibição amigável
function formatarValor(valor) {
  if (valor === null || valor === undefined) return '—'
  if (typeof valor === 'number') {
    // Heurística simples: se parece valor monetário, formata como R$
    return Number.isInteger(valor) ? valor : valor.toFixed(2)
  }
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não'
  if (Array.isArray(valor)) return valor
  return String(valor)
}

// Renderiza o campo "dados" (JSON) de forma legível, tratando arrays de itens especialmente
function DetalhesDados({ dados }) {
  if (!dados || typeof dados !== 'object') {
    return <p style={{ fontSize: '13px', color: '#999' }}>Sem dados adicionais registrados.</p>
  }

  const entradas = Object.entries(dados)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {entradas.map(([chave, valor]) => {
        // Caso especial: array de itens (ex: itens da venda)
        if (Array.isArray(valor) && valor.length > 0 && typeof valor[0] === 'object') {
          return (
            <div key={chave}>
              <strong style={{ fontSize: '12px', color: '#1a6b5a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {chave}
              </strong>
              <div style={{ marginTop: '6px', background: '#f8f8f8', borderRadius: '8px', overflow: 'hidden' }}>
                {valor.map((obj, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap',
                      gap: '4px 12px', padding: '8px 12px',
                      borderBottom: i < valor.length - 1 ? '1px solid #eee' : 'none',
                      fontSize: '13px',
                    }}
                  >
                    {Object.entries(obj).map(([k, v]) => (
                      <span key={k} style={{ color: '#555' }}>
                        <span style={{ color: '#999' }}>{k}: </span>
                        <strong>{formatarValor(v)}</strong>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )
        }

        // Caso especial: objeto simples (ex: cliente)
        if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
          return (
            <div key={chave}>
              <strong style={{ fontSize: '12px', color: '#1a6b5a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {chave}
              </strong>
              <div style={{ marginTop: '6px', background: '#f8f8f8', borderRadius: '8px', padding: '8px 12px', fontSize: '13px' }}>
                {Object.entries(valor).map(([k, v]) => (
                  <div key={k} style={{ color: '#555' }}>
                    <span style={{ color: '#999' }}>{k}: </span>
                    <strong>{formatarValor(v)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )
        }

        // Valor simples (string, número, booleano)
        return (
          <div key={chave} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid #f0f0f0', paddingBottom: '6px' }}>
            <span style={{ color: '#999' }}>{chave}</span>
            <strong style={{ color: '#333' }}>{formatarValor(valor)}</strong>
          </div>
        )
      })}
    </div>
  )
}

function HistoricoGeral() {
  const [movimentacoes, setMovimentacoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [detalheAberto, setDetalheAberto] = useState(null)

  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [usuarioFiltro, setUsuarioFiltro] = useState('')
  const [telaFiltro, setTelaFiltro] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('')

  const listaRef = useRef(null)

  async function buscarMovimentacoes() {
    setCarregando(true)
    let query = supabase.from('historico_geral').select('*').order('created_at', { ascending: false })

    if (dataInicio) query = query.gte('created_at', dataInicio + 'T00:00:00')
    if (dataFim) query = query.lte('created_at', dataFim + 'T23:59:59')
    if (usuarioFiltro) query = query.eq('usuario_email', usuarioFiltro)
    if (telaFiltro) query = query.eq('tela', telaFiltro)
    if (tipoFiltro) query = query.eq('tipo', tipoFiltro)

    const { data, error } = await query.limit(500)
    if (!error) setMovimentacoes(data || [])
    setCarregando(false)
  }

  useEffect(() => { buscarMovimentacoes() }, [dataInicio, dataFim, usuarioFiltro, telaFiltro, tipoFiltro])

  function limparFiltros() {
    setDataInicio(''); setDataFim(''); setUsuarioFiltro(''); setTelaFiltro(''); setTipoFiltro('')
  }

  function imprimir() {
    const conteudo = listaRef.current.innerHTML
    const janela = window.open('', '_blank')
    janela.document.write(`
      <html><head><title>Histórico Geral - Santiagos Presentes</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; font-family:Arial,sans-serif; }
        body { padding:20px; }
        h2 { color:#1a6b5a; margin-bottom:16px; }
        .item { border-bottom:1px solid #eee; padding:8px 0; font-size:13px; }
        .meta { color:#888; font-size:11px; }
        @media print { button { display:none; } }
      </style></head>
      <body><h2>Histórico Geral — Santiagos Presentes</h2>${conteudo}</body></html>
    `)
    janela.document.close()
    janela.focus()
    setTimeout(() => janela.print(), 500)
  }

  async function compartilhar() {
    try {
      const canvas = await html2canvas(listaRef.current, { scale: 2, useCORS: true })
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'historico-geral-santiagos.png', { type: 'image/png' })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Histórico Geral - Santiagos Presentes' })
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = 'historico-geral-santiagos.png'; a.click()
          URL.revokeObjectURL(url)
        }
      }, 'image/png')
    } catch (err) { console.error('Erro ao compartilhar:', err) }
  }

  const campo = { width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }

  return (
    <div>
      <PageHeader title="Histórico Geral" subtitle="Todas as movimentações realizadas no app" icon={<History size={22} color="white" />} />

      {/* MODAL DE DETALHES */}
      {detalheAberto && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px',
          }}
          onClick={() => setDetalheAberto(null)}
        >
          <div
            style={{
              background: 'white', borderRadius: '16px', width: '100%', maxWidth: '480px',
              maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <strong style={{ fontSize: '16px', color: '#1a6b5a' }}>{detalheAberto.tela} — {detalheAberto.tipo}</strong>
                <p style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                  {new Date(detalheAberto.created_at).toLocaleDateString('pt-BR')} às {new Date(detalheAberto.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button
                onClick={() => setDetalheAberto(null)}
                style={{ background: '#f0f0f0', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex' }}
              >
                <X size={18} color="#666" />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Descrição</strong>
                <p style={{ fontSize: '14px', color: '#333', marginTop: '4px' }}>{detalheAberto.descricao}</p>
              </div>

              <div style={{ marginBottom: '16px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div>
                  <strong style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Usuário</strong>
                  <p style={{ fontSize: '14px', color: '#333', marginTop: '4px' }}>{detalheAberto.usuario_nome}</p>
                </div>
                {detalheAberto.referencia_id && (
                  <div>
                    <strong style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Referência</strong>
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', wordBreak: 'break-all' }}>{detalheAberto.referencia_id}</p>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid #eee', paddingTop: '16px' }}>
                <strong style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Detalhes completos</strong>
                <div style={{ marginTop: '10px' }}>
                  <DetalhesDados dados={detalheAberto.dados} />
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #eee' }}>
              <button
                onClick={() => setDetalheAberto(null)}
                style={{ width: '100%', background: '#1a6b5a', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginTop: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Filter size={16} color="#1a6b5a" />
          <strong style={{ color: '#1a6b5a', fontSize: '14px' }}>Filtros</strong>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>De</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={campo} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Até</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={campo} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Usuário</label>
            <select value={usuarioFiltro} onChange={e => setUsuarioFiltro(e.target.value)} style={campo}>
              <option value="">Todos</option>
              {Object.entries(NOMES_POR_EMAIL).map(([email, nome]) => (
                <option key={email} value={email}>{nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Tela</label>
            <select value={telaFiltro} onChange={e => setTelaFiltro(e.target.value)} style={campo}>
              <option value="">Todas</option>
              {TELAS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Tipo</label>
            <select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)} style={campo}>
              <option value="">Todos</option>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
          <button onClick={limparFiltros} style={{ background: '#eee', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <X size={14} /> Limpar filtros
          </button>
          <button onClick={imprimir} style={{ background: 'linear-gradient(135deg,#1a6b5a,#145a4a)', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={14} /> Imprimir
          </button>
          <button onClick={compartilhar} style={{ background: 'linear-gradient(135deg,#f5821f,#c2185b)', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Share2 size={14} /> Compartilhar
          </button>
        </div>
      </div>

      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        {carregando ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '24px' }}>Carregando...</p>
        ) : movimentacoes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#bbb' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>📋</div>
            <p style={{ fontSize: '14px' }}>Nenhuma movimentação encontrada</p>
          </div>
        ) : (
          <div ref={listaRef}>
            {movimentacoes.map(m => (
              <div
                key={m.id}
                className="item"
                onClick={() => setDetalheAberto(m)}
                style={{
                  borderBottom: '1px solid #f0f0f0', padding: '10px 4px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                  borderRadius: '8px', transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8f8f8'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '14px', color: '#1a6b5a' }}>{m.tela} — {m.tipo}</strong>
                    <span className="meta" style={{ fontSize: '11px', color: '#999', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                      {new Date(m.created_at).toLocaleDateString('pt-BR')} às {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#555', marginTop: '2px' }}>{m.descricao}</p>
                  <span className="meta" style={{ fontSize: '11px', color: '#888' }}>por {m.usuario_nome}</span>
                </div>
                <ChevronRight size={16} color="#ccc" style={{ flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default HistoricoGeral