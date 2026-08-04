import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import PageHeader from '../components/PageHeader'
import { DollarSign, TrendingUp, TrendingDown, Wallet, Target, PlusCircle, Trash2, Eye, EyeOff, CheckCircle, XCircle, ShoppingCart, Clock, User, Printer, Share2 } from 'lucide-react'
import { registrarMovimentacao } from '../utils/logMovimentacao'

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
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const pdfRef = useRef(null)

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

  // ─── IMPRIMIR (mesmo estilo do Estoque.jsx) ───────────────────────────
  function imprimirCapital() {
    const dataAtual = new Date().toLocaleDateString('pt-BR')
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    let conteudoHtml = ''

    if (mes) {
      // Relatório detalhado do mês selecionado
      const linhasRetiradas = retiradas.map((r, i) => `
        <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f7f9fa'}">
          <td style="padding:8px 10px;border-bottom:1px solid #eee;"><strong>${r.tipo}</strong></td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;">${r.descricao || '—'}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">R$ ${parseFloat(r.valor).toFixed(2)}</td>
        </tr>
      `).join('')

      conteudoHtml = `
        <div class="filtros">
          <strong>Mês de referência:</strong> ${mes}
        </div>

        <div class="cards-grid">
          <div class="card"><span>Total Vendido</span><strong>R$ ${totalVendidoBruto.toFixed(2)}</strong></div>
          <div class="card"><span>A Receber</span><strong>R$ ${totalAReceber.toFixed(2)}</strong></div>
          <div class="card"><span>Total Recebido</span><strong>R$ ${totalVendido.toFixed(2)}</strong></div>
          <div class="card"><span>Total Retiradas</span><strong>R$ ${totalRetiradas.toFixed(2)}</strong></div>
          <div class="card"><span>Saldo do Mês</span><strong>R$ ${saldo.toFixed(2)}</strong></div>
          <div class="card"><span>Meta R$ 3.000</span><strong>${totalVendidoBruto >= 3000 ? '+' : ''}R$ ${(totalVendidoBruto - 3000).toFixed(2)}</strong></div>
          <div class="card"><span>Pagar Ubaldo (25%)</span><strong>R$ ${pagarUbaldo.toFixed(2)}</strong></div>
          <div class="card"><span>Pagar Viviane (25%)</span><strong>R$ ${pagarViviane.toFixed(2)}</strong></div>
        </div>

        <h2 class="subtitulo">Retiradas de ${mes}</h2>
        ${retiradas.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Descrição</th>
              <th style="text-align:right;">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${linhasRetiradas}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="text-align:right;">TOTAL DE RETIRADAS</td>
              <td style="text-align:right;color:#c62828;">R$ ${totalRetiradas.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        ` : `<p style="color:#a0aec0;font-size:13px;">Nenhuma retirada registrada neste mês.</p>`}
      `
    } else {
      // Relatório resumo por mês (todos os registros)
      const linhasResumo = registros.map((r, i) => {
        const saldoMes = r.total_vendido - r.retiradas
        const bateuMeta = r.total_vendido >= 3000
        return `
          <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f7f9fa'}">
            <td style="padding:8px 10px;border-bottom:1px solid #eee;"><strong>${r.mes}</strong></td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;">R$ ${r.total_vendido.toFixed(2)}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;">R$ 3.000,00</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;">R$ ${r.retiradas.toFixed(2)}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">R$ ${saldoMes.toFixed(2)}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center;">${bateuMeta ? '✅ Meta atingida' : '⚠️ Abaixo da meta'}</td>
          </tr>
        `
      }).join('')

      const totalGeralRecebido = registros.reduce((acc, r) => acc + r.total_vendido, 0)
      const totalGeralRetiradas = registros.reduce((acc, r) => acc + r.retiradas, 0)

      conteudoHtml = `
        <div class="filtros">
          <strong>Saldo geral em caixa:</strong> R$ ${saldoGeral.toFixed(2)}
        </div>

        <h2 class="subtitulo">Resumo por Mês</h2>
        <table>
          <thead>
            <tr>
              <th>Mês</th>
              <th style="text-align:right;">Total Recebido</th>
              <th style="text-align:right;">Meta</th>
              <th style="text-align:right;">Retiradas</th>
              <th style="text-align:right;">Saldo</th>
              <th style="text-align:center;">Situação</th>
            </tr>
          </thead>
          <tbody>
            ${linhasResumo}
          </tbody>
          <tfoot>
            <tr>
              <td style="text-align:right;">TOTAL GERAL</td>
              <td style="text-align:right;">R$ ${totalGeralRecebido.toFixed(2)}</td>
              <td></td>
              <td style="text-align:right;color:#c62828;">R$ ${totalGeralRetiradas.toFixed(2)}</td>
              <td style="text-align:right;color:#1a6b5a;">R$ ${(totalGeralRecebido - totalGeralRetiradas).toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      `
    }

    const janela = window.open('', '_blank')
    janela.document.write(`
      <html>
        <head>
          <title>Relatório de Capital</title>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; font-family: Arial, Helvetica, sans-serif; }
            body { padding: 32px; color: #2d3748; }
            .cabecalho { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #1a6b5a; padding-bottom:16px; margin-bottom:20px; }
            .cabecalho h1 { font-size:20px; color:#1a6b5a; margin-bottom:4px; }
            .cabecalho p { font-size:12px; color:#718096; }
            .meta { text-align:right; font-size:12px; color:#718096; }
            .filtros { font-size:12px; color:#718096; margin-bottom:20px; background:#f7fafc; padding:10px 14px; border-radius:8px; border:1px solid #edf2f7; }
            .filtros strong { color:#2d3748; }
            .subtitulo { font-size:15px; color:#1a6b5a; margin:24px 0 10px; }
            .cards-grid { display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-bottom:10px; }
            .card { background:#f7fafc; border:1px solid #edf2f7; border-radius:8px; padding:10px 12px; }
            .card span { display:block; font-size:11px; color:#718096; margin-bottom:4px; }
            .card strong { font-size:15px; color:#1a6b5a; }
            table { width:100%; border-collapse:collapse; font-size:13px; }
            thead th { background:#1a6b5a; color:white; text-align:left; padding:10px; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; }
            tfoot td { padding:12px 10px; font-weight:bold; border-top:2px solid #1a6b5a; }
            .rodape { margin-top:24px; text-align:center; font-size:11px; color:#a0aec0; }
            .btn-imprimir { margin-top:20px; text-align:center; }
            .btn-imprimir button { background:#1a6b5a; color:white; border:none; padding:10px 24px; border-radius:8px; font-size:14px; font-weight:bold; cursor:pointer; }
            @media print {
              body { padding: 12px; }
              .btn-imprimir { display:none; }
              .cards-grid { grid-template-columns: repeat(4, 1fr); }
            }
          </style>
        </head>
        <body>
          <div class="cabecalho">
            <div>
              <h1>Relatório de Capital</h1>
              <p>Santiagos Presentes</p>
            </div>
            <div class="meta">
              <p>Emitido em: ${dataAtual} às ${horaAtual}</p>
            </div>
          </div>

          ${conteudoHtml}

          <div class="rodape">Relatório gerado automaticamente pelo sistema — Santiagos Presentes</div>

          <div class="btn-imprimir">
            <button onclick="window.print()">🖨️ Imprimir</button>
          </div>
        </body>
      </html>
    `)
    janela.document.close()
    janela.focus()
  }

  // ─── COMPARTILHAR (PDF profissional via WhatsApp / apps do celular) ──
  async function compartilharCapital() {
    if (gerandoPdf) return
    setGerandoPdf(true)
    try {
      const elemento = pdfRef.current
      const canvas = await html2canvas(elemento, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      const imgData = canvas.toDataURL('image/png')

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      })
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
      const blob = pdf.output('blob')

      const nomeArquivo = `Relatorio-Capital-${(mes || 'Geral').replace('/', '-')}.pdf`
      const file = new File([blob], nomeArquivo, { type: 'application/pdf' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Relatório de Capital - Santiagos Presentes',
          text: `📊 Relatório de Capital${mes ? ' — ' + mes : ''} — Santiagos Presentes`
        })
      } else {
        // Fallback (desktop ou navegador sem suporte a compartilhar arquivos): baixa o PDF
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = nomeArquivo; a.click()
        URL.revokeObjectURL(url)
        setMensagem('PDF baixado! Envie pelo WhatsApp Web ou app de sua preferência.')
      }
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      setMensagem('Erro ao gerar o PDF de compartilhamento.')
    } finally {
      setGerandoPdf(false)
    }
  }

  const campo = { width:'100%', padding:'10px', marginTop:'6px', borderRadius:'8px', border:'1px solid #ddd', fontSize:'14px', boxSizing:'border-box' }

  const dataAtual = new Date().toLocaleDateString('pt-BR')
  const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const cardsPdf = [
    { label: 'Total Vendido', valor: totalVendidoBruto, cor: '#1565c0', bg: '#e3f2fd' },
    { label: 'A Receber', valor: totalAReceber, cor: '#e65100', bg: '#fff3e0' },
    { label: 'Total Recebido', valor: totalVendido, cor: '#2e7d32', bg: '#e8f5e9' },
    { label: 'Total Retiradas', valor: totalRetiradas, cor: '#c62828', bg: '#ffebee' },
    { label: 'Saldo do Mês', valor: saldo, cor: totalVendidoBruto >= 3000 ? '#2e7d32' : '#f57f17', bg: totalVendidoBruto >= 3000 ? '#e8f5e9' : '#fff8e1' },
    { label: 'Meta R$ 3.000', valor: totalVendidoBruto - 3000, cor: totalVendidoBruto >= 3000 ? '#2e7d32' : '#c62828', bg: totalVendidoBruto >= 3000 ? '#e8f5e9' : '#ffebee', comSinal: true },
    { label: 'Pagar Ubaldo (25%)', valor: pagarUbaldo, cor: '#6a1b9a', bg: '#f3e5f5' },
    { label: 'Pagar Viviane (25%)', valor: pagarViviane, cor: '#880e4f', bg: '#fce4ec' },
  ]

  return (
    <div>
      {/* TEMPLATE OCULTO — usado apenas para gerar o PDF de compartilhamento */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
        <div ref={pdfRef} style={{ width: '800px', background: 'white', padding: '40px', fontFamily: 'Arial, Helvetica, sans-serif', color: '#2d3748' }}>

          {/* Cabeçalho */}
          <div style={{ background: 'linear-gradient(135deg, #1a6b5a, #145a4a)', borderRadius: '14px', padding: '28px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <img src="/logo.png" alt="Logo" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.6)' }} />
              <div>
                <h1 style={{ fontSize: '24px', color: 'white', margin: 0 }}>Relatório de Capital</h1>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', margin: '4px 0 0' }}>Santiagos Presentes</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', margin: 0 }}>Emitido em {dataAtual} às {horaAtual}</p>
              {mes && (
                <p style={{ fontSize: '15px', color: 'white', fontWeight: 'bold', margin: '6px 0 0', background: 'rgba(255,255,255,0.15)', display: 'inline-block', padding: '4px 12px', borderRadius: '20px' }}>
                  {mes}
                </p>
              )}
            </div>
          </div>

          {mes ? (
            <>
              {/* Cards de indicadores */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '28px' }}>
                {cardsPdf.map((c, i) => (
                  <div key={i} style={{ background: c.bg, borderRadius: '12px', padding: '16px 18px', borderLeft: `4px solid ${c.cor}` }}>
                    <p style={{ fontSize: '12px', color: '#666', margin: '0 0 4px' }}>{c.label}</p>
                    <strong style={{ fontSize: '20px', color: c.cor }}>
                      {c.comSinal && c.valor >= 0 ? '+' : ''}R$ {c.valor.toFixed(2)}
                    </strong>
                  </div>
                ))}
              </div>

              {/* Tabela de retiradas */}
              <h2 style={{ fontSize: '16px', color: '#1a6b5a', marginBottom: '12px' }}>Retiradas de {mes}</h2>
              {retiradas.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th style={{ background: '#1a6b5a', color: 'white', textAlign: 'left', padding: '10px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', borderRadius: '6px 0 0 0' }}>Tipo</th>
                      <th style={{ background: '#1a6b5a', color: 'white', textAlign: 'left', padding: '10px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Descrição</th>
                      <th style={{ background: '#1a6b5a', color: 'white', textAlign: 'right', padding: '10px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', borderRadius: '0 6px 0 0' }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retiradas.map((r, i) => (
                      <tr key={r.id} style={{ background: i % 2 === 0 ? '#ffffff' : '#f7f9fa' }}>
                        <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}><strong>{r.tipo}</strong></td>
                        <td style={{ padding: '10px', borderBottom: '1px solid #eee', color: '#666' }}>{r.descricao || '—'}</td>
                        <td style={{ padding: '10px', borderBottom: '1px solid #eee', textAlign: 'right', fontWeight: 'bold', color: '#c62828' }}>R$ {parseFloat(r.valor).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} style={{ padding: '12px 10px', fontWeight: 'bold', borderTop: '2px solid #1a6b5a', textAlign: 'right' }}>TOTAL DE RETIRADAS</td>
                      <td style={{ padding: '12px 10px', fontWeight: 'bold', borderTop: '2px solid #1a6b5a', textAlign: 'right', color: '#c62828' }}>R$ {totalRetiradas.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <p style={{ color: '#a0aec0', fontSize: '13px' }}>Nenhuma retirada registrada neste mês.</p>
              )}
            </>
          ) : (
            <>
              {/* Saldo geral */}
              <div style={{ background: 'linear-gradient(135deg, #1a6b5a, #145a4a)', borderRadius: '12px', padding: '20px', textAlign: 'center', marginBottom: '28px' }}>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', margin: '0 0 6px' }}>Saldo Geral em Caixa</p>
                <strong style={{ color: 'white', fontSize: '32px' }}>R$ {saldoGeral.toFixed(2)}</strong>
              </div>

              {/* Tabela resumo por mês */}
              <h2 style={{ fontSize: '16px', color: '#1a6b5a', marginBottom: '12px' }}>Resumo por Mês</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={{ background: '#1a6b5a', color: 'white', textAlign: 'left', padding: '10px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mês</th>
                    <th style={{ background: '#1a6b5a', color: 'white', textAlign: 'right', padding: '10px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recebido</th>
                    <th style={{ background: '#1a6b5a', color: 'white', textAlign: 'right', padding: '10px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Retiradas</th>
                    <th style={{ background: '#1a6b5a', color: 'white', textAlign: 'right', padding: '10px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Saldo</th>
                    <th style={{ background: '#1a6b5a', color: 'white', textAlign: 'center', padding: '10px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r, i) => {
                    const saldoMes = r.total_vendido - r.retiradas
                    const bateuMeta = r.total_vendido >= 3000
                    return (
                      <tr key={r.mes} style={{ background: i % 2 === 0 ? '#ffffff' : '#f7f9fa' }}>
                        <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}><strong>{r.mes}</strong></td>
                        <td style={{ padding: '10px', borderBottom: '1px solid #eee', textAlign: 'right', color: '#2e7d32' }}>R$ {r.total_vendido.toFixed(2)}</td>
                        <td style={{ padding: '10px', borderBottom: '1px solid #eee', textAlign: 'right', color: '#c62828' }}>R$ {r.retiradas.toFixed(2)}</td>
                        <td style={{ padding: '10px', borderBottom: '1px solid #eee', textAlign: 'right', fontWeight: 'bold' }}>R$ {saldoMes.toFixed(2)}</td>
                        <td style={{ padding: '10px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                          <span style={{ background: bateuMeta ? '#e8f5e9' : '#ffebee', color: bateuMeta ? '#2e7d32' : '#c62828', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>
                            {bateuMeta ? 'Meta atingida' : 'Abaixo da meta'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </>
          )}

          {/* Rodapé */}
          <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: '#a0aec0', margin: 0 }}>Relatório gerado automaticamente pelo sistema — Santiagos Presentes</p>
          </div>
        </div>
      </div>

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

      {/* Seletor de mês + ações */}
      <div style={{background:'white', padding:'20px', borderRadius:'14px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', marginBottom:'16px', display:'flex', alignItems:'flex-end', gap:'12px', flexWrap:'wrap'}}>
        <div style={{flex:1, minWidth:'220px'}}>
          <label style={{fontWeight:'bold', color:'#1a6b5a', fontSize:'14px'}}>Filtrar por Mês</label>
          <select value={mes} onChange={e => setMes(e.target.value)} style={{...campo, maxWidth:'300px', marginTop:'8px'}}>
            <option value="">Todos os meses</option>
            {meses.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div style={{display:'flex', gap:'8px'}}>
          <button
            onClick={imprimirCapital}
            style={{
              display:'flex', alignItems:'center', gap:'6px',
              padding:'10px 16px', borderRadius:'8px', border:'none',
              background:'linear-gradient(135deg, #1a6b5a, #145a4a)', color:'white',
              fontSize:'13px', fontWeight:'600', cursor:'pointer', whiteSpace:'nowrap',
            }}
          >
            <Printer size={15}/> Imprimir
          </button>
          <button
            onClick={compartilharCapital}
            disabled={gerandoPdf}
            style={{
              display:'flex', alignItems:'center', gap:'6px',
              padding:'10px 16px', borderRadius:'8px', border:'none',
              background: gerandoPdf ? '#94d3ae' : 'linear-gradient(135deg, #25D366, #128C7E)', color:'white',
              fontSize:'13px', fontWeight:'600', cursor: gerandoPdf ? 'default' : 'pointer', whiteSpace:'nowrap',
            }}
          >
            <Share2 size={15}/> {gerandoPdf ? 'Gerando PDF...' : 'Compartilhar PDF'}
          </button>
        </div>
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
