import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function Historico() {
  const [vendas, setVendas] = useState([])
  const [devolucoes, setDevolucoes] = useState([])
  const [filtroSituacao, setFiltroSituacao] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [clientes, setClientes] = useState([])
  const [vendaExpandida, setVendaExpandida] = useState(null)
  const [pagamentoVenda, setPagamentoVenda] = useState(null)
  const [valorPago, setValorPago] = useState('')
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    carregarDados()

    supabase
      .from('clientes')
      .select('*')
      .order('nome')
      .then(({ data }) => {
        if (data) setClientes(data)
      })
  }, [])

  function calcularSituacao(venda) {
    if (parseFloat(venda.recebido) >= parseFloat(venda.valor_total)) return 'Pago'

    if (!venda.data_para_pagar) return 'Pendente'

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const vencimento = new Date(venda.data_para_pagar + 'T12:00:00')

    if (hoje > vencimento) return 'Atrasado'

    return 'Pendente'
  }

  async function carregarDados() {
    const { data: vendasData } = await supabase
      .from('vendas')
      .select('*, clientes(nome, telefone)')
      .order('data_venda', { ascending: false })

    const { data: devolucoesData } = await supabase
      .from('devolucoes')
      .select('*, clientes(nome), produtos(nome)')
      .order('criado_em', { ascending: false })

    if (vendasData) {
      const vendasComItens = await Promise.all(
        vendasData.map(async (venda) => {
          const { data: itens } = await supabase
            .from('itens_venda')
            .select('*, produtos(nome)')
            .eq('venda_id', venda.id)

          return {
            ...venda,
            itens: itens || [],
            situacao_real: calcularSituacao(venda)
          }
        })
      )

      setVendas(vendasComItens)
    }

    if (devolucoesData) setDevolucoes(devolucoesData)
  }

  async function registrarPagamento() {
    if (!valorPago || parseFloat(valorPago) <= 0) {
      setMensagem('Digite um valor válido!')
      return
    }

    const novoRecebido =
      parseFloat(pagamentoVenda.recebido || 0) + parseFloat(valorPago)

    const novaSituacao =
      novoRecebido >= parseFloat(pagamentoVenda.valor_total)
        ? 'Pago'
        : 'Pendente'

    const { error } = await supabase
      .from('vendas')
      .update({
        recebido: novoRecebido,
        situacao: novaSituacao
      })
      .eq('id', pagamentoVenda.id)

    if (error) {
      setMensagem('Erro: ' + error.message)
      return
    }

    setMensagem('Pagamento registrado com sucesso!')
    setPagamentoVenda(null)
    setValorPago('')
    carregarDados()
  }

  const vendasFiltradas = vendas.filter(v => {
    if (filtroCliente && v.cliente_id !== filtroCliente) return false
    if (filtroSituacao && v.situacao_real !== filtroSituacao) return false
    if (filtroDataInicio && v.data_para_pagar < filtroDataInicio) return false
    if (filtroDataFim && v.data_para_pagar > filtroDataFim) return false

    return true
  })

  function corSituacao(situacao) {
    if (situacao === 'Pago') {
      return {
        background: '#e8f5e9',
        color: 'green'
      }
    }

    if (situacao === 'Atrasado') {
      return {
        background: '#ffebee',
        color: 'red'
      }
    }

    return {
      background: '#fff8e1',
      color: '#f57f17'
    }
  }

  function devolucoesVenda(vendaId) {
    return devolucoes.filter(d => d.venda_id === vendaId)
  }

  const campo = {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '14px'
  }

  return (
    <div>
      <h2>Histórico Geral</h2>

      {/* Modal de registro de pagamento */}
      {pagamentoVenda && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '32px',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '400px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
          >
            <h3 style={{ marginBottom: '8px' }}>
              Registrar Pagamento
            </h3>

            <p
              style={{
                color: '#666',
                marginBottom: '16px',
                fontSize: '14px'
              }}
            >
              Cliente: <strong>{pagamentoVenda.clientes?.nome}</strong>
              <br />

              Total:{' '}
              <strong>
                R$ {parseFloat(pagamentoVenda.valor_total).toFixed(2)}
              </strong>

              <br />

              Já recebido:{' '}
              <strong style={{ color: 'green' }}>
                R$ {parseFloat(pagamentoVenda.recebido || 0).toFixed(2)}
              </strong>

              <br />

              Falta:{' '}
              <strong style={{ color: 'red' }}>
                R$
                {(
                  parseFloat(pagamentoVenda.valor_total) -
                  parseFloat(pagamentoVenda.recebido || 0)
                ).toFixed(2)}
              </strong>
            </p>

            <label style={{ fontSize: '14px' }}>
              Valor recebido agora (R$)
            </label>

            <br />

            <input
              type="number"
              value={valorPago}
              onChange={e => setValorPago(e.target.value)}
              placeholder="Ex: 50.00"
              style={{
                width: '100%',
                padding: '10px',
                marginTop: '6px',
                marginBottom: '16px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                fontSize: '16px'
              }}
              autoFocus
            />

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={registrarPagamento}
                style={{
                  flex: 1,
                  background: '#1a6b5a',
                  color: 'white',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 'bold'
                }}
              >
                Confirmar Pagamento
              </button>

              <button
                onClick={() => {
                  setPagamentoVenda(null)
                  setValorPago('')
                  setMensagem('')
                }}
                style={{
                  flex: 1,
                  background: '#eee',
                  color: '#333',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '15px'
                }}
              >
                Cancelar
              </button>
            </div>

            {mensagem && (
              <p
                style={{
                  marginTop: '12px',
                  color: mensagem.includes('sucesso')
                    ? 'green'
                    : 'red',
                  fontSize: '14px'
                }}
              >
                {mensagem}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Barra de filtros */}
      <div
        style={{
          background: 'white',
          padding: '16px 24px',
          borderRadius: '12px',
          marginTop: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}
      >
        <div>
          <label style={{ fontSize: '13px', color: '#666' }}>
            Situação
          </label>

          <br />

          <select
            value={filtroSituacao}
            onChange={e => setFiltroSituacao(e.target.value)}
            style={campo}
          >
            <option value="">Todas</option>
            <option value="Pendente">Pendente</option>
            <option value="Atrasado">Atrasado</option>
            <option value="Pago">Pago</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '13px', color: '#666' }}>
            Data de pagamento (de)
          </label>

          <br />

          <input
            type="date"
            value={filtroDataInicio}
            onChange={e => setFiltroDataInicio(e.target.value)}
            style={campo}
          />
        </div>

        <div>
          <label style={{ fontSize: '13px', color: '#666' }}>
            Data de pagamento (até)
          </label>

          <br />

          <input
            type="date"
            value={filtroDataFim}
            onChange={e => setFiltroDataFim(e.target.value)}
            style={campo}
          />
        </div>

        <div>
          <label style={{ fontSize: '13px', color: '#666' }}>
            Cliente
          </label>

          <br />

          <select
            value={filtroCliente}
            onChange={e => setFiltroCliente(e.target.value)}
            style={campo}
          >
            <option value="">Todos</option>

            {clientes.map(c => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: '18px' }}>
          <button
            onClick={() => {
              setFiltroSituacao('')
              setFiltroDataInicio('')
              setFiltroDataFim('')
              setFiltroCliente('')
            }}
            style={{
              background: '#eee',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Limpar Filtros
          </button>
        </div>

        <div
          style={{
            marginTop: '18px',
            marginLeft: 'auto',
            color: '#666',
            fontSize: '14px'
          }}
        >
          {vendasFiltradas.length} venda(s) encontrada(s)
        </div>
      </div>

      {/* Mensagem */}
      {mensagem && !pagamentoVenda && (
        <div
          style={{
            background: '#e8f5e9',
            border: '1px solid #4caf50',
            borderRadius: '8px',
            padding: '12px 16px',
            marginTop: '12px',
            color: 'green'
          }}
        >
          {mensagem}
        </div>
      )}

      {/* Tabela */}
      <div className="tabela-wrapper" style={{ marginTop: '16px' }}>
        <table style={{ minWidth: '1200px' }}>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Produtos</th>
              <th>Total</th>
              <th>Recebido</th>
              <th>Falta</th>
              <th>Vencimento</th>
              <th>Situação</th>
              <th>Observação</th>
              <th>Ação</th>
            </tr>
          </thead>

          <tbody>
            {vendasFiltradas.map((venda, i) => {
              const devs = devolucoesVenda(venda.id)

              return (
                <React.Fragment key={venda.id}>
                  <tr
                    style={{
                      background: i % 2 === 0 ? '#fff' : '#f9f9f9',
                      borderBottom: '1px solid #eee'
                    }}
                  >
                    <td>
                      <strong>{venda.clientes?.nome}</strong>
                      <br />

                      <small style={{ color: '#888' }}>
                        {venda.clientes?.telefone}
                      </small>
                    </td>

                    <td>
                      <span
                        onClick={() =>
                          setVendaExpandida(
                            vendaExpandida === venda.id
                              ? null
                              : venda.id
                          )
                        }
                        style={{
                          cursor: 'pointer',
                          color: '#1a1a2e',
                          textDecoration: 'underline',
                          fontSize: '13px'
                        }}
                      >
                        {venda.itens?.length} produto(s) — ver detalhes
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <strong>
                        R$ {parseFloat(venda.valor_total).toFixed(2)}
                      </strong>
                    </td>

                    <td
                      style={{
                        textAlign: 'right',
                        color: 'green'
                      }}
                    >
                      R$ {parseFloat(venda.recebido || 0).toFixed(2)}
                    </td>

                    <td
                      style={{
                        textAlign: 'right',
                        color: 'red'
                      }}
                    >
                      R$
                      {(
                        parseFloat(venda.valor_total) -
                        parseFloat(venda.recebido || 0)
                      ).toFixed(2)}
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      {venda.data_para_pagar
                        ? new Date(
                            venda.data_para_pagar + 'T12:00:00'
                          ).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          ...corSituacao(venda.situacao_real),
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      >
                        {venda.situacao_real}
                      </span>
                    </td>

                    <td style={{ fontSize: '13px', color: '#555' }}>
                      {venda.observacao || '—'}
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      {venda.situacao_real !== 'Pago' && (
                        <button
                          onClick={() => {
                            setPagamentoVenda(venda)
                            setMensagem('')
                          }}
                          style={{
                            background: '#1a6b5a',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        >
                          💰 Pagar
                        </button>
                      )}

                      {venda.situacao_real === 'Pago' && (
                        <span
                          style={{
                            color: 'green',
                            fontSize: '13px'
                          }}
                        >
                          ✅ Quitado
                        </span>
                      )}
                    </td>
                  </tr>

                  {vendaExpandida === venda.id && (
                    <tr>
                      <td
                        colSpan="9"
                        style={{
                          padding: '0 16px 12px 32px',
                          background: '#f0f4ff'
                        }}
                      >
                        <strong style={{ fontSize: '13px' }}>
                          Produtos desta venda:
                        </strong>

                        <div
                          style={{
                            marginTop: '8px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px'
                          }}
                        >
                          {venda.itens?.map(item => (
                            <span
                              key={item.id}
                              style={{
                                background: 'white',
                                border: '1px solid #ddd',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '13px'
                              }}
                            >
                              {item.produtos?.nome} — {item.quantidade}x —
                              R$ {parseFloat(item.valor_unitario).toFixed(2)}
                            </span>
                          ))}
                        </div>

                        {devs.length > 0 && (
                          <div style={{ marginTop: '12px' }}>
                            <strong
                              style={{
                                fontSize: '13px',
                                color: '#e94560'
                              }}
                            >
                              Devoluções:
                            </strong>

                            <div
                              style={{
                                marginTop: '6px',
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '8px'
                              }}
                            >
                              {devs.map(d => (
                                <span
                                  key={d.id}
                                  style={{
                                    background: '#fff0f3',
                                    border: '1px solid #e94560',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '13px'
                                  }}
                                >
                                  {d.produtos?.nome} — {d.quantidade}x —
                                  R$ {parseFloat(d.valor_total).toFixed(2)} —
                                  {d.motivo}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>

        {vendasFiltradas.length === 0 && (
          <p
            style={{
              textAlign: 'center',
              padding: '32px',
              color: '#aaa'
            }}
          >
            Nenhuma venda encontrada
          </p>
        )}
      </div>
    </div>
  )
}

export default Historico