import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function Encomendas() {
  const [clientes, setClientes] = useState([])
  const [cliente, setCliente] = useState(null)
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
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

  async function registrarEncomenda() {
    if (!cliente || !descricao || !valor || !dataPagar) {
      setMensagem('Preencha todos os campos obrigatórios!')
      return
    }
    const { error } = await supabase.from('vendas').insert({
      cliente_id: cliente.id,
      data_para_pagar: dataPagar,
      valor_total: parseFloat(valor),
      recebido: 0,
      situacao: 'Encomenda',
      observacao: `ENCOMENDA: ${descricao}${observacao ? ' | ' + observacao : ''}`
    })
    if (error) { setMensagem('Erro: ' + error.message); return }
    setMensagem('Encomenda registrada com sucesso!')
    setCliente(null)
    setDescricao('')
    setValor('')
    setDataPagar('')
    setObservacao('')
    carregarEncomendas()
  }

  async function marcarEntregue(venda) {
    await supabase.from('vendas').update({ situacao: 'Pendente' }).eq('id', venda.id)
    carregarEncomendas()
  }

  const campo = { width:'100%', padding:'10px', marginTop:'6px', borderRadius:'6px', border:'1px solid #ddd' }

  return (
    <div>
      <h2>Encomendas</h2>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px', marginTop:'16px'}}>

        {/* FORMULÁRIO */}
        <div style={{background:'white', padding:'24px', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', borderTop:'3px solid #29abe2', height:'fit-content'}}>
          <h3 style={{color:'#29abe2', marginBottom:'16px'}}>Nova Encomenda</h3>

          <div style={{marginBottom:'16px'}}>
            <label style={{fontWeight:'bold', fontSize:'13px'}}>Cliente</label><br/>
            <select
              value={cliente ? cliente.id : ''}
              onChange={e => setCliente(clientes.find(c => c.id === e.target.value) || null)}
              style={campo}
            >
              <option value="">Selecione o cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div style={{marginBottom:'16px'}}>
            <label style={{fontWeight:'bold', fontSize:'13px'}}>Descrição do Produto *</label><br/>
            <input
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Ex: Jogo de cama casal estampado azul"
              style={campo}
            />
          </div>

          <div style={{marginBottom:'16px'}}>
            <label style={{fontWeight:'bold', fontSize:'13px'}}>Valor Combinado (R$) *</label><br/>
            <input
              type="number"
              value={valor}
              onChange={e => setValor(e.target.value)}
              placeholder="Ex: 150.00"
              style={campo}
            />
          </div>

          <div style={{marginBottom:'16px'}}>
            <label style={{fontWeight:'bold', fontSize:'13px'}}>Data para Pagamento *</label><br/>
            <input type="date" value={dataPagar} onChange={e => setDataPagar(e.target.value)} style={campo}/>
          </div>

          <div style={{marginBottom:'24px'}}>
            <label style={{fontWeight:'bold', fontSize:'13px'}}>Observação (opcional)</label><br/>
            <input
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Ex: Cliente vai buscar na próxima semana"
              style={campo}
            />
          </div>

          <button
            onClick={registrarEncomenda}
            style={{width:'100%', background:'linear-gradient(135deg, #1a6b5a, #145a4a)', color:'white', border:'none', padding:'12px', borderRadius:'8px', cursor:'pointer', fontSize:'15px', fontWeight:'bold'}}
          >
            Registrar Encomenda
          </button>
          {mensagem && <p style={{marginTop:'16px', color: mensagem.includes('sucesso') ? 'green' : 'red', fontSize:'14px'}}>{mensagem}</p>}
        </div>

        {/* LISTA DE ENCOMENDAS */}
        <div style={{background:'white', padding:'24px', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
          <h3 style={{color:'#1a6b5a', marginBottom:'16px'}}>Encomendas Pendentes ({encomendas.length})</h3>
          {encomendas.length === 0 && <p style={{textAlign:'center', color:'#aaa', padding:'20px'}}>Nenhuma encomenda pendente</p>}
          {encomendas.map(e => (
            <div key={e.id} style={{padding:'14px', background:'#f0f8ff', borderRadius:'8px', marginBottom:'10px', borderLeft:'4px solid #29abe2'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                <div style={{flex:1}}>
                  <strong style={{fontSize:'14px'}}>{e.clientes?.nome}</strong>
                  <span style={{background:'#1a6b5a', color:'white', fontSize:'11px', padding:'2px 8px', borderRadius:'10px', marginLeft:'8px'}}>Encomenda</span><br/>
                  <p style={{fontSize:'13px', color:'#555', margin:'4px 0'}}>{e.observacao}</p>
                  <strong style={{color:'#1a6b5a'}}>R$ {parseFloat(e.valor_total).toFixed(2)}</strong>
                  <span style={{fontSize:'12px', color:'#888', marginLeft:'8px'}}>
                    Vence: {new Date(e.data_para_pagar + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <button
                  onClick={() => marcarEntregue(e)}
                  style={{background:'#e8f5e9', color:'green', border:'1px solid green', padding:'6px 12px', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'bold', whiteSpace:'nowrap', marginLeft:'8px'}}
                >
                  ✅ Entregar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Encomendas