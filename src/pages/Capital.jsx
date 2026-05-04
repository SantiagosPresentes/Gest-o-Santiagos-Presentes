import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function Capital() {
  const [registros, setRegistros] = useState([])
  const [mes, setMes] = useState('')
  const [totalVendido, setTotalVendido] = useState('')
  const [retiradas, setRetiradas] = useState('')
  const [mensagem, setMensagem] = useState('')

  useEffect(() => { carregarRegistros() }, [])

  async function carregarRegistros() {
    const { data } = await supabase.from('capital').select('*').order('criado_em', { ascending: false })
    if (data) setRegistros(data)
  }

  async function salvarCapital() {
    if (!mes || !totalVendido) { setMensagem('Preencha o mês e o total vendido!'); return }
    const { error } = await supabase.from('capital').insert({
      mes, total_vendido: parseFloat(totalVendido), retiradas: parseFloat(retiradas || 0)
    })
    if (error) { setMensagem('Erro: ' + error.message); return }
    setMensagem('Registro salvo com sucesso!')
    setMes(''); setTotalVendido(''); setRetiradas('')
    carregarRegistros()
  }

  const campo = { width:'100%', padding:'10px', marginTop:'6px', borderRadius:'6px', border:'1px solid #ddd' }

  return (
    <div>
      <h2>Capital</h2>
      <div style={{display:'grid', gridTemplateColumns:'340px 1fr', gap:'24px', marginTop:'16px'}}>

        <div style={{background:'white', padding:'24px', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)', height:'fit-content'}}>
          <h3 style={{marginBottom:'16px'}}>Novo Registro</h3>
          <div style={{marginBottom:'16px'}}>
            <label>Mês de Referência</label><br/>
            <input value={mes} onChange={e => setMes(e.target.value)} placeholder="Ex: Maio/2026" style={campo}/>
          </div>
          <div style={{marginBottom:'16px'}}>
            <label>Total Vendido (R$)</label><br/>
            <input type="number" value={totalVendido} onChange={e => setTotalVendido(e.target.value)} placeholder="Ex: 3500.00" style={campo}/>
          </div>
          <div style={{marginBottom:'24px'}}>
            <label>Retiradas (R$)</label><br/>
            <input type="number" value={retiradas} onChange={e => setRetiradas(e.target.value)} placeholder="Ex: 500.00" style={campo}/>
          </div>
          <button onClick={salvarCapital} style={{background:'#e94560', color:'white', border:'none', padding:'12px 24px', borderRadius:'8px', cursor:'pointer', fontSize:'16px', width:'100%'}}>
            Salvar Registro
          </button>
          {mensagem && <p style={{marginTop:'16px', color: mensagem.includes('sucesso') ? 'green' : 'red'}}>{mensagem}</p>}
        </div>

        <div style={{background:'white', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)', overflow:'hidden', height:'fit-content'}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#1a1a2e', color:'white'}}>
                <th style={{padding:'14px 16px', textAlign:'left'}}>Mês</th>
                <th style={{padding:'14px 16px', textAlign:'right'}}>Total Vendido</th>
                <th style={{padding:'14px 16px', textAlign:'right'}}>Meta</th>
                <th style={{padding:'14px 16px', textAlign:'right'}}>Diferença</th>
                <th style={{padding:'14px 16px', textAlign:'right'}}>Retiradas</th>
                <th style={{padding:'14px 16px', textAlign:'right'}}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r, i) => (
                <tr key={r.id} style={{background: i % 2 === 0 ? '#fff' : '#f9f9f9', borderBottom:'1px solid #eee'}}>
                  <td style={{padding:'12px 16px'}}><strong>{r.mes}</strong></td>
                  <td style={{padding:'12px 16px', textAlign:'right'}}>R$ {parseFloat(r.total_vendido).toFixed(2)}</td>
                  <td style={{padding:'12px 16px', textAlign:'right'}}>R$ 3.000,00</td>
                  <td style={{padding:'12px 16px', textAlign:'right'}}>
                    <span style={{color: parseFloat(r.diferenca_meta) >= 0 ? 'green' : 'red', fontWeight:'bold'}}>
                      {parseFloat(r.diferenca_meta) >= 0 ? '+' : ''}R$ {parseFloat(r.diferenca_meta).toFixed(2)}
                    </span>
                  </td>
                  <td style={{padding:'12px 16px', textAlign:'right'}}>R$ {parseFloat(r.retiradas).toFixed(2)}</td>
                  <td style={{padding:'12px 16px', textAlign:'right'}}><strong>R$ {parseFloat(r.saldo).toFixed(2)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
          {registros.length === 0 && <p style={{textAlign:'center', padding:'32px', color:'#aaa'}}>Nenhum registro ainda</p>}
        </div>
      </div>
    </div>
  )
}

export default Capital