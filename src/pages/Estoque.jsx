import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { ShoppingCart, ClipboardList, RotateCcw, Package, TrendingUp, Boxes, Users, DollarSign, History, BarChart3, FileText, FilterX, Search, Printer, ArrowUpDown } from 'lucide-react'
import PageHeader from '../components/PageHeader'

function Estoque() {
  const [produtos, setProdutos] = useState([])
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('') // 'zerado' | 'baixo' | 'ok'
  const [ordenacao, setOrdenacao] = useState('nome_asc')

  useEffect(() => { carregarProdutos() }, [])

  async function carregarProdutos() {
    const { data } = await supabase.from('produtos').select('*').order('nome')
    if (data) setProdutos(data)
  }

  const produtosFiltrados = useMemo(() => {
    const filtrados = produtos.filter(p => {
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

    const ordenados = [...filtrados]
    switch (ordenacao) {
      case 'nome_asc':
        ordenados.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        break
      case 'nome_desc':
        ordenados.sort((a, b) => b.nome.localeCompare(a.nome, 'pt-BR'))
        break
      case 'codigo_asc':
        ordenados.sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true }))
        break
      case 'codigo_desc':
        ordenados.sort((a, b) => b.codigo.localeCompare(a.codigo, 'pt-BR', { numeric: true }))
        break
      case 'estoque_desc':
        ordenados.sort((a, b) => b.estoque - a.estoque)
        break
      case 'estoque_asc':
        ordenados.sort((a, b) => a.estoque - b.estoque)
        break
      default:
        break
    }
    return ordenados
  }, [produtos, busca, filtroCategoria, filtroStatus, ordenacao])

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

  const ordenacaoLabel = {
    nome_asc:     'Nome (A-Z)',
    nome_desc:    'Nome (Z-A)',
    codigo_asc:   'Código (crescente)',
    codigo_desc:  'Código (decrescente)',
    estoque_desc: 'Quantidade em estoque (maior → menor)',
    estoque_asc:  'Quantidade em estoque (menor → maior)',
  }

  function toggleStatus(key) {
    setFiltroStatus(prev => prev === key ? '' : key)
  }

  function imprimirEstoque() {
    const dataAtual = new Date().toLocaleDateString('pt-BR')
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    const linhasHtml = produtosFiltrados.map((p, i) => `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f7f9fa'}">
        <td style="padding:8px 10px;border-bottom:1px solid #eee;">${p.codigo}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;"><strong>${p.nome}</strong></td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;">${p.categoria || '—'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center;font-weight:bold;">${p.estoque}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;">R$ ${parseFloat(p.preco_venda).toFixed(2)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">R$ ${(p.estoque * parseFloat(p.preco_venda)).toFixed(2)}</td>
      </tr>
    `).join('')

    const filtrosAplicados = []
    if (busca) filtrosAplicados.push(`Busca: "${busca}"`)
    if (filtroCategoria) filtrosAplicados.push(`Categoria: ${filtroCategoria}`)
    if (filtroStatus) filtrosAplicados.push(`Status: ${statusFiltros.find(s => s.key === filtroStatus)?.label}`)

    const janela = window.open('', '_blank')
    janela.document.write(`
      <html>
        <head>
          <title>Relatório de Estoque</title>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; font-family: Arial, Helvetica, sans-serif; }
            body { padding: 32px; color: #2d3748; }
            .cabecalho { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #1a6b5a; padding-bottom:16px; margin-bottom:20px; }
            .cabecalho h1 { font-size:20px; color:#1a6b5a; margin-bottom:4px; }
            .cabecalho p { font-size:12px; color:#718096; }
            .meta { text-align:right; font-size:12px; color:#718096; }
            .filtros { font-size:12px; color:#718096; margin-bottom:16px; background:#f7fafc; padding:10px 14px; border-radius:8px; border:1px solid #edf2f7; }
            .filtros strong { color:#2d3748; }
            table { width:100%; border-collapse:collapse; font-size:13px; }
            thead th { background:#1a6b5a; color:white; text-align:left; padding:10px; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; }
            tfoot td { padding:12px 10px; font-weight:bold; border-top:2px solid #1a6b5a; }
            .rodape { margin-top:24px; text-align:center; font-size:11px; color:#a0aec0; }
            .btn-imprimir { margin-top:20px; text-align:center; }
            .btn-imprimir button { background:#1a6b5a; color:white; border:none; padding:10px 24px; border-radius:8px; font-size:14px; font-weight:bold; cursor:pointer; }
            @media print {
              body { padding: 12px; }
              .btn-imprimir { display:none; }
            }
          </style>
        </head>
        <body>
          <div class="cabecalho">
            <div>
              <h1>Relatório de Estoque</h1>
              <p>Santiagos Presentes</p>
            </div>
            <div class="meta">
              <p>Emitido em: ${dataAtual} às ${horaAtual}</p>
              <p>${produtosFiltrados.length} produto(s) listado(s)</p>
            </div>
          </div>

          <div class="filtros">
            ${filtrosAplicados.length > 0 ? `<strong>Filtros aplicados:</strong> ${filtrosAplicados.join(' | ')}<br/>` : ''}
            <strong>Ordenado por:</strong> ${ordenacaoLabel[ordenacao]}
          </div>

          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Produto</th>
                <th>Categoria</th>
                <th style="text-align:center;">Estoque</th>
                <th style="text-align:right;">Preço Unit.</th>
                <th style="text-align:right;">Total em Estoque</th>
              </tr>
            </thead>
            <tbody>
              ${linhasHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5" style="text-align:right;">TOTAL GERAL EM ESTOQUE</td>
                <td style="text-align:right;color:#1a6b5a;">R$ ${totalEstoque.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <div class="rodape">Relatório gerado automaticamente pelo sistema — Santiagos Presentes</div>

          <div class="btn-imprimir">
            <button onclick="window.print()">🖨️ Imprimir</button>
          </div>
        </body>
      </html>
    `)
    janela.document.close()
    janela.focus()
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

        {/* Ordenação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowUpDown size={15} color="#718096" />
          <select value={ordenacao} onChange={e => setOrdenacao(e.target.value)} style={campo}>
            <option value="nome_asc">Nome (A-Z)</option>
            <option value="nome_desc">Nome (Z-A)</option>
            <option value="codigo_asc">Código (crescente)</option>
            <option value="codigo_desc">Código (decrescente)</option>
            <option value="estoque_desc">Estoque (maior → menor)</option>
            <option value="estoque_asc">Estoque (menor → maior)</option>
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

        {/* Imprimir */}
        <button
          onClick={imprimirEstoque}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #1a6b5a, #145a4a)',
            color: 'white',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <Printer size={15} />
          Imprimir
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
