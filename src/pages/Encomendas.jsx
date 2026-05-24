import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import {ShoppingCart, ClipboardList, RotateCcw, Package, TrendingUp, Boxes, Users, DollarSign, History, BarChart3, FileText} from 'lucide-react'
import PageHeader from '../components/PageHeader'

function Encomendas() {
  const [clientes, setClientes] = useState([])
  const [cliente, setCliente] = useState(null)
  const [descricao, setDescricao] = useState('')
  const [valorCusto, setValorCusto] = useState('')
  const [valorVenda, setValorVenda] = useState('')
  const [dataPagar, setDataPagar] = useState('')
  const [observacao, setObservacao] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [encomendas, setEncomendas] = useState([])

  useEffect(() => {
    supabase.from('clientes').select('*').order('nome').then(({ data }) => {
      if (data) setClientes(data)
    })
    carregarEncomendas()
  }, [])

  async function carregarEncomendas() {
    const { data } = await supabase
      .from('vendas')
      .select('*, clientes(nome, telefone)')
      .eq('situacao', 'Encomenda')
      .order('data_venda', { ascending: false })
    if (data) setEncomendas(data)
  }

  const lucro = valorCusto && valorVenda
    ? (parseFloat(valorVenda) - parseFloat(valorCusto)).toFixed(2)
    : null

  const percentualLucro = valorCusto && valorVenda && parseFloat(valorCusto) > 0
    ? (((parseFloat(valorVenda) - parseFloat(valorCusto)) / parseFloat(valorCusto)) * 100).toFixed(1)
    : null

  async function registrarEncomenda() {
    if (!cliente || !descricao || !valorVenda || !dataPagar) {
      setMensagem('Preencha todos os campos obrigatórios!')
      setTimeout(() => setMensagem(''), 3000)
      return
    }

    const obsCompleta = [
      `ENCOMENDA: ${descricao}`,
      valorCusto ? `Custo: R$ ${parseFloat(valorCusto).toFixed(2)}` : null,
      valorCusto && valorVenda ? `Lucro: R$ ${lucro} (${percentualLucro}%)` : null,
      observacao || null
    ].filter(Boolean).join(' | ')

    const { error } = await supabase.from('vendas').insert({
      cliente_id: cliente.id,
      data_para_pagar: dataPagar,
      valor_total: parseFloat(valorVenda),
      recebido: 0,
      situacao: 'Encomenda',
      observacao: obsCompleta
    })

    if (error) { setMensagem('Erro: ' + error.message); return }

    setMensagem('Encomenda registrada com sucesso!')
    setTimeout(() => setMensagem(''), 3000)
    setCliente(null)
    setDescricao('')
    setValorCusto('')
    setValorVenda('')
    setDataPagar('')
    setObservacao('')
    carregarEncomendas()
  }

  async function marcarEntregue(venda) {
    await supabase.from('vendas').update({ situacao: 'Pendente' }).eq('id', venda.id)
    carregarEncomendas()
  }

  async function cancelarEncomenda(id) {
    await supabase.from('vendas').delete().eq('id', id)
    carregarEncomendas()
  }

  function extrairLucro(obs) {
    if (!obs) return null
    const match = obs.match(/Lucro: R\$ ([\d.]+) \(([\d.]+)%\)/)
    if (match) return { valor: match[1], percentual: match[2] }
    return null
  }

  // ── Estilos ──────────────────────────────────────────────────────────────────

  const s = {
    page: {
      background: '#f0f2f5',
      minHeight: '100vh',
      paddingBottom: 32,
    },

    // Cabeçalho da página
    pageHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '20px 20px 16px',
    },
    pageHeaderIcon: {
      width: 42,
      height: 42,
      background: '#1A6B5A',
      borderRadius: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    pageHeaderTitle: {
      fontSize: 22,
      fontWeight: 700,
      color: '#1A6B5A',
      lineHeight: 1.1,
      margin: 0,
    },
    pageHeaderSub: {
      fontSize: 12,
      color: '#999',
      marginTop: 2,
    },

    // Section label
    sectionLabel: {
      fontSize: 11,
      fontWeight: 700,
      color: '#aaa',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      marginBottom: 8,
      paddingLeft: 2,
    },

    // Layout responsivo
    layout: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: 16,
      padding: '0 16px',
    },

    // Card base
    card: {
      background: 'white',
      borderRadius: 14,
      boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      overflow: 'hidden',
    },
    cardHead: {
      padding: '16px 20px 14px',
      textAlign: 'center',
      borderBottom: '1px solid #f0f0f0',
    },
    cardHeadTitle: {
      fontSize: 16,
      fontWeight: 700,
      color: '#1A6B5A',
      margin: 0,
    },
    cardBody: {
      padding: '18px 20px',
    },

    // Campos
    fieldWrap: {
      marginBottom: 14,
    },
    label: {
      display: 'block',
      fontSize: 12,
      fontWeight: 700,
      color: '#555',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: 6,
    },
    input: {
      width: '100%',
      padding: '11px 13px',
      border: '1.5px solid #e8e8e8',
      borderRadius: 10,
      fontSize: 14,
      color: '#333',
      background: '#fafafa',
      outline: 'none',
      boxSizing: 'border-box',
    },
    select: {
      width: '100%',
      padding: '11px 13px',
      border: '1.5px solid #e8e8e8',
      borderRadius: 10,
      fontSize: 14,
      color: '#333',
      background: '#fafafa',
      outline: 'none',
      boxSizing: 'border-box',
      appearance: 'none',
      WebkitAppearance: 'none',
    },

    row2: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12,
    },

    // Card de lucro
    lucroBox: {
      background: 'linear-gradient(135deg, #f0fdf8 0%, #e8f5f0 100%)',
      border: '1.5px solid #b2dfdb',
      borderRadius: 12,
      padding: '14px 10px',
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 6,
      margin: '4px 0 16px',
    },
    lucroItem: { textAlign: 'center' },
    lucroLabel: {
      fontSize: 10,
      fontWeight: 700,
      color: '#888',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: 4,
    },
    lucroValor: { fontSize: 15, fontWeight: 700, color: '#1A6B5A' },
    lucroCusto: { fontSize: 15, fontWeight: 700, color: '#777' },
    lucroNeg: { fontSize: 15, fontWeight: 700, color: '#c62828' },

    // Botão principal
    btnMain: {
      width: '100%',
      padding: '14px',
      background: 'linear-gradient(135deg, #f5821f, #c2185b)',
      color: 'white',
      border: 'none',
      borderRadius: 10,
      fontSize: 15,
      fontWeight: 700,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      boxShadow: '0 4px 14px rgba(26,107,90,0.28)',
      marginTop: 4,
    },

    // Mensagem feedback
    msgSucesso: {
      marginTop: 12,
      padding: '10px 14px',
      background: '#e8f5e9',
      color: '#2e7d32',
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 600,
    },
    msgErro: {
      marginTop: 12,
      padding: '10px 14px',
      background: '#ffebee',
      color: '#c62828',
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 600,
    },

    // Lista topo
    listTop: {
      padding: '16px 20px 12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid #f0f0f0',
    },
    listTopTitle: {
      fontSize: 16,
      fontWeight: 700,
      color: '#1A6B5A',
      margin: 0,
    },
    badgeCount: {
      background: '#1A6B5A',
      color: 'white',
      fontSize: 11,
      fontWeight: 700,
      padding: '3px 10px',
      borderRadius: 20,
    },

    encList: {
      padding: '14px 16px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    },

    // Card de encomenda
    encCard: {
      border: '1px solid #e8e8e8',
      borderLeft: '4px solid #29abe2',
      borderRadius: 12,
      padding: 15,
      background: 'white',
      position: 'relative',
      overflow: 'hidden',
    },
    encCorner: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 56,
      height: 56,
      background: '#f0f8ff',
      borderRadius: '0 12px 0 56px',
    },

    encTop: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 4,
    },
    encNome: { fontSize: 14, fontWeight: 700, color: '#1a1a1a' },
    encTag: {
      display: 'inline-block',
      fontSize: 10,
      fontWeight: 700,
      color: '#1A6B5A',
      background: '#e6f5ef',
      border: '1px solid #b2dfdb',
      padding: '2px 8px',
      borderRadius: 20,
      marginTop: 3,
      textTransform: 'uppercase',
      letterSpacing: '0.3px',
    },
    encValor: {
      fontSize: 16,
      fontWeight: 700,
      color: '#1A6B5A',
      whiteSpace: 'nowrap',
      marginLeft: 8,
    },
    encDesc: {
      fontSize: 12,
      color: '#666',
      margin: '6px 0 8px',
      lineHeight: 1.45,
    },
    encPills: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      marginBottom: 10,
    },
    pillGreen: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 11,
      fontWeight: 600,
      padding: '4px 10px',
      borderRadius: 20,
      background: '#e8f5e9',
      color: '#2e7d32',
    },
    pillOrange: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 11,
      fontWeight: 600,
      padding: '4px 10px',
      borderRadius: 20,
      background: '#fff3e0',
      color: '#e65100',
    },
    encBtns: { display: 'flex', gap: 8 },
    btnEntregar: {
      flex: 1,
      padding: '9px',
      border: 'none',
      borderRadius: 8,
      background: '#1A6B5A',
      color: 'white',
      fontSize: 13,
      fontWeight: 700,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },
    btnCancelar: {
      flex: 1,
      padding: '9px',
      border: '1.5px solid #ffcdd2',
      borderRadius: 8,
      background: '#fff5f5',
      color: '#c62828',
      fontSize: 13,
      fontWeight: 700,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },

    empty: {
      textAlign: 'center',
      padding: '40px 20px',
      color: '#ccc',
      fontSize: 13,
    },
  }

  return (
    <div style={s.page}>

      {/* ── Cabeçalho da página ── */}
      <PageHeader
        title="Encomendas"
        subtitle="Registre e acompanhe pedidos"
        icon={<Package size={22} color="white" />}
      />

      <div style={s.layout}>

        {/* ── Formulário ── */}
        <div>
          <p style={s.sectionLabel}>Nova encomenda</p>
          <div style={s.card}>
            <div style={s.cardHead}>
              <h3 style={s.cardHeadTitle}>Nova Encomenda</h3>
            </div>
            <div style={s.cardBody}>

              <div style={s.fieldWrap}>
                <label style={s.label}>Cliente <span style={{ color: '#e74c3c' }}>*</span></label>
                <select
                  style={s.select}
                  value={cliente ? cliente.id : ''}
                  onChange={e => setCliente(clientes.find(c => c.id === e.target.value) || null)}
                >
                  <option value="">Selecione o cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div style={s.fieldWrap}>
                <label style={s.label}>Descrição do Produto <span style={{ color: '#e74c3c' }}>*</span></label>
                <input
                  style={s.input}
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Ex: Jogo de cama casal azul"
                />
              </div>

              <div style={{ ...s.row2, marginBottom: 0 }}>
                <div style={s.fieldWrap}>
                  <label style={s.label}>Preço de Custo</label>
                  <input
                    style={s.input}
                    type="number"
                    value={valorCusto}
                    onChange={e => setValorCusto(e.target.value)}
                    placeholder="R$ 0,00"
                  />
                </div>
                <div style={s.fieldWrap}>
                  <label style={s.label}>Preço de Venda <span style={{ color: '#e74c3c' }}>*</span></label>
                  <input
                    style={s.input}
                    type="number"
                    value={valorVenda}
                    onChange={e => setValorVenda(e.target.value)}
                    placeholder="R$ 0,00"
                  />
                </div>
              </div>

              {/* Card de lucro */}
              {lucro !== null && (
                <div style={{
                  ...s.lucroBox,
                  background: parseFloat(lucro) >= 0
                    ? 'linear-gradient(135deg, #f0fdf8 0%, #e8f5f0 100%)'
                    : 'linear-gradient(135deg, #fff5f5 0%, #ffebee 100%)',
                  borderColor: parseFloat(lucro) >= 0 ? '#b2dfdb' : '#ffcdd2',
                }}>
                  <div style={s.lucroItem}>
                    <div style={s.lucroLabel}>Custo</div>
                    <div style={s.lucroCusto}>R$ {parseFloat(valorCusto).toFixed(2)}</div>
                  </div>
                  <div style={s.lucroItem}>
                    <div style={s.lucroLabel}>Venda</div>
                    <div style={s.lucroValor}>R$ {parseFloat(valorVenda).toFixed(2)}</div>
                  </div>
                  <div style={s.lucroItem}>
                    <div style={s.lucroLabel}>Lucro</div>
                    <div style={parseFloat(lucro) >= 0 ? s.lucroValor : s.lucroNeg}>R$ {lucro}</div>
                  </div>
                  <div style={s.lucroItem}>
                    <div style={s.lucroLabel}>Margem</div>
                    <div style={parseFloat(percentualLucro) >= 0 ? s.lucroValor : s.lucroNeg}>{percentualLucro}%</div>
                  </div>
                </div>
              )}

              <div style={{ ...s.row2, marginBottom: 16 }}>
                <div style={{ ...s.fieldWrap, marginBottom: 0 }}>
                  <label style={s.label}>Data de Pagamento <span style={{ color: '#e74c3c' }}>*</span></label>
                  <input
                    style={s.input}
                    type="date"
                    value={dataPagar}
                    onChange={e => setDataPagar(e.target.value)}
                  />
                </div>
                <div style={{ ...s.fieldWrap, marginBottom: 0 }}>
                  <label style={s.label}>Observação</label>
                  <input
                    style={s.input}
                    value={observacao}
                    onChange={e => setObservacao(e.target.value)}
                    placeholder="Opcional..."
                  />
                </div>
              </div>

              <button style={s.btnMain} onClick={registrarEncomenda}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Registrar Encomenda
              </button>

              {mensagem && (
                <div style={mensagem.includes('sucesso') ? s.msgSucesso : s.msgErro}>
                  {mensagem}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* ── Lista de encomendas ── */}
        <div>
          <p style={s.sectionLabel}>Pendentes</p>
          <div style={s.card}>
            <div style={s.listTop}>
              <h3 style={s.listTopTitle}>Encomendas Pendentes</h3>
              <span style={s.badgeCount}>{encomendas.length}</span>
            </div>

            <div style={s.encList}>
              {encomendas.length === 0 && (
                <div style={s.empty}>Nenhuma encomenda pendente</div>
              )}

              {encomendas.map(e => {
                const infoLucro = extrairLucro(e.observacao)
                const descLimpa = e.observacao
                  ?.replace(/ENCOMENDA: /, '')
                  ?.split(' | ')[0]
                  ?.replace(/Custo:.*/, '')
                  ?.replace(/Lucro:.*/, '')
                  ?.trim() || '—'

                return (
                  <div key={e.id} style={s.encCard}>
                    <div style={s.encCorner} />

                    <div style={s.encTop}>
                      <div>
                        <div style={s.encNome}>{e.clientes?.nome}</div>
                        <span style={s.encTag}>Encomenda</span>
                      </div>
                      <div style={s.encValor}>
                        R$ {parseFloat(e.valor_total).toFixed(2)}
                      </div>
                    </div>

                    <p style={s.encDesc}>{descLimpa}</p>

                    <div style={s.encPills}>
                      {infoLucro && (
                        <span style={s.pillGreen}>
                          💰 R$ {infoLucro.valor} · {infoLucro.percentual}%
                        </span>
                      )}
                      {e.data_para_pagar && (
                        <span style={s.pillOrange}>
                          📅 {new Date(e.data_para_pagar + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>

                    <div style={s.encBtns}>
                      <button style={s.btnEntregar} onClick={() => marcarEntregue(e)}>
                        ✅ Entregar
                      </button>
                      <button style={s.btnCancelar} onClick={() => cancelarEncomenda(e.id)}>
                        ❌ Cancelar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Encomendas
