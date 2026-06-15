import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import PageHeader from '../components/PageHeader'
import { DollarSign, TrendingUp, TrendingDown, Wallet, Target, PlusCircle, Trash2, Eye, EyeOff, CheckCircle, XCircle, ShoppingCart, Clock, User } from 'lucide-react'

function Capital() {
  const [mes, setMes] = useState('')
  const [totalVendido, setTotalVendido] = useState(0)
  const [totalVendidoBruto, setTotalVendidoBruto] = useState(0)
  const [totalAReceber, setTotalAReceber] = useState(0)
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
    const mesInicio = ano === anoInicio ? 9 : 0  // 9 = outubro (índice base 0)
    for (let m = mesInicio; m <= 11; m++) {
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
      .select('recebido')
      .eq('situacao', 'Pago')
    const { data: retiradasData } = await supabase.from('retiradas').select('valor')
    const totalV = vendasData?.reduce((acc, v) => acc + parseFloat(v.recebido || 0), 0) || 0
    const totalR = retiradasData?.reduce((acc, r) => acc + parseFloat(r.valor || 0), 0) || 0
    setSaldoGeral(totalV - totalR)
  }

  async function buscarTotalVendido() {
  const { data } = await supabase
    .from('vendas')
    .select('valor_total, recebido, falta, data_para_pagar')

  if (data) {
    const [nomeMes, ano] = mes.split('/')
    const indice = mesParaIndice(nomeMes)

    const doMes = data.filter(v => {
      const d = new Date(v.data_para_pagar + 'T12:00:00')
      return d.getMonth() === indice && d.getFullYear() === parseInt(ano)
    })

    const totalBruto = doMes.reduce((acc, v) => acc + parseFloat(v.valor_total || 0), 0)
    const totalPago  = doMes.reduce((acc, v) => acc + parseFloat(v.recebido || 0), 0)
    const totalFalta = doMes.reduce((acc, v) => acc + parseFloat(v.falta || 0), 0)

    setTotalVendidoBruto(totalBruto)
    setTotalVendido(totalPago)
    setTotalAReceber(totalFalta)
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
    .select('valor_total, recebido, falta, data_para_pagar')

  const { data: retiradasData } = await supabase
    .from('retiradas')
    .select('*')

  if (vendasData && retiradasData) {
    const porMes = {}

    vendasData.forEach(v => {
      const d = new Date(v.data_para_pagar + 'T12:00:00')
      const ano = d.getFullYear()
      if (ano < 2025) return
      const chave = `${nomeMeses[d.getMonth()]}/${ano}`
      if (!porMes[chave]) porMes[chave] = { mes: chave, total_vendido: 0, total_recebido: 0, a_receber: 0, retiradas: 0 }
      porMes[chave].total_vendido  += parseFloat(v.valor_total || 0)
      porMes[chave].total_recebido += parseFloat(v.recebido || 0)
      porMes[chave].a_receber      += parseFloat(v.falta || 0)
    })

    retiradasData.forEach(r => {
      if (!porMes[r.mes]) porMes[r.mes] = { mes: r.mes, total_vendido: 0, total_recebido: 0, a_receber: 0, retiradas: 0 }
      porMes[r.mes].retiradas += parseFloat(r.valor || 0)
    })

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

  const totalRetiradas = retiradas.reduce((acc, r) => acc + parseFloat(r.valor || 0), 0)
  const saldo = totalVendido - totalRetiradas
  const saldoExibido = mes ? saldo : saldoGeral

  const pagarUbaldo = totalVendidoBruto * 0.25
  const pagarViviane = totalVendidoBruto * 0.25

  const campo = { width:'100%', padding:'10px', marginTop:'6px', borderRadius:'8px', border:'1px solid #ddd', fontSize:'14px', boxSizing:'border-box' }

  return (
    <div>
      <PageHeader
        title="Capital"
        subtitle="Fluxo financeiro, caixa e capital da empresa"
        icon={<DollarSign size={22} color="white" />}
      />

      {/* CAIXA */}
      <div style={{background: mostrarCaixa ? 'linear-gradient(135deg, #1a6b5a, #145a4a)' : 'white', borderRadius:'14px', padding:'20px', border:'2px solid #1a6b5a', transition:'all 0.3s', marginTop:'16px', marginBottom:'16px'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
            <Wallet size={22} color={mostrarCaixa ? 'white' : '#1a6b5a'}/>
            <div>
              <strong style={{color: mostrarCaixa ? 'white' : '#1a6b5a', fontSize:'16px'}}>Saldo em Caixa</strong>
              <p style={{margin:'2px 0 0', fontSize:'12px', color: mostrarCaixa ? 'rgba(255,255,255,0.6)' : '#999'}}>
                {mes ? `Recebidos em ${mes} − retiradas do mês` : 'Total recebido − todas as retiradas'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setMostrarCaixa(!mostrarCaixa)}
            style={{background: mostrarCaixa ? 'rgba(255,255,255,0.2)' : '#f0f9f0', border: mostrarCaixa ? '1px solid rgba(255,255,255,0.4)' : '1px solid #1a6b5a', color: mostrarCaixa ? 'white' : '#1a6b5a', padding:'8px 16px', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'bold', display:'flex', alignItems:'center', gap:'6px'}}
          >
            {mostrarCaixa ? <><EyeOff size={15}/> Ocultar</> : <><Eye size={15}/> Visualizar</>}
          </button>
        </div>
        {mostrarCaixa && (
          <div style={{marginTop:'16px', textAlign:'center'}}>
            <strong style={{fontSize:'40px', color:'white'}}>R$ {saldoExibido.toFixed(2)}</strong>
          </div>
        )}
      </div>

      {/* Seletor de mês */}
      <div style={{background:'white', padding:'20px', borderRadius:'14px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', marginBottom:'16px'}}>
        <label style={{fontWeight:'bold', color:'#1a6b5a', fontSize:'14px'}}>Filtrar por Mês</label>
        <select value={mes} onChange={e => setMes(e.target.value)} style={{...campo, maxWidth:'300px', marginTop:'8px'}}>
          <option value="">Todos os meses</option>
          {meses.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {mes && (
        <>
          {/* LINHA 1 — Total Vendido + Total a Receber */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px'}}>
            <div style={{background:'#e3f2fd', borderRadius:'14px', padding:'18px', borderLeft:'4px solid #1565c0', display:'flex', alignItems:'center', gap:'12px'}}>
              <ShoppingCart size={24} color="#1565c0"/>
              <div>
                <p style={{color:'#666', fontSize:'12px', margin:0}}>Total Vendido</p>
                <strong style={{fontSize:'20px', color:'#1565c0'}}>R$ {totalVendidoBruto.toFixed(2)}</strong>
              </div>
            </div>
            <div style={{background:'#fff3e0', borderRadius:'14px', padding:'18px', borderLeft:'4px solid #e65100', display:'flex', alignItems:'center', gap:'12px'}}>
              <Clock size={24} color="#e65100"/>
              <div>
                <p style={{color:'#666', fontSize:'12px', margin:0}}>A Receber</p>
                <strong style={{fontSize:'20px', color:'#e65100'}}>R$ {totalAReceber.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          {/* LINHA 2 — Total Recebido + Total Retiradas */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px'}}>
            <div style={{background:'#e8f5e9', borderRadius:'14px', padding:'18px', borderLeft:'4px solid #2e7d32', display:'flex', alignItems:'center', gap:'12px'}}>
              <TrendingUp size={24} color="#2e7d32"/>
              <div>
                <p style={{color:'#666', fontSize:'12px', margin:0}}>Total Recebido</p>
                <strong style={{fontSize:'20px', color:'#2e7d32'}}>R$ {totalVendido.toFixed(2)}</strong>
              </div>
            </div>
            <div style={{background:'#ffebee', borderRadius:'14px', padding:'18px', borderLeft:'4px solid #c62828', display:'flex', alignItems:'center', gap:'12px'}}>
              <TrendingDown size={24} color="#c62828"/>
              <div>
                <p style={{color:'#666', fontSize:'12px', margin:0}}>Total Retiradas</p>
                <strong style={{fontSize:'20px', color:'#c62828'}}>R$ {totalRetiradas.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          {/* LINHA 3 — Saldo do Mês + Meta */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px'}}>
            <div style={{background: totalVendidoBruto >= 3000 ? '#e8f5e9' : '#fff8e1', borderRadius:'14px', padding:'18px', borderLeft:`4px solid ${totalVendidoBruto >= 3000 ? '#2e7d32' : '#f57f17'}`, display:'flex', alignItems:'center', gap:'12px'}}>
              <Wallet size={24} color={totalVendidoBruto >= 3000 ? '#2e7d32' : '#f57f17'}/>
              <div>
                <p style={{color:'#666', fontSize:'12px', margin:0}}>Saldo do Mês</p>
                <strong style={{fontSize:'20px', color: totalVendidoBruto >= 3000 ? '#2e7d32' : '#f57f17'}}>R$ {saldo.toFixed(2)}</strong>
              </div>
            </div>
            <div style={{background: totalVendidoBruto >= 3000 ? '#e8f5e9' : '#ffebee', borderRadius:'14px', padding:'18px', borderLeft:`4px solid ${totalVendidoBruto >= 3000 ? '#2e7d32' : '#c62828'}`, display:'flex', alignItems:'center', gap:'12px'}}>
              <Target size={24} color={totalVendidoBruto >= 3000 ? '#2e7d32' : '#c62828'}/>
              <div>
                <p style={{color:'#666', fontSize:'12px', margin:0}}>Meta R$ 3.000</p>
                <strong style={{fontSize:'20px', color: totalVendidoBruto >= 3000 ? '#2e7d32' : '#c62828'}}>
                  {totalVendidoBruto >= 3000 ? '+' : ''}R$ {(totalVendidoBruto - 3000).toFixed(2)}
                </strong>
              </div>
            </div>
          </div>

          {/* LINHA 4 — Pagar Ubaldo + Pagar Viviane */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'20px'}}>
            <div style={{background:'#f3e5f5', borderRadius:'14px', padding:'18px', borderLeft:'4px solid #6a1b9a', display:'flex', alignItems:'center', gap:'12px'}}>
              <User size={24} color="#6a1b9a"/>
              <div>
                <p style={{color:'#666', fontSize:'12px', margin:0}}>Pagar Ubaldo</p>
                <p style={{color:'#888', fontSize:'10px', margin:'2px 0 2px'}}>25% do vendido</p>
                <strong style={{fontSize:'20px', color:'#6a1b9a'}}>R$ {pagarUbaldo.toFixed(2)}</strong>
              </div>
            </div>
            <div style={{background:'#fce4ec', borderRadius:'14px', padding:'18px', borderLeft:'4px solid #880e4f', display:'flex', alignItems:'center', gap:'12px'}}>
              <User size={24} color="#880e4f"/>
              <div>
                <p style={{color:'#666', fontSize:'12px', margin:0}}>Pagar Viviane</p>
                <p style={{color:'#888', fontSize:'10px', margin:'2px 0 2px'}}>25% do vendido</p>
                <strong style={{fontSize:'20px', color:'#880e4f'}}>R$ {pagarViviane.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          {/* FORMULÁRIO DE RETIRADA */}
          <div style={{background:'white', padding:'24px', borderRadius:'14px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', marginBottom:'16px'}}>
            <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'20px'}}>
              <PlusCircle size={20} color="#1a6b5a"/>
              <h3 style={{color:'#1a6b5a', margin:0}}>Nova Retirada</h3>
            </div>

            <div style={{marginBottom:'14px'}}>
              <label style={{fontSize:'13px', fontWeight:'bold', color:'#444'}}>Tipo</label>
              <select value={tipoRetirada} onChange={e => setTipoRetirada(e.target.value)} style={campo}>
                <option value="">Selecione...</option>
                <option value="Reposição de Produtos">Reposição de Produtos</option>
                <option value="Pagamento de Funcionários">Pagamento de Funcionários</option>
                <option value="Pagamento de Dívida">Pagamento de Dívida</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div style={{marginBottom:'14px'}}>
              <label style={{fontSize:'13px', fontWeight:'bold', color:'#444'}}>Descrição (opcional)</label>
              <input value={descricaoRetirada} onChange={e => setDescricaoRetirada(e.target.value)} placeholder="Ex: Conta de luz" style={campo}/>
            </div>

            <div style={{marginBottom:'20px'}}>
              <label style={{fontSize:'13px', fontWeight:'bold', color:'#444'}}>Valor (R$)</label>
              <input type="number" value={valorRetirada} onChange={e => setValorRetirada(e.target.value)} placeholder="Ex: 150.00" style={campo}/>
            </div>

            <button onClick={adicionarRetirada} style={{background:'linear-gradient(135deg, #f5821f, #e06010)', color:'white', border:'none', padding:'13px', borderRadius:'10px', cursor:'pointer', fontSize:'15px', fontWeight:'bold', width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'}}>
              <PlusCircle size={18}/> Registrar Retirada
            </button>

            {mensagem && (
              <div style={{marginTop:'12px', display:'flex', alignItems:'center', gap:'8px', padding:'10px 14px', borderRadius:'8px', background: mensagem.includes('Erro') ? '#ffebee' : '#e8f5e9'}}>
                {mensagem.includes('Erro')
                  ? <XCircle size={16} color="#c62828"/>
                  : <CheckCircle size={16} color="#2e7d32"/>
                }
                <p style={{margin:0, color: mensagem.includes('Erro') ? '#c62828' : '#2e7d32', fontSize:'14px'}}>{mensagem}</p>
              </div>
            )}
          </div>

          {/* LISTA DE RETIRADAS */}
          <div style={{background:'white', padding:'24px', borderRadius:'14px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', marginBottom:'24px'}}>
            <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px'}}>
              <TrendingDown size={20} color="#c62828"/>
              <h3 style={{color:'#1a6b5a', margin:0}}>Retiradas de {mes}</h3>
            </div>

            {retiradas.length === 0
              ? <p style={{color:'#aaa', textAlign:'center', padding:'24px', fontSize:'14px'}}>Nenhuma retirada registrada</p>
              : retiradas.map(r => (
                <div key={r.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px', background:'#f9f9f9', borderRadius:'10px', marginBottom:'8px', borderLeft:'3px solid #e94560'}}>
                  <div>
                    <strong style={{fontSize:'14px', color:'#333'}}>{r.tipo}</strong>
                    {r.descricao && <span style={{color:'#666', fontSize:'13px'}}> — {r.descricao}</span>}
                    <br/>
                    <strong style={{color:'#e94560', fontSize:'15px'}}>R$ {parseFloat(r.valor).toFixed(2)}</strong>
                  </div>
                  <button onClick={() => removerRetirada(r.id)}
                    style={{background:'#ffebee', color:'#c62828', border:'none', padding:'8px 12px', borderRadius:'8px', cursor:'pointer', fontSize:'12px', display:'flex', alignItems:'center', gap:'5px', fontWeight:'600'}}>
                    <Trash2 size={14}/> Remover
                  </button>
                </div>
              ))
            }
          </div>
        </>
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
              const bateuMeta = r.total_vendido >= 3000
              return (
                <tr key={r.mes} style={{background: i % 2 === 0 ? '#fff' : '#f9f9f9'}}>
                  <td style={{textAlign:'left'}}><strong>{r.mes}</strong></td>
                  <td style={{textAlign:'right', color:'#2e7d32'}}>R$ {r.total_vendido.toFixed(2)}</td>
                  <td style={{textAlign:'right', color:'#666'}}>R$ 3.000,00</td>
                  <td style={{textAlign:'right', color:'#c62828'}}>R$ {r.retiradas.toFixed(2)}</td>
                  <td style={{textAlign:'right', fontWeight:'bold'}}>R$ {saldoMes.toFixed(2)}</td>
                  <td style={{textAlign:'center'}}>
                    <span style={{display:'inline-flex', alignItems:'center', gap:'4px', background: bateuMeta ? '#e8f5e9' : '#ffebee', color: bateuMeta ? '#2e7d32' : '#c62828', padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'bold'}}>
                      {bateuMeta
                        ? <><CheckCircle size={12}/> Meta atingida</>
                        : <><XCircle size={12}/> Abaixo da meta</>
                      }
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