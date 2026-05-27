import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import PageHeader from '../components/PageHeader'
import { DollarSign } from 'lucide-react'

function Capital() {
  const [mes, setMes] = useState('')
  const [totalVendido, setTotalVendido] = useState(0)
  const [retiradas, setRetiradas] = useState([])
  const [tipoRetirada, setTipoRetirada] = useState('')
  const [descricaoRetirada, setDescricaoRetirada] = useState('')
  const [valorRetirada, setValorRetirada] = useState('')
  const [registros, setRegistros] = useState([])
  const [mensagem, setMensagem] = useState('')
  const [mostrarCaixa, setMostrarCaixa] = useState(false)
  const [saldoGeral, setSaldoGeral] = useState(0)

  const nomeMeses = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
  ]

  function gerarMeses() {
    const anoInicio = 2025
    const anoFim = new Date().getFullYear() + 2
    const lista = []
    for (let ano = anoInicio; ano <= anoFim; ano++) {
      for (let m = 0; m <= 11; m++) {
        lista.push(`${nomeMeses[m]}/${ano}`)
      }
    }
    return lista
  }

  const meses = gerarMeses()

  function mesParaIndice(nomeMes) {
    return nomeMeses.indexOf(nomeMes)
  }

  useEffect(() => {
    carregarRegistros()
    buscarSaldoGeral()
  }, [])

  useEffect(() => {
    if (mes) {
      buscarTotalVendido()
      buscarRetiradas()
    }
  }, [mes])

  async function buscarSaldoGeral() {
    const { data: vendasData } = await supabase
      .from('vendas')
      .select('valor_total')
      .eq('recebido', true)
    const { data: retiradasData } = await supabase.from('retiradas').select('valor')
    const totalV = vendasData?.reduce((acc, v) => acc + parseFloat(v.valor_total), 0) || 0
    const totalR = retiradasData?.reduce((acc, r) => acc + parseFloat(r.valor), 0) || 0
    setSaldoGeral(totalV - totalR)
  }

  async function buscarTotalVendido() {
    const { data } = await supabase
      .from('vendas')
      .select('valor_total, data_para_pagar')
      .eq('recebido', true)
    if (data) {
      const [nomeMes, ano] = mes.split('/')
      const indice = mesParaIndice(nomeMes)
      const total = data
        .filter(v => {
          const d = new Date(v.data_para_pagar + 'T12:00:00')
          return d.getMonth() === indice && d.getFullYear() === parseInt(ano)
        })
        .reduce((acc, v) => acc + parseFloat(v.valor_total), 0)
      setTotalVendido(total)
    }
  }

  async function buscarRetiradas() {
    const { data } = await supabase
      .from('retiradas')
      .select('*')
      .eq('mes', mes)
      .order('criado_em', { ascending: false })
    if (data) setRetiradas(data)
  }

  async function carregarRegistros() {
    const { data: vendasData } = await supabase
      .from('vendas')
      .select('valor_total, data_para_pagar')
      .eq('recebido', true)
    const { data: retiradasData } = await supabase.from('retiradas').select('*')
    if (vendasData && retiradasData) {
      const porMes = {}
      vendasData.forEach(v => {
        const d = new Date(v.data_para_pagar + 'T12:00:00')
        const ano = d.getFullYear()
        if (ano < 2025) return
        const chave = `${nomeMeses[d.getMonth()]}/${ano}`
        if (!porMes[chave]) porMes[chave] = { mes: chave, total_vendido: 0, retiradas: 0 }
        porMes[chave].total_vendido += parseFloat(v.valor_total)
      })
      retiradasData.forEach(r => {
        if (!porMes[r.mes]) porMes[r.mes] = { mes: r.mes, total_vendido: 0, retiradas: 0 }
        porMes[r.mes].retiradas += parseFloat(r.valor)
      })
      // Ordena crescente por data
      const ordenado = Object.values(porMes).sort((a, b) => {
        const [mA, aA] = a.mes.split('/')
        const [mB, aB] = b.mes.split('/')
        if (aA !== aB) return parseInt(aA) - parseInt(aB)
        return nomeMeses.indexOf(mA) - nomeMeses.indexOf(mB)
      })
      setRegistros(ordenado)
    }
  }

  async function adicionarRetirada() {
    if (!mes || !tipoRetirada || !valorRetirada) {
      setMensagem('Preencha o tipo e o valor da retirada!')
      return
    }
    const { error } = await supabase.from('retiradas').insert({
      mes, tipo: tipoRetirada, descricao: descricaoRetirada, valor: parseFloat(valorRetirada)
    })
    if (error) { setMensagem('Erro: ' + error.message); return }
    setMensagem('Retirada registrada!')
    setTipoRetirada(''); setDescricaoRetirada(''); setValorRetirada('')
    buscarRetiradas()
    carregarRegistros()
    buscarSaldoGeral()
  }

  async function removerRetirada(id) {
    await supabase.from('retiradas').delete().eq('id', id)
    buscarRetiradas()
    carregarRegistros()
    buscarSaldoGeral()
  }

  const totalRetiradas = retiradas.reduce((acc, r) => acc + parseFloat(r.valor), 0)
  const saldo = totalVendido - totalRetiradas
  const saldoExibido = mes ? saldo : saldoGeral
  const campo = { width:'100%', padding:'10px', marginTop:'6px', borderRadius:'6px', border:'1px solid #ddd' }

  return (
    <div>
      <PageHeader
        title="Capital"
        subtitle="Fluxo financeiro, caixa e capital da empresa"
        icon={<DollarSign size={22} color="white" />}
      />

      {/* CAIXA — sempre visível */}
      <div style={{background: mostrarCaixa ? 'linear-gradient(135deg, #1a6b5a, #145a4a)' : 'white', borderRadius:'12px', padding:'20px', border:'2px solid #1a6b5a', transition:'all 0.3s', marginTop:'16px', marginBottom:'16px'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <strong style={{color: mostrarCaixa ? 'white' : '#1a6b5a', fontSize:'16px'}}>💰 Saldo em Caixa</strong>
            <p style={{margin:'2px 0 0', fontSize:'12px', color: mostrarCaixa ? 'rgba(255,255,255,0.6)' : '#999'}}>
              {mes ? `Recebidos em ${mes} − retiradas do mês` : 'Total recebido − todas as retiradas'}
            </p>
          </div>
          <button
            onClick={() => setMostrarCaixa(!mostrarCaixa)}
            style={{background: mostrarCaixa ? 'rgba(255,255,255,0.2)' : '#f0f9f0', border: mostrarCaixa ? '1px solid rgba(255,255,255,0.4)' : '1px solid #1a6b5a', color: mostrarCaixa ? 'white' : '#1a6b5a', padding:'6px 16px', borderRadius:'6px', cursor:'pointer', fontSize:'13px', fontWeight:'bold'}}
          >
            {mostrarCaixa ? '🙈 Ocultar' : '👁️ Visualizar'}
          </button>
        </div>
        {mostrarCaixa && (
          <div style={{marginTop:'16px', textAlign:'center'}}>
            <strong style={{fontSize:'40px', color:'white'}}>R$ {saldoExibido.toFixed(2)}</strong>
          </div>
        )}
      </div>

      {/* Seletor de mês */}
      <div style={{background:'white', padding:'20px', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', marginBottom:'16px'}}>
        <label style={{fontWeight:'bold', color:'#1a6b5a'}}>Filtrar por Mês</label><br/>
        <select value={mes} onChange={e => setMes(e.target.value)} style={{...campo, maxWidth:'300px'}}>
          <option value="">Todos os meses</option>
          {meses.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {mes && (
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'24px'}}>
          <div style={{background:'#e8f5e9', borderRadius:'12px', padding:'20px', borderLeft:'4px solid #2e7d32'}}>
            <p style={{color:'#666', fontSize:'13px', marginBottom:'4px'}}>Total Recebido</p>
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

          {/* LISTA DE RETIRADAS */}
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

      {/* TABELA RESUMO POR MÊS */}
      <div className="tabela-wrapper" style={{marginTop:'8px'}}>
        <div style={{background:'linear-gradient(135deg, #1a6b5a, #145a4a)', padding:'16px 20px', position:'sticky', left:0}}>
          <h3 style={{color:'white', margin:0}}>Resumo por Mês</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{textAlign:'left'}}>Mês</th>
              <th style={{textAlign:'right'}}>Total Recebido</th>
              <th style={{textAlign:'right'}}>Meta</th>
              <th style={{textAlign:'right'}}>Retiradas</th>
              <th style={{textAlign:'right'}}>Saldo</th>
              <th style={{textAlign:'center'}}>Situação</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((r, i) => {
              const saldoMes = r.total_vendido - r.retiradas
              const bateuMeta = saldoMes >= 3000
              return (
                <tr key={r.mes} style={{background: i % 2 === 0 ? '#fff' : '#f9f9f9'}}>
                  <td style={{textAlign:'left'}}><strong>{r.mes}</strong></td>
                  <td style={{textAlign:'right', color:'#2e7d32'}}>R$ {r.total_vendido.toFixed(2)}</td>
                  <td style={{textAlign:'right', color:'#666'}}>R$ 3.000,00</td>
                  <td style={{textAlign:'right', color:'#c62828'}}>R$ {r.retiradas.toFixed(2)}</td>
                  <td style={{textAlign:'right', fontWeight:'bold'}}>R$ {saldoMes.toFixed(2)}</td>
                  <td style={{textAlign:'center'}}>
                    <span style={{background: bateuMeta ? '#e8f5e9' : '#ffebee', color: bateuMeta ? '#2e7d32' : '#c62828', padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'bold'}}>
                      {bateuMeta ? '✅ Meta atingida' : '❌ Abaixo da meta'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {registros.length === 0 && (
          <p style={{textAlign:'center', padding:'32px', color:'#aaa', background:'white'}}>Nenhum registro ainda</p>
        )}
      </div>
    </div>
  )
}

export default Capital