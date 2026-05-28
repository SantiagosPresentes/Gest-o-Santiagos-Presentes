import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import PageHeader from '../components/PageHeader'
import { Package } from 'lucide-react'

function Produtos() {
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('')
  const [preco, setPreco] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [estoqueMinimo, setEstoqueMinimo] = useState('')
  const [estoqueMaximo, setEstoqueMaximo] = useState('')
  const [produtos, setProdutos] = useState([])
  const [editando, setEditando] = useState(null)
  const [busca, setBusca] = useState('')

  useEffect(() => { carregarProdutos() }, [])

  async function carregarProdutos() {
    const { data } = await supabase.from('produtos').select('*').order('nome')
    if (data) setProdutos(data)
  }

  async function salvarProduto() {
    if (!codigo || !nome || !categoria || !preco) {
      setMensagem('Preencha todos os campos!'); return
    }
    const { error } = await supabase.from('produtos').insert({
      codigo, nome, categoria,
      preco_venda: parseFloat(preco),
      estoque: 0,
      estoque_minimo: parseInt(estoqueMinimo) || 0,
      estoque_maximo: parseInt(estoqueMaximo) || 0
    })
    if (error) { setMensagem('Erro ao salvar: ' + error.message); return }
    setMensagem('Produto cadastrado com sucesso!')
    setCodigo(''); setNome(''); setCategoria(''); setPreco('')
    setEstoqueMinimo(''); setEstoqueMaximo('')
    carregarProdutos()
  }

  async function salvarEdicao() {
    if (!nome || !categoria || !preco) {
      setMensagem('Preencha todos os campos!'); return
    }
    const { error } = await supabase.from('produtos').update({
      nome, categoria,
      preco_venda: parseFloat(preco),
      estoque_minimo: parseInt(estoqueMinimo) || 0,
      estoque_maximo: parseInt(estoqueMaximo) || 0
    }).eq('id', editando.id)
    if (error) { setMensagem('Erro ao atualizar: ' + error.message); return }
    setMensagem('Produto atualizado! Vendas anteriores não foram afetadas.')
    setEditando(null)
    setCodigo(''); setNome(''); setCategoria(''); setPreco('')
    setEstoqueMinimo(''); setEstoqueMaximo('')
    carregarProdutos()
  }

  function iniciarEdicao(produto) {
    setEditando(produto)
    setCodigo(produto.codigo)
    setNome(produto.nome)
    setCategoria(produto.categoria)
    setPreco(produto.preco_venda)
    setEstoqueMinimo(produto.estoque_minimo || 0)
    setEstoqueMaximo(produto.estoque_maximo || 0)
    setMensagem('')
    window.scrollTo(0, 0)
  }

  function cancelarEdicao() {
    setEditando(null)
    setCodigo(''); setNome(''); setCategoria(''); setPreco('')
    setEstoqueMinimo(''); setEstoqueMaximo('')
    setMensagem('')
  }

  const produtosFiltrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.codigo.includes(busca)
  )

  const campo = { width: '100%', padding: '10px', marginTop: '6px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }

  return (
    <div>
      <PageHeader
        title="Produtos"
        subtitle="Cadastro e gerenciamento de produtos"
        icon={<Package size={22} color="white" />}
      />

      {/* FORMULÁRIO */}
      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', marginTop: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderTop: editando ? '3px solid #f5821f' : '3px solid #1a6b5a' }}>
        <h3 style={{ color: editando ? '#f5821f' : '#1a6b5a', marginBottom: '16px' }}>
          {editando ? `✏️ Editando: ${editando.nome}` : 'Novo Produto'}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>

          <div>
            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Código do Produto</label><br />
            <input
              value={codigo}
              onChange={e => setCodigo(e.target.value)}
              placeholder="Ex: 0001"
              disabled={!!editando}
              style={{ ...campo, background: editando ? '#f5f5f5' : 'white', color: editando ? '#888' : '#333' }}
            />
            {editando && <small style={{ color: '#888' }}>O código não pode ser alterado</small>}
          </div>

          <div>
            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Nome do Produto</label><br />
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Cobredom" style={campo} />
          </div>

          <div>
            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Categoria</label><br />
            <select value={categoria} onChange={e => setCategoria(e.target.value)} style={campo}>
              <option value="">Selecione...</option>
              <option>Acessórios</option>
              <option>Cama / Mesa / Banho</option>
              <option>Cozinha</option>
              <option>Decoração</option>
              <option>Escolar</option>
              <option>Infantil</option>
              <option>Lazer</option>
              <option>Perfumaria</option>
              <option>Utilidade</option>
            </select>
          </div>

          <div>
            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Preço de Venda (R$)</label><br />
            <input type="number" value={preco} onChange={e => setPreco(e.target.value)} placeholder="Ex: 25.90" style={campo} />
            {editando && <small style={{ color: '#1a6b5a' }}>⚠️ Não afeta vendas já realizadas</small>}
          </div>

          {/* Mínimo e Máximo lado a lado */}
          <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Estoque Mínimo</label><br />
              <input
                type="number"
                value={estoqueMinimo}
                onChange={e => setEstoqueMinimo(e.target.value)}
                placeholder="Ex: 5"
                style={campo}
              />
            </div>
            <div>
              <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Estoque Máximo</label><br />
              <input
                type="number"
                value={estoqueMaximo}
                onChange={e => setEstoqueMaximo(e.target.value)}
                placeholder="Ex: 100"
                style={campo}
              />
            </div>
          </div>

        </div>{/* FIM DO GRID */}

        {/* BOTÕES */}
        <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
          {editando ? (
            <>
              <button onClick={salvarEdicao} style={{ flex: 1, background: 'linear-gradient(135deg, #f5821f, #e06010)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}>
                Salvar Alterações
              </button>
              <button onClick={cancelarEdicao} style={{ flex: 1, background: '#eee', color: '#333', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px' }}>
                Cancelar
              </button>
            </>
          ) : (
            <button onClick={salvarProduto} style={{ flex: 1, background: 'linear-gradient(135deg, #1a6b5a, #145a4a)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}>
              Cadastrar Produto
            </button>
          )}
        </div>

        {mensagem && <p style={{ marginTop: '16px', color: mensagem.includes('Erro') ? 'red' : 'green', fontSize: '14px' }}>{mensagem}</p>}
      </div>

      {/* LISTA DE PRODUTOS */}
      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', marginTop: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ color: '#1a6b5a', margin: 0 }}>Produtos Cadastrados ({produtos.length})</h3>
        </div>

        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="🔍 Buscar por nome ou código..."
          style={{ ...campo, marginBottom: '16px', marginTop: 0 }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
          {produtosFiltrados.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f9f9f9', borderRadius: '8px', borderLeft: '3px solid #1a6b5a' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: '14px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</strong>
                <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>{p.codigo}</span>
                <span style={{ color: '#666', fontSize: '12px', marginLeft: '6px' }}>{p.categoria}</span><br />
                <strong style={{ color: '#1a6b5a', fontSize: '13px' }}>R$ {parseFloat(p.preco_venda).toFixed(2)}</strong>
                <span style={{ color: p.estoque > 0 ? 'green' : 'red', fontSize: '12px', marginLeft: '8px' }}>
                  Est: {p.estoque}
                </span>
                <span style={{ color: '#888', fontSize: '11px', marginLeft: '8px' }}>
                  Mín: {p.estoque_minimo || 0} / Máx: {p.estoque_maximo || 0}
                </span>
              </div>
              <button
                onClick={() => iniciarEdicao(p)}
                style={{ background: '#fff8e1', color: '#f57f17', border: '1px solid #f5821f', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', marginLeft: '8px', flexShrink: 0 }}
              >
                ✏️
              </button>
            </div>
          ))}
          {produtosFiltrados.length === 0 && (
            <p style={{ textAlign: 'center', color: '#aaa', padding: '20px', gridColumn: '1/-1' }}>Nenhum produto encontrado</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Produtos