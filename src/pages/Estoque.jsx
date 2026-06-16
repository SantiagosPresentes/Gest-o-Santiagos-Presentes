import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { ShoppingCart, ClipboardList, RotateCcw, Package, TrendingUp, Boxes, Users, DollarSign, History, BarChart3, FileText, FilterX, Search } from 'lucide-react'
import PageHeader from '../components/PageHeader'

function Estoque() {
  const [produtos, setProdutos] = useState([])
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('') // 'zerado' | 'baixo' | 'ok'

  useEffect(() => { carregarProdutos() }, [])

  async function carregarProdutos() {
    const { data } = await supabase.from('produtos').select('*').order('nome')
    if (data) setProdutos(data)
  }

  const produtosFiltrados = produtos.filter(p => {
    const termoBusca = busca.toLowerCase()
    const buscaOk = p.nome.toLowerCase().includes(termoBusca) || p.codigo.includes(busca)
    const categoriaOk = !filtroCategoria || p.categoria === filtroCategoria
    const statusOk =
      !filtroStatus ||
      (filtroStatus === 'zerado' && p.estoque === 0) ||
      (filtroStatus === 'baixo' && p.estoque > 0 && p.estoque <= p.estoque_minimo) ||
      (filtroStatus === 'ok' && p.estoque > p.estoque_minimo)
    return buscaOk && categoriaOk && statusOk
  })

  const totalEstoque = produtosFiltrados.reduce((acc, p) => acc + (p.estoque * parseFloat(p.preco_venda)), 0)
  const categorias = [...new Set(produtos.map(p => p.categoria))].sort()
  const campo = { padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }

  const temFiltroAtivo = busca !== '' || filtroCategoria !== '' || filtroStatus !== ''

  function getEstoqueStyle(p) {
    if (p.estoque === 0) {
      return { background: '#ffebee', color: '#c62828' }
    } else if (p.estoque <= p.estoque_minimo) {
      return { background: '#fff8e1', color: '#f57f17' }
    } else {
      return { background: '#e8f5e9', color: '#2e7d32' }
    }
  }

  // Contadores para cada status
  const contadores = {
    zerado: produtos.filter(p => p.estoque === 0).length,
    baixo: produtos.filter(p => p.estoque > 0 && p.estoque <= p.estoque_minimo).length,
    ok: produtos.filter(p => p.estoque > p.estoque_minimo).length,
  }

  const statusFiltros = [
    { key: 'zerado', label: 'Sem estoque', cor: '#c62828', bg: '#ffebee', bgAtivo: '#c62828' },
    { key: 'baixo',  label: 'Estoque baixo', cor: '#f57f17', bg: '#fff8e1', bgAtivo: '#f57f17' },
    { key: 'ok',     label: 'Estoque OK',    cor: '#2e7d32', bg: '#e8f5e9', bgAtivo: '#2e7d32' },
  ]

  function toggleStatus(key) {
    setFiltroStatus(prev => prev === key ? '' : key)
  }

  return (
    <div>
      <PageHeader
        title="Estoque"
        subtitle="Controle de entrada, saída e quantidade disponível"
        icon={<Boxes size={22} color="white" />}
      />

      <div style={{ background: 'white', padding: '16px', borderRadius: '12px', marginTop: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Busca */}
        <div style={{ flex: 1, minWidth: '180px', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999', pointerEvents: 'none' }} />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou código..."
            style={{ ...campo, width: '100%', paddingLeft: '34px', boxSizing: 'border-box' }}
          />
        </div>

        {/* Categoria */}
        <div>
          <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} style={campo}>
            <option value="">Todas as categorias</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Separador visual */}
        <div style={{ width: '1px', height: '32px', background: '#e0e0e0', flexShrink: 0 }} />

        {/* Botões de status */}
        {statusFiltros.map(({ key, label, cor, bg, bgAtivo }) => {
          const ativo = filtroStatus === key
          return (
            <button
              key={key}
              onClick={() => toggleStatus(key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                border: `1.5px solid ${cor}`,
                background: ativo ? bgAtivo : bg,
                color: ativo ? 'white' : cor,
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: ativo ? 'rgba(255,255,255,0.25)' : cor,
                color: 'white',
                fontSize: '11px',
                fontWeight: '700',
              }}>
                {contadores[key]}
              </span>
              {label}
            </button>
          )
        })}

        {/* Limpar filtros */}
        <button
          onClick={() => { setBusca(''); setFiltroCategoria(''); setFiltroStatus('') }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: temFiltroAtivo ? '1px solid #e94560' : '1px solid #c0392b',
            background: temFiltroAtivo ? '#e94560' : '#fff',
            color: temFiltroAtivo ? 'white' : '#c0392b',
            fontSize: '13px',
            fontWeight: '500',
            cursor: temFiltroAtivo ? 'pointer' : 'default',
            transition: 'all 0.2s ease',
            opacity: temFiltroAtivo ? 1 : 0.6,
          }}
          disabled={!temFiltroAtivo}
        >
          <FilterX size={15} />
          Limpar filtros
        </button>

        {/* Contador e total */}
        <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#666', whiteSpace: 'nowrap' }}>
          {produtosFiltrados.length} produto(s) | Total: <strong style={{ color: '#1a6b5a' }}>R$ {totalEstoque.toFixed(2)}</strong>
        </div>
      </div>

      <div className="tabela-wrapper" style={{ marginTop: '16px' }}>
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Código</th>
              <th style={{ textAlign: 'left' }}>Produto</th>
              <th style={{ textAlign: 'left' }}>Categoria</th>
              <th style={{ textAlign: 'center' }}>Estoque</th>
              <th style={{ textAlign: 'right' }}>Preço Unit.</th>
              <th style={{ textAlign: 'right' }}>Total em Estoque</th>
            </tr>
          </thead>
          <tbody>
            {produtosFiltrados.map((p, i) => (
              <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                <td style={{ textAlign: 'left', color: '#666' }}>{p.codigo}</td>
                <td style={{ textAlign: 'left' }}><strong>{p.nome}</strong></td>
                <td style={{ textAlign: 'left' }}>{p.categoria}</td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{
                    ...getEstoqueStyle(p),
                    padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '13px'
                  }}>
                    {p.estoque}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>R$ {parseFloat(p.preco_venda).toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}><strong>R$ {(p.estoque * parseFloat(p.preco_venda)).toFixed(2)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
        {produtosFiltrados.length === 0 && (
          <p style={{ textAlign: 'center', padding: '32px', color: '#aaa', background: 'white' }}>Nenhum produto encontrado</p>
        )}
      </div>
    </div>
  )
}

export default Estoque