// Importa o hook useState para controlar os dados da tela
import { useState, useEffect } from 'react'
// Importa a conexão com o banco de dados Supabase
import { supabase } from '../supabase'

function Vendas() {
  // Estado para o código digitado na busca de produto
  const [codigoBusca, setCodigoBusca] = useState('')
  // Estado para a lista de itens adicionados na venda atual
  const [itens, setItens] = useState([])
  // Estado para guardar os dados do cliente encontrado
  const [cliente, setCliente] = useState(null)
  // Estado para a data de pagamento da venda
  const [dataPagar, setDataPagar] = useState('')
  // Estado para observações da venda (ex: pagar em 2x)
  const [observacao, setObservacao] = useState('')
  // Estado para exibir mensagens de sucesso ou erro
  const [mensagem, setMensagem] = useState('')
  const [clientes, setClientes] = useState([])

useEffect(() => {
  supabase.from('clientes').select('*').order('nome').then(({ data }) => {
    if (data) setClientes(data)
  })
}, [])

  // Calcula o total somando o subtotal de cada item da venda
  const total = itens.reduce((acc, item) => acc + item.subtotal, 0)

  // Função para buscar produto pelo código digitado
  async function buscarProduto() {
    // Não faz nada se o campo estiver vazio
    if (!codigoBusca) return
    // Busca o produto no banco pelo código exato
    const { data } = await supabase.from('produtos').select('*').eq('codigo', codigoBusca).single()
    // Se não encontrar, exibe mensagem de erro
    if (!data) { setMensagem('Produto não encontrado!'); return }
    // Verifica se o produto já foi adicionado na lista
    const existente = itens.find(i => i.produto_id === data.id)
    if (existente) {
      // Se já existe, aumenta a quantidade em 1 e recalcula o subtotal
      setItens(itens.map(i => i.produto_id === data.id ? {...i, quantidade: i.quantidade + 1, subtotal: (i.quantidade + 1) * i.valor_unitario} : i))
    } else {
      // Se não existe, adiciona o produto na lista com quantidade 1
      setItens([...itens, { produto_id: data.id, nome: data.nome, categoria: data.categoria, valor_unitario: parseFloat(data.preco_venda), quantidade: 1, subtotal: parseFloat(data.preco_venda) }])
    }
    // Limpa o campo de busca após adicionar
    setCodigoBusca('')
    setMensagem('')
  }

  // Função para alterar a quantidade de um item já adicionado
  function alterarQuantidade(id, qtd) {
    // Se a quantidade for menor que 1, remove o item da lista
    if (qtd < 1) { setItens(itens.filter(i => i.produto_id !== id)); return }
    // Atualiza a quantidade e recalcula o subtotal do item
    setItens(itens.map(i => i.produto_id === id ? {...i, quantidade: qtd, subtotal: qtd * i.valor_unitario} : i))
  }

  // Função para finalizar e salvar a venda no banco de dados
  async function finalizarVenda() {
    // Valida se todos os campos obrigatórios estão preenchidos
    if (!cliente || itens.length === 0 || !dataPagar) {
      setMensagem('Adicione produtos, selecione um cliente e a data de pagamento!')
      return
    }
    // Insere o registro principal da venda no banco
    const { data: venda, error } = await supabase.from('vendas').insert({
      cliente_id: cliente.id,       // ID do cliente vinculado
      data_para_pagar: dataPagar,   // Data de vencimento do pagamento
      valor_total: total,           // Valor total calculado automaticamente
      recebido: 0,                  // Inicia com zero pago
      situacao: 'Pendente',         // Situação inicial sempre Pendente
      observacao,                   // Observação opcional
    }).select().single()

    // Se houver erro ao salvar a venda, exibe mensagem
    if (error) { setMensagem('Erro: ' + error.message); return }

    // Para cada item da venda, salva na tabela itens_venda e baixa o estoque
    for (const item of itens) {
      // Salva o item vinculado à venda
      await supabase.from('itens_venda').insert({ venda_id: venda.id, produto_id: item.produto_id, quantidade: item.quantidade, valor_unitario: item.valor_unitario })
      // Busca o estoque atual do produto
      const { data: prod } = await supabase.from('produtos').select('estoque').eq('id', item.produto_id).single()
      // Reduz o estoque pela quantidade vendida
      await supabase.from('produtos').update({ estoque: prod.estoque - item.quantidade }).eq('id', item.produto_id)
    }

    // Exibe mensagem de sucesso e limpa todos os campos
    setMensagem('Venda registrada com sucesso!')
    setItens([])
    setCliente(null)
    setDataPagar('')
    setObservacao('')
  }

  // Estilo padrão reutilizado nos campos de entrada
  const campo = { width:'100%', padding:'10px', marginTop:'6px', borderRadius:'6px', border:'1px solid #ddd' }

  return (
    <div>
      <h2>Nova Venda</h2>
      {/* Layout em duas colunas: produtos à esquerda, dados da venda à direita */}
      <div className="grid-2" style={{marginTop:'16px'}}>

        {/* COLUNA ESQUERDA - Lista de produtos da venda */}
        <div style={{background:'white', padding:'24px', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
          <h3 style={{marginBottom:'16px'}}>Produtos</h3>

          {/* Campo de busca de produto por código */}
          <div style={{display:'flex', gap:'8px', marginBottom:'16px'}}>
            <input
              value={codigoBusca}
              onChange={e => setCodigoBusca(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscarProduto()} // Permite buscar com Enter
              placeholder="Código do produto..."
              style={{...campo, marginTop:0, flex:1}}
            />
            <button onClick={buscarProduto} style={{background:'#1a1a2e', color:'white', border:'none', padding:'10px 16px', borderRadius:'6px', cursor:'pointer'}}>+</button>
          </div>

          {/* Mensagem quando nenhum produto foi adicionado */}
          {itens.length === 0 && <p style={{color:'#aaa', textAlign:'center'}}>Nenhum produto adicionado</p>}

          {/* Lista dos produtos adicionados na venda */}
          {itens.map(item => (
            <div key={item.produto_id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px', background:'#f8f8f8', borderRadius:'8px', marginBottom:'8px'}}>
              <div>
                <strong>{item.nome}</strong><br/>
                <small>{item.categoria} | R$ {item.valor_unitario.toFixed(2)}</small>
              </div>
              {/* Botões para aumentar ou diminuir a quantidade */}
              <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                <button onClick={() => alterarQuantidade(item.produto_id, item.quantidade - 1)} style={{background:'#ddd', border:'none', padding:'4px 10px', borderRadius:'4px', cursor:'pointer'}}>-</button>
                <span>{item.quantidade}</span>
                <button onClick={() => alterarQuantidade(item.produto_id, item.quantidade + 1)} style={{background:'#ddd', border:'none', padding:'4px 10px', borderRadius:'4px', cursor:'pointer'}}>+</button>
                <strong>R$ {item.subtotal.toFixed(2)}</strong>
              </div>
            </div>
          ))}

          {/* Total calculado automaticamente */}
          <div style={{borderTop:'2px solid #eee', marginTop:'16px', paddingTop:'16px', textAlign:'right'}}>
            <strong style={{fontSize:'20px'}}>Total: R$ {total.toFixed(2)}</strong>
          </div>
        </div>

        {/* COLUNA DIREITA - Dados do cliente e finalização */}
        <div style={{background:'white', padding:'24px', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
          <h3 style={{marginBottom:'16px'}}>Dados da Venda</h3>

          {/* Campo de busca de cliente por nome */}
          <div style={{marginBottom:'16px'}}>
            <label>Cliente</label><br/>
            <select
              value={cliente ? cliente.id : ''}
              onChange={e => {
                const selecionado = clientes.find(c => c.id === e.target.value)
                setCliente(selecionado || null)
              }}
              style={campo}
            >
              <option value="">Selecione o cliente...</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          {/* Exibe os dados do cliente encontrado */}
          {cliente && (
            <div style={{background:'#f0f9f0', border:'1px solid #4caf50', borderRadius:'8px', padding:'12px', marginBottom:'16px'}}>
              <strong>✅ {cliente.nome}</strong><br/>
              <small>{cliente.telefone}</small>
            </div>
          )}

          {/* Campo de data de pagamento */}
          <div style={{marginBottom:'16px'}}>
            <label>Data para Pagamento</label><br/>
            <input type="date" value={dataPagar} onChange={e => setDataPagar(e.target.value)} style={campo} />
          </div>

          {/* Campo de observação opcional */}
          <div style={{marginBottom:'24px'}}>
            <label>Observação</label><br/>
            <input value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Ex: Vai pagar em 2x" style={campo} />
          </div>

          {/* Botão para finalizar e salvar a venda */}
          <button onClick={finalizarVenda} style={{background:'#e94560', color:'white', border:'none', padding:'12px 24px', borderRadius:'8px', cursor:'pointer', fontSize:'16px', width:'100%'}}>
            Finalizar Venda
          </button>

          {/* Mensagem de sucesso ou erro */}
          {mensagem && <p style={{marginTop:'16px', color: mensagem.includes('sucesso') ? 'green' : 'red'}}>{mensagem}</p>}
        </div>
      </div>
    </div>
  )
}

export default Vendas