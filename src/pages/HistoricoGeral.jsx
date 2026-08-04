import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import html2canvas from 'html2canvas'
import PageHeader from '../components/PageHeader'
import { History, Filter, Printer, Share2, X } from 'lucide-react'
import { NOMES_POR_EMAIL } from '../utils/logMovimentacao'

const TELAS = ['Vendas', 'Estoque', 'Clientes', 'Devoluções', 'Encomendas', 'Fornecedores', 'Capital', 'Investimentos', 'Retiradas']
const TIPOS = ['Criação', 'Edição', 'Exclusão', 'Pagamento']

function HistoricoGeral() {
  const [movimentacoes, setMovimentacoes] = useState([])
  const [carregando, setCarregando] = useState(true)

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
              <div key={m.id} className="item" style={{ borderBottom: '1px solid #f0f0f0', padding: '10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '14px', color: '#1a6b5a' }}>{m.tela} — {m.tipo}</strong>
                  <span className="meta" style={{ fontSize: '11px', color: '#999' }}>
                    {new Date(m.created_at).toLocaleDateString('pt-BR')} às {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: '#555', marginTop: '2px' }}>{m.descricao}</p>
                <span className="meta" style={{ fontSize: '11px', color: '#888' }}>por {m.usuario_nome}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default HistoricoGeral