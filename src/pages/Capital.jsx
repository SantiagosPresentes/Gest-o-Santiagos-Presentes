import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function Capital() {
  // Estado para o mês selecionado
  const [mes, setMes] = useState('')
  // Estado para o total vendido (calculado automaticamente)
  const [totalVendido, setTotalVendido] = useState(0)
  // Estado para a lista de retiradas do mês
  const [retiradas, setRetiradas] = useState([])
  // Estado para nova retirada
  const [tipoRetirada, setTipoRetirada] = useState('')
  const [descricaoRetirada, setDescricaoRetirada] = useState('')
  const [valorRetirada, setValorRetirada] = useState('')
  // Estado para os registros mensais salvos
  const [registros, setRegistros] = useState([])
  // Estado para mensagens
  const [mensagem, setMensagem] = useState('')

  // Lista de meses para seleção
  const meses = [
    'Janeiro/2026','Fevereiro/2026','Março/2026','Abril/2026',
    'Maio/2026','Junho/2026','Julho/2026','Agosto/2026',
    'Setembro/2026','Outubro/2026','Novembro/2026','Dezembro/2026'
  ]

  // Carrega os registros salvos ao abrir a tela
  useEffect(() => { carregarRegistros() }, [])

  // Quando o mês muda, busca o total vendido e as retiradas automaticamente
  useEffect(() => {
    if (mes) {
      buscarTotalVendido()
      buscarRetiradas()
    }
  }, [mes])

  // Busca o total vendido no mês somando todas as vendas
  async function buscarTotalVendido() {
    const { data } = await supabase
      .from('vendas')
      .select('valor_total, data_venda')
    if (data) {
      // Filtra as vendas do mês selecionado
      const [nomeMes, ano] = mes.split('/')
      const indice = meses.findIndex(m => m.startsWith(nomeMes))
      const total = data
        .filter(v => {
          const data = new Date(v.data_venda)
          return data.getMonth() === indice && data.getFullYear() === parseInt(ano)
        })
        .reduce((acc, v) => acc + parseFloat(v.valor_total), 0)
      setTotalVendido(total)
    }
  }

  // Busca as retiradas já registradas no mês
  async function buscarRetiradas() {
    const { data } = await supabase
      .from('retiradas')
      .select('*')
      .eq('mes', mes)
      .order('criado_em', { ascending: false })
    if (data) setRetiradas(data)
  }

  // Carrega todos os meses registrados para a tabela resumo
  async function carregarRegistros() {
    const { data: vendasData } = await supabase.from('vendas').select('valor_total, data_venda')
    const { data: retiradasData } = await supabase.from('retiradas').select('*')
    if (vendasData && retiradasData) {
      // Agrupa por mês
      const porMes = {}
      meses.forEach(m => {
        const [nomeMes, ano] = m.split('/')
        const indice = meses.findIndex(mes => mes.startsWith(nomeMes))
        const totalVendas = vendasData
          .filter(v => {
            const d = new Date(v.data_venda)
            return d.getMonth() === indice && d.getFullYear() === parseInt(ano)
          })
          .reduce((acc, v) => acc + parseFloat(v.valor_total), 0)
        const totalRetiradas = retiradasData
          .filter(r => r.mes === m)
          .reduce((acc, r) => acc + parseFloat(r.valor), 0)
        if (totalVendas > 0 || totalRetiradas > 0) {
          porMes[m] = { mes: m, total_vendido: totalVendas, retiradas: totalRetiradas }
        }
      })
      setRegistros(Object.values(porMes))
    }
  }

  // Adiciona uma nova retirada
  async function adicionarRetirada() {
    if (!mes || !tipoRetirada || !valorRetirada) {
      setMensagem('Preencha o tipo e o valor da retirada!')
      return
    }
    const { error } = await supabase.from('retiradas').insert({
      mes,
      tipo: tipoRetirada,
      descricao: descricaoRetirada,
      valor: parseFloat(valorRetirada)
    })
    if (error) { setMensagem('Erro: ' + error.message); return }
    setMensagem('Retirada registrada!')
    setTipoRetirada('')
    setDescricaoRetirada('')
    setValorRetirada('')
    buscarRetiradas()
    carregarRegistros()
  }

  // Remove uma retirada
  async function removerRetirada(id) {
    await supabase.from('retiradas').delete().eq('id', id)
    buscarRetiradas()
    carregarRegistros()
  }

  // Calcula o total de retiradas do mês atual
  const totalRetiradas = retiradas.reduce((acc, r) => acc + parseFloat(r.valor), 0)
  // Calcula o saldo do mês
  const saldo = totalVendido - totalRetiradas

  const campo = { width:'100%', padding:'10px', marginTop:'6px', borderRadius:'6px', border:'1px solid #ddd' }

  return (
    <div>
      <h2>Capital</h2>

      {/* Seletor de mês */}
      <div style={{background:'white', padding:'20px 24px', borderRadius:'12px', marginTop:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', marginBottom:'16px'}}>
        <label style={{fontWeight:'bold', color:'#1a6b5a'}}>Mês de Referência</label><br/>
        <select value={mes} onChange={e => setMes(e.target.value)} style={{...campo, maxWidth:'300px'}}>
          <option value="">Selecione o mês...</option>
          {meses.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {mes && (
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px', marginBottom:'24px'}}>

          {/* CARDS DE RESUMO DO MÊS */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', gridColumn:'1/-1'}}>
            <div style={{background:'#e8f5e9', borderRadius:'12px', padding:'20px', borderLeft:'4px solid #2e7d32'}}>
              <p style={{color:'#666', fontSize:'13px', marginBottom:'4px'}}>Total Vendido</p>
              <strong style={{fontSize:'24px', color:'#2e7d32'}}>R$ {totalVendido.toFixed(2)}</strong>
            </div>
            <div style={{background:'#ffebee', borderRadius:'12px', padding:'20px', borderLeft:'4px solid #c62828'}}>
              <p style={{color:'#666', fontSize:'13px', marginBottom:'4px'}}>Total Retiradas</p>
              <strong style={{fontSize:'24px', color:'#c62828'}}>R$ {totalRetiradas.toFixed(2)}</strong>
            </div>
            <div style={{background: saldo >= 3000 ? '#e8f5e9' : '#fff8e1', borderRadius:'12px', padding:'20px', borderLeft:`4px solid ${saldo >= 3000 ? '#2e7d32' : '#f57f17'}`}}>
              <p style={{color:'#666', fontSize:'13px', marginBottom:'4px'}}>Saldo do Mês</p>
              <strong style={{fontSize:'24px', color: saldo >= 3000 ? '#2e7d32' : '#f57f17'}}>R$ {saldo.toFixed(2)}</strong>
            </div>
            <div style={{background: saldo >= 3000 ? '#e8f5e9' : '#ffebee', borderRadius:'12px', padding:'20px', borderLeft:`4px solid ${saldo >= 3000 ? '#2e7d32' : '#c62828'}`}}>
              <p style={{color:'#666', fontSize:'13px', marginBottom:'4px'}}>Meta R$ 3.000 — Diferença</p>
              <strong style={{fontSize:'24px', color: saldo >= 3000 ? '#2e7d32' : '#c62828'}}>
                {saldo >= 3000 ? '+' : ''}R$ {(saldo - 3000).toFixed(2)}
              </strong>
            </div>
          </div>

          {/* FORMULÁRIO DE RETIRADA */}
          <div style={{background:'white', padding:'24px', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
            <h3 style={{color:'#1a6b5a', marginBottom:'16px'}}>Nova Retirada</h3>
            <div style={{marginBottom:'12px'}}>
              <label style={{fontSize:'13px', fontWeight:'bold'}}>Tipo</label><br/>
              <select value={tipoRetirada} onChange={e => setTipoRetirada(e.target.value)} style={campo}>
                <option value="">Selecione...</option>
                <option value="Produtos">Produtos</option>
                <option value="Pagamento Funcionários">Pagamento Funcionários</option>
                <option value="Dívida">Dívida</option>
              </select>
            </div>
            <div style={{marginBottom:'12px'}}>
              <label style={{fontSize:'13px', fontWeight:'bold'}}>Descrição (opcional)</label><br/>
              <input value={descricaoRetirada} onChange={e => setDescricaoRetirada(e.target.value)} placeholder="Ex: Conta de luz" style={campo}/>
            </div>
            <div style={{marginBottom:'16px'}}>
              <label style={{fontSize:'13px', fontWeight:'bold'}}>Valor (R$)</label><br/>
              <input type="number" value={valorRetirada} onChange={e => setValorRetirada(e.target.value)} placeholder="Ex: 150.00" style={campo}/>
            </div>
            <button onClick={adicionarRetirada} style={{background:'linear-gradient(135deg, #f5821f, #e06010)', color:'white', border:'none', padding:'12px', borderRadius:'8px', cursor:'pointer', fontSize:'15px', fontWeight:'bold', width:'100%'}}>
              Registrar Retirada
            </button>
            {mensagem && <p style={{marginTop:'12px', color: mensagem.includes('Erro') ? 'red' : 'green', fontSize:'14px'}}>{mensagem}</p>}
          </div>

          {/* LISTA DE RETIRADAS DO MÊS */}
          <div style={{background:'white', padding:'24px', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
            <h3 style={{color:'#1a6b5a', marginBottom:'16px'}}>Retiradas de {mes}</h3>
            {retiradas.length === 0 && <p style={{color:'#aaa', textAlign:'center', padding:'20px'}}>Nenhuma retirada registrada</p>}
            {retiradas.map(r => (
              <div key={r.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px', background:'#f9f9f9', borderRadius:'8px', marginBottom:'8px', borderLeft:'3px solid #e94560'}}>
                <div>
                  <strong style={{fontSize:'14px'}}>{r.tipo}</strong>
                  {r.descricao && <span style={{color:'#666', fontSize:'13px'}}> — {r.descricao}</span>}<br/>
                  <strong style={{color:'#e94560'}}>R$ {parseFloat(r.valor).toFixed(2)}</strong>
                </div>
                <button onClick={() => removerRetirada(r.id)} style={{background:'#ffebee', color:'#c62828', border:'none', padding:'6px 10px', borderRadius:'6px', cursor:'pointer', fontSize:'12px'}}>
                  Remover
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TABELA RESUMO DE TODOS OS MESES */}
      <div style={{background:'white', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', overflow:'hidden', marginTop:'8px'}}>
        <div style={{background:'linear-gradient(135deg, #1a6b5a, #145a4a)', padding:'16px 20px'}}>
          <h3 style={{color:'white', margin:0}}>Resumo por Mês</h3>
        </div>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'#f5f5f5'}}>
              <th style={{padding:'12px 16px', textAlign:'left', fontSize:'13px', color:'#555'}}>Mês</th>
              <th style={{padding:'12px 16px', textAlign:'right', fontSize:'13px', color:'#555'}}>Total Vendido</th>
              <th style={{padding:'12px 16px', textAlign:'right', fontSize:'13px', color:'#555'}}>Meta</th>
              <th style={{padding:'12px 16px', textAlign:'right', fontSize:'13px', color:'#555'}}>Retiradas</th>
              <th style={{padding:'12px 16px', textAlign:'right', fontSize:'13px', color:'#555'}}>Saldo</th>
              <th style={{padding:'12px 16px', textAlign:'center', fontSize:'13px', color:'#555'}}>Situação</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((r, i) => {
              const saldoMes = r.total_vendido - r.retiradas
              const bateuMeta = saldoMes >= 3000
              return (
                <tr key={r.mes} style={{background: i % 2 === 0 ? '#fff' : '#f9f9f9', borderBottom:'1px solid #eee'}}>
                  <td style={{padding:'12px 16px', fontWeight:'bold'}}>{r.mes}</td>
                  <td style={{padding:'12px 16px', textAlign:'right', color:'#2e7d32'}}>R$ {r.total_vendido.toFixed(2)}</td>
                  <td style={{padding:'12px 16px', textAlign:'right', color:'#666'}}>R$ 3.000,00</td>
                  <td style={{padding:'12px 16px', textAlign:'right', color:'#c62828'}}>R$ {r.retiradas.toFixed(2)}</td>
                  <td style={{padding:'12px 16px', textAlign:'right', fontWeight:'bold'}}>R$ {saldoMes.toFixed(2)}</td>
                  <td style={{padding:'12px 16px', textAlign:'center'}}>
                    <span style={{background: bateuMeta ? '#e8f5e9' : '#ffebee', color: bateuMeta ? '#2e7d32' : '#c62828', padding:'4px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'bold'}}>
                      {bateuMeta ? '✅ Meta atingida' : '❌ Abaixo da meta'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {registros.length === 0 && <p style={{textAlign:'center', padding:'32px', color:'#aaa'}}>Nenhum registro ainda</p>}
      </div>
    </div>
  )
}

export default Capital