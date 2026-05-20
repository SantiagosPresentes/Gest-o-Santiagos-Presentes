import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function Estoque() {
  const [produtos, setProdutos] = useState([])
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')

  useEffect(() => { carregarProdutos() }, [])

  async function carregarProdutos() {
    const { data } = await supabase.from('produtos').select('*').order('nome')
    if (data) setProdutos(data)
  }

  const produtosFiltrados = produtos.filter(p => {
    const termoBusca = busca.toLowerCase()
    const buscaOk = p.nome.toLowerCase().includes(termoBusca) || p.codigo.includes(busca)
    const categoriaOk = !filtroCategoria || p.categoria === filtroCategoria
    return buscaOk && categoriaOk
  })

  const totalEstoque = produtosFiltrados.reduce((acc, p) => acc + (p.estoque * parseFloat(p.preco_venda)), 0)
  const categorias = [...new Set(produtos.map(p => p.categoria))].sort()
  const campo = { padding:'8px 12px', borderRadius:'6px', border:'1px solid #ddd', fontSize:'14px' }

  return (
    <div>
      <h2>Estoque</h2>

      <div style={{background:'white', padding:'16px', borderRadius:'12px', marginTop:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', display:'flex', gap:'12px', alignItems:'center', flexWrap:'wrap'}}>
        <div style={{flex:1, minWidth:'180px'}}>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="🔍 Buscar por nome ou código..."
            style={{...campo, width:'100%'}}
          />
        </div>
        <div>
          <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} style={campo}>
            <option value="">Todas as categorias</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button onClick={() => { setBusca(''); setFiltroCategoria('') }} style={{background:'#e94560', border:'none', padding:'8px 16px', borderRadius:'6px', cursor:'pointer'}}>
          🧹 Limpar
        </button>
        <div style={{marginLeft:'auto', fontSize:'13px', color:'#666', whiteSpace:'nowrap'}}>
          {produtosFiltrados.length} produto(s) | Total: <strong style={{color:'#1a6b5a'}}>R$ {totalEstoque.toFixed(2)}</strong>
        </div>
      </div>

      <div className="tabela-wrapper" style={{marginTop:'16px'}}>
        <table>
          <thead>
            <tr>
              <th style={{textAlign:'left'}}>Código</th>
              <th style={{textAlign:'left'}}>Produto</th>
              <th style={{textAlign:'left'}}>Categoria</th>
              <th style={{textAlign:'center'}}>Estoque</th>
              <th style={{textAlign:'right'}}>Preço Unit.</th>
              <th style={{textAlign:'right'}}>Total em Estoque</th>
            </tr>
          </thead>
          <tbody>
            {produtosFiltrados.map((p, i) => (
              <tr key={p.id} style={{background: i % 2 === 0 ? '#fff' : '#f9f9f9'}}>
                <td style={{textAlign:'left', color:'#666'}}>{p.codigo}</td>
                <td style={{textAlign:'left'}}><strong>{p.nome}</strong></td>
                <td style={{textAlign:'left'}}>{p.categoria}</td>
                <td style={{textAlign:'center'}}>
                  <span style={{
                    background: p.estoque > 5 ? '#e8f5e9' : p.estoque > 0 ? '#fff8e1' : '#ffebee',
                    color: p.estoque > 5 ? 'green' : p.estoque > 0 ? '#f57f17' : 'red',
                    padding:'4px 12px', borderRadius:'20px', fontWeight:'bold', fontSize:'13px'
                  }}>
                    {p.estoque}
                  </span>
                </td>
                <td style={{textAlign:'right'}}>R$ {parseFloat(p.preco_venda).toFixed(2)}</td>
                <td style={{textAlign:'right'}}><strong>R$ {(p.estoque * parseFloat(p.preco_venda)).toFixed(2)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
        {produtosFiltrados.length === 0 && (
          <p style={{textAlign:'center', padding:'32px', color:'#aaa', background:'white'}}>Nenhum produto encontrado</p>
        )}
      </div>
    </div>
  )
}

export default Estoque