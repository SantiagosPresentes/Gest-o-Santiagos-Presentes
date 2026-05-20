// Importa os hooks necessários
import { useState, useEffect } from 'react'
// Importa a conexão com o Supabase
import { supabase } from '../supabase'

function Devolucoes() {
  // Estado para a lista de clientes cadastrados
  const [clientes, setClientes] = useState([])
  // Estado para o cliente selecionado no dropdown
  const [clienteSelecionado, setClienteSelecionado] = useState('')
  // Estado para a lista de vendas do cliente
  const [vendas, setVendas] = useState([])
  // Estado para a venda selecionada
  const [vendaSelecionada, setVendaSelecionada] = useState(null)
  // Estado para os itens da venda selecionada
  const [itens, setItens] = useState([])
  // Estado para os itens marcados para devolução
  const [itensSelecionados, setItensSelecionados] = useState([])
  // Estado para o motivo da devolução
  const [motivo, setMotivo] = useState('')
  // Estado para mensagens de sucesso ou erro
  const [mensagem, setMensagem] = useState('')

  // Carrega os clientes ao abrir a tela
  useEffect(() => {
    supabase.from('clientes').select('*').order('nome').then(({ data }) => {
      if (data) setClientes(data)
    })
  }, [])

  // Busca as vendas do cliente selecionado
  async function buscarVendas(clienteId) {
    if (!clienteId) return
    const { data } = await supabase
      .from('vendas')
      .select('*, clientes(nome), desconto, valor_bruto')
      .eq('cliente_id', clienteId)
      .order('data_venda', { ascending: false })
    if (!data || data.length === 0) { setMensagem('Nenhuma venda encontrada!'); return }
    setVendas(data)
    setMensagem('')
  }

  // Seleciona uma venda e carrega os itens disponíveis para devolução
  async function selecionarVenda(venda) {
    setVendaSelecionada(venda)

    // Busca os itens da venda com nome e código do produto
    const { data: itensVenda } = await supabase
      .from('itens_venda')
      .select('*, produtos(nome, codigo)')
      .eq('venda_id', venda.id)

    // Busca devoluções já realizadas para essa venda
    const { data: devolucoesFeitas } = await supabase
      .from('devolucoes')
      .select('produto_id, quantidade')
      .eq('venda_id', venda.id)

    // Calcula quantos itens ainda podem ser devolvidos
    const itensDisponiveis = (itensVenda || []).map(item => {
      // Soma a quantidade já devolvida desse produto nessa venda
      const jaDevolvido = (devolucoesFeitas || [])
        .filter(d => d.produto_id === item.produto_id)
        .reduce((acc, d) => acc + d.quantidade, 0)
      // Quantidade disponível para devolução
      const qtdDisponivel = item.quantidade - jaDevolvido
      return { ...item, qtd_disponivel: qtdDisponivel }
    // Filtra apenas itens que ainda têm quantidade disponível para devolver
    }).filter(item => item.qtd_disponivel > 0)

    setItens(itensDisponiveis)
    setItensSelecionados([])
  }

  // Marca ou desmarca um item para devolução
  function toggleItem(item) {
    const existe = itensSelecionados.find(i => i.id === item.id)
    if (existe) {
      // Remove da lista se já estava selecionado
      setItensSelecionados(itensSelecionados.filter(i => i.id !== item.id))
    } else {
      // Adiciona com quantidade 1 por padrão
      setItensSelecionados([...itensSelecionados, { ...item, qtd_devolver: 1 }])
    }
  }

  // Altera a quantidade a devolver de um item
  function alterarQtd(id, qtd) {
    setItensSelecionados(itensSelecionados.map(i => i.id === id ? { ...i, qtd_devolver: qtd } : i))
  }

  // Calcula o valor total da devolução
  const totalDevolver = itensSelecionados.reduce((acc, i) => acc + (i.qtd_devolver * i.valor_unitario), 0)

  // Confirma e registra a devolução
  async function registrarDevolucao() {
    // Valida se pelo menos um item foi selecionado
    if (itensSelecionados.length === 0) { setMensagem('Selecione pelo menos um produto!'); return }
    // Valida se o motivo foi informado
    if (!motivo) { setMensagem('Selecione o motivo da devolução!'); return }

    // Para cada item selecionado, devolve ao estoque e registra na tabela
    for (const item of itensSelecionados) {
      // Busca o estoque atual do produto
      const { data: prod } = await supabase.from('produtos').select('estoque').eq('id', item.produto_id).single()
      // Adiciona a quantidade devolvida ao estoque
      await supabase.from('produtos').update({ estoque: prod.estoque + item.qtd_devolver }).eq('id', item.produto_id)
      // Registra a devolução na tabela devolucoes
      await supabase.from('devolucoes').insert({
        cliente_id: vendaSelecionada.cliente_id,
        produto_id: item.produto_id,
        venda_id: vendaSelecionada.id,
        quantidade: item.qtd_devolver,
        valor_unitario: calcularValorPago(item, vendaSelecionada),
        motivo: motivo
      })
    }

    // Calcula o valor unitário efetivamente pago (com desconto proporcional)
    function calcularValorPago(item, venda) {
      const valorBruto = parseFloat(venda.valor_bruto || 0)
      const proporcao = valorBruto > 0 ? (valorBruto - parseFloat(venda.desconto || 0)) / valorBruto : 1
      return parseFloat(item.valor_unitario) * proporcao
    }

    // Calcula o valor total da devolução com base no valor pago real
    const totalDevolver = itensSelecionados.reduce((acc, i) => {
      const valorPago = calcularValorPago(i, vendaSelecionada)
      return acc + (i.qtd_devolver * valorPago)
    }, 0)

    // Atualiza o valor total e recebido da venda
    const novoRecebido = Math.max(0, parseFloat(vendaSelecionada.recebido) - totalDevolver)
    const novoTotal = Math.max(0, parseFloat(vendaSelecionada.valor_total) - totalDevolver)
    await supabase.from('vendas').update({
      valor_total: novoTotal,
      recebido: novoRecebido,
      observacao: (vendaSelecionada.observacao || '') + ` | Devolução (${motivo}): R$ ${totalDevolver.toFixed(2)}`
    }).eq('id', vendaSelecionada.id)

    // Exibe mensagem de sucesso e limpa os campos
    setMensagem(`Devolução registrada! Motivo: ${motivo} | Valor a devolver: R$ ${totalDevolver.toFixed(2)}`)
    setVendaSelecionada(null)
    setItens([])
    setItensSelecionados([])
    setVendas([])
    setClienteSelecionado('')
    setMotivo('')
  }

  // Estilo padrão dos campos
  const campo = { width:'100%', padding:'10px', marginTop:'6px', borderRadius:'6px', border:'1px solid #ddd' }

  return (
    <div>
      <h2>Devoluções</h2>
      <div style={{background:'white', padding:'24px', borderRadius:'12px', maxWidth:'700px', marginTop:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>

        {/* Dropdown de seleção de cliente */}
        <div style={{marginBottom:'16px'}}>
          <label style={{fontWeight:'bold', fontSize:'13px'}}>Cliente</label><br/>
          <select
            value={clienteSelecionado}
            onChange={e => {
              setClienteSelecionado(e.target.value)
              setVendas([])
              setVendaSelecionada(null)
              setItens([])
              setItensSelecionados([])
              buscarVendas(e.target.value)
            }}
            style={campo}
          >
            <option value="">Selecione o cliente...</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>

        {/* Lista de vendas do cliente para seleção */}
        {vendas.length > 0 && !vendaSelecionada && (
          <div style={{marginBottom:'16px'}}>
            <label style={{fontWeight:'bold', fontSize:'13px'}}>Selecione a venda:</label>
            {vendas.map(v => (
              <div
                key={v.id}
                onClick={() => selecionarVenda(v)}
                style={{padding:'12px', border:'1px solid #ddd', borderRadius:'8px', marginTop:'8px', cursor:'pointer', background:'#f8f8f8'}}
              >
                <strong>{v.clientes?.nome}</strong> — R$ {parseFloat(v.valor_total).toFixed(2)} — {v.situacao}<br/>
                <small style={{color:'#666'}}>Vencimento: {v.data_para_pagar ? new Date(v.data_para_pagar + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</small>
              </div>
            ))}
          </div>
        )}

        {/* Área de seleção de itens após escolher a venda */}
        {vendaSelecionada && (
          <div>
            {/* Exibe a venda selecionada */}
            <div style={{background:'#f0f9f0', border:'1px solid #4caf50', borderRadius:'8px', padding:'12px', marginBottom:'16px'}}>
              <strong>✅ Venda selecionada</strong> — {vendaSelecionada.clientes?.nome} — R$ {parseFloat(vendaSelecionada.valor_total).toFixed(2)}
            </div>

            {/* Lista de itens disponíveis para devolução */}
            <label style={{fontWeight:'bold', fontSize:'13px'}}>Selecione os produtos a devolver:</label>

            {itens.length === 0 && (
              <p style={{color:'#e94560', marginTop:'8px', fontSize:'14px'}}>
                ⚠️ Todos os itens desta venda já foram devolvidos anteriormente.
              </p>
            )}

            {itens.map(item => {
              const selecionado = itensSelecionados.find(i => i.id === item.id)
              return (
                <div key={item.id} style={{padding:'12px', border:`1px solid ${selecionado ? '#e94560' : '#ddd'}`, borderRadius:'8px', marginTop:'8px', background: selecionado ? '#fff0f3' : '#f8f8f8'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div>
                      {/* Checkbox para selecionar o item */}
                      <input type="checkbox" checked={!!selecionado} onChange={() => toggleItem(item)} style={{marginRight:'8px'}}/>
                      <strong>{item.produtos?.nome}</strong><br/>
                      <small style={{color:'#666', marginLeft:'24px'}}>
                        Disponível para devolução: {item.qtd_disponivel} un. — R$ {parseFloat(item.valor_unitario).toFixed(2)} cada
                      </small>
                    </div>
                    {/* Campo de quantidade — aparece apenas quando o item está selecionado */}
                    {selecionado && (
                      <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                        <label style={{fontSize:'12px'}}>Qtd:</label>
                        <input
                          type="number"
                          min="1"
                          max={item.qtd_disponivel}
                          value={selecionado.qtd_devolver}
                          onChange={e => alterarQtd(item.id, parseInt(e.target.value))}
                          style={{width:'60px', padding:'4px', borderRadius:'4px', border:'1px solid #ddd'}}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Campo de motivo da devolução */}
            {itens.length > 0 && (
              <div style={{marginTop:'16px'}}>
                <label style={{fontWeight:'bold', fontSize:'13px'}}>Motivo da Devolução</label><br/>
                <select value={motivo} onChange={e => setMotivo(e.target.value)} style={campo}>
                  <option value="">Selecione o motivo...</option>
                  <option value="Desistência">Desistência</option>
                  <option value="Código Errado">Código Errado</option>
                  <option value="Produto Danificado">Produto Danificado</option>
                </select>
              </div>
            )}

            {/* Exibe o valor total a devolver */}
            {itensSelecionados.length > 0 && (
              <div style={{marginTop:'16px', padding:'16px', background:'#fff3f3', borderRadius:'8px', border:'1px solid #e94560'}}>
                <strong>💰 Valor a devolver ao cliente: R$ {totalDevolver.toFixed(2)}</strong>
              </div>
            )}

            {/* Botão de confirmar devolução */}
            {itens.length > 0 && (
              <button
                onClick={registrarDevolucao}
                style={{background:'#e94560', color:'white', border:'none', padding:'12px 24px', borderRadius:'8px', cursor:'pointer', fontSize:'16px', width:'100%', marginTop:'16px', fontWeight:'bold'}}
              >
                Confirmar Devolução
              </button>
            )}

            {/* Botão de cancelar */}
            <button
              onClick={() => {
                setVendaSelecionada(null)
                setItens([])
                setItensSelecionados([])
                setMotivo('')
              }}
              style={{background:'#eee', color:'#333', border:'none', padding:'12px 24px', borderRadius:'8px', cursor:'pointer', fontSize:'14px', width:'100%', marginTop:'8px'}}
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Mensagem de sucesso ou erro */}
        {mensagem && (
          <p style={{marginTop:'16px', color: mensagem.includes('registrada') ? 'green' : 'red', fontSize:'14px'}}>
            {mensagem}
          </p>
        )}
      </div>
    </div>
  )
}

export default Devolucoes