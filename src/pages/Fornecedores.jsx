import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import PageHeader from '../components/PageHeader'
import { Package, Trash2, Pencil, X, Check, Search } from 'lucide-react'
import { registrarMovimentacao } from '../utils/logMovimentacao'

function normalizarTexto(texto) {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function capitalizarPalavras(str) {
  return str.trim().replace(/\b\w/g, l => l.toUpperCase())
}

function Fornecedores() {
  const [fornecedores, setFornecedores] = useState([])
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [busca, setBusca] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [editandoId, setEditandoId] = useState(null)
  const [editNome, setEditNome] = useState('')
  const [editTelefone, setEditTelefone] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data } = await supabase.from('fornecedores').select('*').order('nome')
    if (data) setFornecedores(data)
  }

  async function salvar() {
    if (!nome.trim()) {
      setMensagem('Informe o nome do fornecedor!')
      return
    }
    const { error } = await supabase.from('fornecedores').insert({
      nome: capitalizarPalavras(nome),
      telefone: telefone.trim() || null
    })
    if (error) {
      setMensagem('Erro ao salvar: ' + error.message)
    } else {
      setNome(''); setTelefone('')
      setMensagem('Fornecedor cadastrado com sucesso!')
      carregar()
      setTimeout(() => setMensagem(''), 2500)
    }
  }

  function iniciarEdicao(f) {
    setEditandoId(f.id)
    setEditNome(f.nome)
    setEditTelefone(f.telefone || '')
  }

  function cancelarEdicao() {
    setEditandoId(null)
    setEditNome('')
    setEditTelefone('')
  }

  async function salvarEdicao(id) {
    if (!editNome.trim()) return
    const { error } = await supabase.from('fornecedores').update({
      nome: capitalizarPalavras(editNome),
      telefone: editTelefone.trim() || null
    }).eq('id', id)
    if (!error) {
      cancelarEdicao()
      carregar()
    }
  }

  async function excluir(id) {
    if (!window.confirm('Excluir este fornecedor?')) return
    const { error } = await supabase.from('fornecedores').delete().eq('id', id)
    if (!error) carregar()
  }

  const termoBusca = normalizarTexto(busca.trim())
  const listaFiltrada = termoBusca
    ? fornecedores.filter(f => normalizarTexto(f.nome).includes(termoBusca))
    : fornecedores

  const campo = { width: '100%', padding: '10px', marginTop: '6px', borderRadius: '6px', border: '1px solid #ddd' }
  const card = { background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        subtitle="Cadastro de fornecedores para investimentos"
        icon={<Package size={22} color="white" />}
      />

      <div className="grid-2" style={{ marginTop: '16px' }}>
        {/* CADASTRO */}
        <div style={card}>
          <h3 style={{ marginBottom: '16px', color: '#1a6b5a' }}>Novo Fornecedor</h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Nome</label><br />
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && salvar()}
              placeholder="Ex: Atacadão"
              style={campo}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Telefone (opcional)</label><br />
            <input
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && salvar()}
              placeholder="Ex: (24) 99999-9999"
              style={campo}
            />
          </div>

          <button
            onClick={salvar}
            style={{
              width: '100%', background: 'linear-gradient(135deg, #f5821f, #c2185b)',
              color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px',
              cursor: 'pointer', fontSize: '16px', fontWeight: 'bold'
            }}
          >
            Cadastrar Fornecedor
          </button>

          {mensagem && (
            <p style={{ marginTop: '16px', color: mensagem.includes('sucesso') ? 'green' : 'red' }}>{mensagem}</p>
          )}
        </div>

        {/* LISTA */}
        <div style={card}>
          <h3 style={{ marginBottom: '16px', color: '#1a6b5a' }}>Fornecedores Cadastrados</h3>

          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <Search size={16} color="#999" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar fornecedor..."
              style={{ ...campo, marginTop: 0, paddingLeft: '32px' }}
            />
          </div>

          {listaFiltrada.length === 0 && (
            <p style={{ textAlign: 'center', color: '#bbb', padding: '24px 0' }}>Nenhum fornecedor encontrado</p>
          )}

          <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
            {listaFiltrada.map(f => (
              <div key={f.id} style={{ background: '#f8f8f8', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                {editandoId === f.id ? (
                  <div>
                    <input
                      value={editNome}
                      onChange={e => setEditNome(e.target.value)}
                      style={{ ...campo, marginTop: 0, marginBottom: '8px' }}
                      placeholder="Nome"
                    />
                    <input
                      value={editTelefone}
                      onChange={e => setEditTelefone(e.target.value)}
                      style={{ ...campo, marginTop: 0, marginBottom: '8px' }}
                      placeholder="Telefone"
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => salvarEdicao(f.id)}
                        style={{ flex: 1, background: '#1a6b5a', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <Check size={14} /> Salvar
                      </button>
                      <button
                        onClick={cancelarEdicao}
                        style={{ flex: 1, background: '#ddd', color: '#333', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <X size={14} /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '14px' }}>{f.nome}</strong>
                      {f.telefone && <div style={{ fontSize: '12px', color: '#888' }}>{f.telefone}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => iniciarEdicao(f)}
                        title="Editar"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#1a6b5a', padding: '4px' }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => excluir(f.id)}
                        title="Excluir"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#e94560', padding: '4px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Fornecedores
