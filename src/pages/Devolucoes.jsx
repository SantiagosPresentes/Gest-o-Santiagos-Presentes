// Importa o hook useState para controlar os dados da tela
import { useState, useEffect } from 'react'
// Importa a conexão com o banco de dados Supabase
import { supabase } from '../supabase'

function Devolucoes() {
  // Estado para o nome digitado na busca do cliente
  const [clientes, setClientes] = useState([])
  const [clienteSelecionado, setClienteSelecionado] = useState('')
  // Estado para guardar a lista de vendas encontradas do cliente
  const [vendas, setVendas] = useState([])
  // Estado para guardar a venda que foi selecionada
  const [vendaSelecionada, setVendaSelecionada] = useState(null)
  // Estado para guardar os itens da venda selecionada
  const [itens, setItens] = useState([])
  // Estado para guardar os itens que serão devolvidos
  const [itensSelecionados, setItensSelecionados] = useState([])
  // Estado para o motivo da devolução
  const [motivo, setMotivo] = useState('')
  // Estado para exibir mensagens de sucesso ou erro
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
  buscarClientes()
}, [])

async function buscarClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('nome', { ascending: true })
  if (error) {
    setMensagem('Erro ao buscar clientes')
    return
  }
  setClientes(data)
}

  // Função para buscar vendas pelo nome do cliente
  async function buscarVendas(clienteId) {
    if (!clienteId) return
    const { data } = await supabase
      .from('vendas')
      .select('*, clientes(nome)')
      .eq('cliente_id', clienteId)
      .order('data_venda', { ascending: false })
    if (!data || data.length === 0) { setMensagem('Nenhuma venda encontrada!'); return }
    setVendas(data)
    setMensagem('')
  }

  // Função chamada quando o usuário clica em uma venda para selecionar
  async function selecionarVenda(venda) {
    // Salva a venda selecionada
    setVendaSelecionada(venda)
    // Busca os itens dessa venda trazendo também o nome e código do produto
    const { data } = await supabase.from('itens_venda').select('*, produtos(nome, codigo)').eq('venda_id', venda.id)
    // Salva os itens encontrados
    if (data) setItens(data)
    // Limpa os itens selecionados anteriormente
    setItensSelecionados([])
  }

  // Função para marcar ou desmarcar um item para devolução
  function toggleItem(item) {
    // Verifica se o item já está na lista de selecionados
    const existe = itensSelecionados.find(i => i.id === item.id)
    if (existe) {
      // Se já existe, remove da lista
      setItensSelecionados(itensSelecionados.filter(i => i.id !== item.id))
    } else {
      // Se não existe, adiciona com quantidade 1 por padrão
      setItensSelecionados([...itensSelecionados, { ...item, qtd_devolver: 1 }])
    }
  }

  // Função para alterar a quantidade a ser devolvida de um item
  function alterarQtd(id, qtd) {
    setItensSelecionados(itensSelecionados.map(i => i.id === id ? { ...i, qtd_devolver: qtd } : i))
  }

  // Calcula o valor total a ser devolvido ao cliente
  const totalDevolver = itensSelecionados.reduce((acc, i) => acc + (i.qtd_devolver * i.valor_unitario), 0)

  // Função para confirmar e registrar a devolução
  async function registrarDevolucao() {
    // Valida se pelo menos um item foi selecionado
    if (itensSelecionados.length === 0) { setMensagem('Selecione pelo menos um produto!'); return }
    // Valida se o motivo foi informado
    if (!motivo) { setMensagem('Selecione o motivo da devolução!'); return }

    // Para cada item selecionado, devolve a quantidade ao estoque e salva na tabela devolucoes
for (const item of itensSelecionados) {
  // Busca o estoque atual do produto
  const { data: prod } = await supabase.from('produtos').select('estoque').eq('id', item.produto_id).single()
  // Adiciona a quantidade devolvida ao estoque
  await supabase.from('produtos').update({ estoque: prod.estoque + item.qtd_devolver }).eq('id', item.produto_id)
  // Registra a devolução na tabela devolucoes
  await supabase.from('devolucoes').insert({
    cliente_id: vendaSelecionada.cliente_id,  // ID do cliente que devolveu
    produto_id: item.produto_id,              // ID do produto devolvido
    venda_id: vendaSelecionada.id,            // ID da venda original
    quantidade: item.qtd_devolver,            // Quantidade devolvida
    valor_unitario: item.valor_unitario,      // Valor unitário do produto
    motivo: motivo                            // Motivo informado pelo usuário
  })
}

    // Recalcula o valor recebido descontando o valor devolvido
    const novoRecebido = Math.max(0, parseFloat(vendaSelecionada.recebido) - totalDevolver)
    // Recalcula o valor total da venda descontando o valor devolvido
    const novoTotal = Math.max(0, parseFloat(vendaSelecionada.valor_total) - totalDevolver)

    // Atualiza a venda no banco com os novos valores e registra o motivo na observação
    await supabase.from('vendas').update({
      valor_total: novoTotal,
      recebido: novoRecebido,
      // Adiciona o motivo da devolução na observação da venda
      observacao: (vendaSelecionada.observacao || '') + ` | Devolução (${motivo}): R$ ${totalDevolver.toFixed(2)}`
    }).eq('id', vendaSelecionada.id)

    // Exibe mensagem de sucesso com o valor a devolver
    setMensagem(`Devolução registrada! Motivo: ${motivo} | Valor a devolver ao cliente: R$ ${totalDevolver.toFixed(2)}`)

    // Limpa todos os campos após a devolução
    setVendaSelecionada(null)
    setItens([])
    setItensSelecionados([])
    setVendas([])
    setClienteSelecionado('')
    setMotivo('')
  }

  // Estilo padrão reutilizado nos campos de entrada
  const campo = { width:'100%', padding:'10px', marginTop:'6px', borderRadius:'6px', border:'1px solid #ddd' }

  return (
    <div>
      <h2>Devoluções</h2>
      <div style={{background:'white', padding:'24px', borderRadius:'12px', maxWidth:'700px', marginTop:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>

        {/* Campo de busca do cliente */}
        <div style={{marginBottom:'16px'}}>
          <label>Cliente</label><br/>
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

        {/* Lista de vendas encontradas para seleção */}
        {vendas.length > 0 && !vendaSelecionada && (
          <div style={{marginBottom:'16px'}}>
            <label>Selecione a venda:</label>
            {vendas.map(v => (
              <div key={v.id} onClick={() => selecionarVenda(v)} style={{padding:'12px', border:'1px solid #ddd', borderRadius:'8px', marginTop:'8px', cursor:'pointer', background:'#f8f8f8'}}>
                <strong>{v.clientes?.nome}</strong> — R$ {parseFloat(v.valor_total).toFixed(2)} — {v.situacao}<br/>
                <small>Vencimento: {v.data_para_pagar}</small>
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

            {/* Lista de produtos da venda para selecionar quais serão devolvidos */}
            <label>Selecione os produtos devolvidos:</label>
            {itens.map(item => {
              const selecionado = itensSelecionados.find(i => i.id === item.id)
              return (
                <div key={item.id} style={{padding:'12px', border:`1px solid ${selecionado ? '#e94560' : '#ddd'}`, borderRadius:'8px', marginTop:'8px', background: selecionado ? '#fff0f3' : '#f8f8f8'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div>
                      {/* Checkbox para selecionar o item */}
                      <input type="checkbox" checked={!!selecionado} onChange={() => toggleItem(item)} style={{marginRight:'8px'}}/>
                      <strong>{item.produtos?.nome}</strong> — {item.quantidade} un. — R$ {parseFloat(item.valor_unitario).toFixed(2)} cada
                    </div>
                    {/* Campo de quantidade a devolver, aparece só quando o item está selecionado */}
                    {selecionado && (
                      <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                        <label>Qtd:</label>
                        <input type="number" min="1" max={item.quantidade} value={selecionado.qtd_devolver} onChange={e => alterarQtd(item.id, parseInt(e.target.value))} style={{width:'60px', padding:'4px', borderRadius:'4px', border:'1px solid #ddd'}}/>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Campo de motivo da devolução */}
            <div style={{marginTop:'16px'}}>
              <label>Motivo da Devolução</label><br/>
              <select value={motivo} onChange={e => setMotivo(e.target.value)} style={campo}>
                <option value="">Selecione o motivo...</option>
                <option value="Desistência">Desistência</option>
                <option value="Código Errado">Código Errado</option>
                <option value="Produto Danificado">Produto Danificado</option>
              </select>
            </div>

            {/* Exibe o valor total a devolver quando há itens selecionados */}
            {itensSelecionados.length > 0 && (
              <div style={{marginTop:'16px', padding:'16px', background:'#fff3f3', borderRadius:'8px', border:'1px solid #e94560'}}>
                <strong>💰 Valor a devolver ao cliente: R$ {totalDevolver.toFixed(2)}</strong>
              </div>
            )}

            {/* Botão para confirmar a devolução */}
            <button onClick={registrarDevolucao} style={{background:'#e94560', color:'white', border:'none', padding:'12px 24px', borderRadius:'8px', cursor:'pointer', fontSize:'16px', width:'100%', marginTop:'16px'}}>
              Confirmar Devolução
            </button>

            {/* Botão para cancelar e voltar */}
            <button onClick={() => { setVendaSelecionada(null); setItens([]); setItensSelecionados([]); setMotivo('') }} style={{background:'#ccc', color:'#333', border:'none', padding:'12px 24px', borderRadius:'8px', cursor:'pointer', fontSize:'14px', width:'100%', marginTop:'8px'}}>
              Cancelar
            </button>
          </div>
        )}

        {/* Mensagem de sucesso ou erro */}
        {mensagem && <p style={{marginTop:'16px', color: mensagem.includes('registrada') ? 'green' : 'red'}}>{mensagem}</p>}
      </div>
    </div>
  )
}

export default Devolucoes