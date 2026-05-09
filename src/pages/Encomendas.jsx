import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

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

  // Calcula o lucro baseado no custo e venda
  const lucro = valorCusto && valorVenda
    ? (parseFloat(valorVenda) - parseFloat(valorCusto)).toFixed(2)
    : null

  const percentualLucro = valorCusto && valorVenda && parseFloat(valorCusto) > 0
    ? (((parseFloat(valorVenda) - parseFloat(valorCusto)) / parseFloat(valorCusto)) * 100).toFixed(1)
    : null

  async function registrarEncomenda() {
    if (!cliente || !descricao || !valorVenda || !dataPagar) {
      setMensagem('Preencha todos os campos obrigatórios!')
      return
    }

    // Monta a observação com informações de custo e lucro
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

  // Extrai o lucro da observação para exibir na lista
  function extrairLucro(obs) {
    if (!obs) return null
    const match = obs.match(/Lucro: R\$ ([\d.]+) \(([\d.]+)%\)/)
    if (match) return { valor: match[1], percentual: match[2] }
    return null
  }

  const campo = { width:'100%', padding:'10px', marginTop:'6px', borderRadius:'6px', border:'1px solid #ddd' }

  return (
    <div>
      <h2>Encomendas</h2>

      {/* FORMULÁRIO — sempre no topo */}
      <div style={{background:'white', padding:'24px', borderRadius:'12px', marginTop:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', borderTop:'3px solid #29abe2'}}>
        <h3 style={{color:'#29abe2', marginBottom:'20px'}}>Nova Encomenda</h3>

        {/* Grid responsivo — 2 colunas no desktop, 1 no mobile */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'16px'}}>

          <div>
            <label style={{fontWeight:'bold', fontSize:'13px'}}>Cliente *</label><br/>
            <select
              value={cliente ? cliente.id : ''}
              onChange={e => setCliente(clientes.find(c => c.id === e.target.value) || null)}
              style={campo}
            >
              <option value="">Selecione o cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div>
            <label style={{fontWeight:'bold', fontSize:'13px'}}>Descrição do Produto *</label><br/>
            <input
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Ex: Jogo de cama casal azul"
              style={campo}
            />
          </div>

          <div>
            <label style={{fontWeight:'bold', fontSize:'13px'}}>Preço de Custo (R$)</label><br/>
            <input
              type="number"
              value={valorCusto}
              onChange={e => setValorCusto(e.target.value)}
              placeholder="Ex: 80.00"
              style={campo}
            />
          </div>

          <div>
            <label style={{fontWeight:'bold', fontSize:'13px'}}>Preço de Venda (R$) *</label><br/>
            <input
              type="number"
              value={valorVenda}
              onChange={e => setValorVenda(e.target.value)}
              placeholder="Ex: 150.00"
              style={campo}
            />
          </div>

          <div>
            <label style={{fontWeight:'bold', fontSize:'13px'}}>Data para Pagamento *</label><br/>
            <input
              type="date"
              value={dataPagar}
              onChange={e => setDataPagar(e.target.value)}
              style={campo}
            />
          </div>

          <div>
            <label style={{fontWeight:'bold', fontSize:'13px'}}>Observação (opcional)</label><br/>
            <input
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Ex: Cliente busca na próxima semana"
              style={campo}
            />
          </div>
        </div>

        {/* Card de lucro — aparece quando preencher custo e venda */}
        {lucro !== null && (
          <div style={{
            marginTop:'16px',
            padding:'16px',
            borderRadius:'10px',
            background: parseFloat(lucro) >= 0 ? '#e8f5e9' : '#ffebee',
            border: `1px solid ${parseFloat(lucro) >= 0 ? '#4caf50' : '#ef5350'}`,
            display:'grid',
            gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))',
            gap:'12px'
          }}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'12px', color:'#666'}}>Custo</div>
              <div style={{fontSize:'18px', fontWeight:'bold', color:'#555'}}>R$ {parseFloat(valorCusto).toFixed(2)}</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'12px', color:'#666'}}>Venda</div>
              <div style={{fontSize:'18px', fontWeight:'bold', color:'#1a6b5a'}}>R$ {parseFloat(valorVenda).toFixed(2)}</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'12px', color:'#666'}}>Lucro</div>
              <div style={{fontSize:'18px', fontWeight:'bold', color: parseFloat(lucro) >= 0 ? '#2e7d32' : '#c62828'}}>
                R$ {lucro}
              </div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'12px', color:'#666'}}>Margem</div>
              <div style={{fontSize:'18px', fontWeight:'bold', color: parseFloat(percentualLucro) >= 0 ? '#2e7d32' : '#c62828'}}>
                {percentualLucro}%
              </div>
            </div>
          </div>
        )}

        <button
          onClick={registrarEncomenda}
          style={{
            marginTop:'20px',
            width:'100%',
            background:'linear-gradient(135deg, #1a6b5a, #145a4a)',
            color:'white',
            border:'none',
            padding:'14px',
            borderRadius:'8px',
            cursor:'pointer',
            fontSize:'15px',
            fontWeight:'bold',
            boxShadow:'0 3px 10px rgba(26,107,90,0.35)'
          }}
        >
          Registrar Encomenda
        </button>

        {mensagem && (
          <p style={{marginTop:'16px', color: mensagem.includes('sucesso') ? 'green' : 'red', fontSize:'14px'}}>
            {mensagem}
          </p>
        )}
      </div>

      {/* LISTA DE ENCOMENDAS — sempre abaixo */}
      <div style={{background:'white', padding:'24px', borderRadius:'12px', marginTop:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
        <h3 style={{color:'#29abe2', marginBottom:'16px'}}>
          Encomendas Pendentes ({encomendas.length})
        </h3>

        {encomendas.length === 0 && (
          <p style={{textAlign:'center', color:'#aaa', padding:'32px'}}>Nenhuma encomenda pendente</p>
        )}

        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'12px'}}>
          {encomendas.map(e => {
            const infoLucro = extrairLucro(e.observacao)
            return (
              <div key={e.id} style={{padding:'16px', background:'#f0f8ff', borderRadius:'12px', borderLeft:'4px solid #29abe2'}}>

                {/* Cabeçalho do card */}
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px'}}>
                  <div>
                    <strong style={{fontSize:'14px'}}>{e.clientes?.nome}</strong>
                    <span style={{background:'#29abe2', color:'white', fontSize:'11px', padding:'2px 8px', borderRadius:'10px', marginLeft:'8px'}}>
                      Encomenda
                    </span>
                  </div>
                  <strong style={{color:'#1a6b5a', fontSize:'15px', whiteSpace:'nowrap', marginLeft:'8px'}}>
                    R$ {parseFloat(e.valor_total).toFixed(2)}
                  </strong>
                </div>

                {/* Descrição */}
                <p style={{fontSize:'13px', color:'#555', marginBottom:'8px', lineHeight:'1.5'}}>
                  {e.observacao?.replace(/Custo:.*?\|/, '').replace(/Lucro:.*?\|/, '').replace('ENCOMENDA: ', '').split('|')[0].trim()}
                </p>

                {/* Lucro se disponível */}
                {infoLucro && (
                  <div style={{display:'flex', gap:'8px', marginBottom:'8px'}}>
                    <span style={{background:'#e8f5e9', color:'#2e7d32', fontSize:'12px', padding:'3px 10px', borderRadius:'10px', fontWeight:'bold'}}>
                      💰 Lucro: R$ {infoLucro.valor} ({infoLucro.percentual}%)
                    </span>
                  </div>
                )}

                {/* Vencimento */}
                <p style={{fontSize:'12px', color:'#888', marginBottom:'12px'}}>
                  📅 Vencimento: {e.data_para_pagar ? new Date(e.data_para_pagar + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                </p>

                {/* Botões */}
                <div style={{display:'flex', gap:'8px'}}>
                  <button
                    onClick={() => marcarEntregue(e)}
                    style={{
                      flex:1,
                      background:'linear-gradient(135deg, #1a6b5a, #145a4a)',
                      color:'white',
                      border:'none',
                      padding:'8px',
                      borderRadius:'6px',
                      cursor:'pointer',
                      fontSize:'13px',
                      fontWeight:'bold'
                    }}
                  >
                    ✅ Entregar
                  </button>
                  <button
                    onClick={() => cancelarEncomenda(e.id)}
                    style={{
                      flex:1,
                      background:'#ffebee',
                      color:'#c62828',
                      border:'none',
                      padding:'8px',
                      borderRadius:'6px',
                      cursor:'pointer',
                      fontSize:'13px',
                      fontWeight:'bold'
                    }}
                  >
                    ❌ Cancelar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Encomendas