import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import jsPDF from 'jspdf'
import PageHeader from '../components/PageHeader'
import { History, Filter, Printer, Share2, X, ChevronRight } from 'lucide-react'
import { NOMES_POR_EMAIL } from '../utils/logMovimentacao'

const TELAS = ['Vendas', 'Estoque', 'Clientes', 'Devoluções', 'Encomendas', 'Fornecedores', 'Capital', 'Investimentos', 'Retiradas']
const TIPOS = ['Criação', 'Edição', 'Exclusão', 'Pagamento']

// Formata um valor de qualquer tipo para exibição amigável
function formatarValor(valor) {
  if (valor === null || valor === undefined) return '—'
  if (typeof valor === 'number') {
    return Number.isInteger(valor) ? valor : valor.toFixed(2)
  }
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não'
  return String(valor)
}

// Renderiza o campo "dados" (JSON) de forma legível, tratando arrays de itens especialmente
function DetalhesDados({ dados }) {
  if (!dados || typeof dados !== 'object') {
    return <p style={{ fontSize: '13px', color: '#999' }}>Sem dados adicionais registrados.</p>
  }

  const entradas = Object.entries(dados)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {entradas.map(([chave, valor]) => {
        if (Array.isArray(valor) && valor.length > 0 && typeof valor[0] === 'object') {
          return (
            <div key={chave}>
              <strong style={{ fontSize: '12px', color: '#1a6b5a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {chave}
              </strong>
              <div style={{ marginTop: '6px', background: '#f8f8f8', borderRadius: '8px', overflow: 'hidden' }}>
                {valor.map((obj, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap',
                      gap: '4px 12px', padding: '8px 12px',
                      borderBottom: i < valor.length - 1 ? '1px solid #eee' : 'none',
                      fontSize: '13px',
                    }}
                  >
                    {Object.entries(obj).map(([k, v]) => (
                      <span key={k} style={{ color: '#555' }}>
                        <span style={{ color: '#999' }}>{k}: </span>
                        <strong>{formatarValor(v)}</strong>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )
        }

        if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
          return (
            <div key={chave}>
              <strong style={{ fontSize: '12px', color: '#1a6b5a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {chave}
              </strong>
              <div style={{ marginTop: '6px', background: '#f8f8f8', borderRadius: '8px', padding: '8px 12px', fontSize: '13px' }}>
                {Object.entries(valor).map(([k, v]) => (
                  <div key={k} style={{ color: '#555' }}>
                    <span style={{ color: '#999' }}>{k}: </span>
                    <strong>{formatarValor(v)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )
        }

        return (
          <div key={chave} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid #f0f0f0', paddingBottom: '6px' }}>
            <span style={{ color: '#999' }}>{chave}</span>
            <strong style={{ color: '#333' }}>{formatarValor(valor)}</strong>
          </div>
        )
      })}
    </div>
  )
}

// Formata o campo "dados" (JSON) como HTML para o relatório impresso
function formatarDadosParaImpressao(dados) {
  if (!dados || typeof dados !== 'object' || Object.keys(dados).length === 0) {
    return ''
  }

  const partes = Object.entries(dados).map(([chave, valor]) => {
    if (Array.isArray(valor) && valor.length > 0 && typeof valor[0] === 'object') {
      const linhas = valor.map(obj =>
        `<tr>${Object.entries(obj).map(([k, v]) =>
          `<td style="padding:4px 8px;border-bottom:1px solid #eee;">
             <span style="color:#999;">${k}:</span> <strong>${formatarValor(v)}</strong>
           </td>`
        ).join('')}</tr>`
      ).join('')
      return `
        <div style="margin-top:8px;">
          <span style="font-size:10px;color:#1a6b5a;text-transform:uppercase;letter-spacing:0.5px;font-weight:bold;">${chave}</span>
          <table style="width:100%;border-collapse:collapse;margin-top:4px;background:#f8f8f8;border-radius:6px;">${linhas}</table>
        </div>`
    }

    if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
      const linhas = Object.entries(valor).map(([k, v]) =>
        `<div><span style="color:#999;">${k}:</span> <strong>${formatarValor(v)}</strong></div>`
      ).join('')
      return `
        <div style="margin-top:8px;">
          <span style="font-size:10px;color:#1a6b5a;text-transform:uppercase;letter-spacing:0.5px;font-weight:bold;">${chave}</span>
          <div style="background:#f8f8f8;border-radius:6px;padding:6px 10px;margin-top:4px;font-size:12px;">${linhas}</div>
        </div>`
    }

    return `
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:4px;">
        <span style="color:#999;">${chave}</span><strong>${formatarValor(valor)}</strong>
      </div>`
  })

  return `<div style="margin-top:8px;padding-top:8px;border-top:1px dashed #ddd;">${partes.join('')}</div>`
}

function HistoricoGeral() {
  const [movimentacoes, setMovimentacoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [detalheAberto, setDetalheAberto] = useState(null)
  const [gerandoPdf, setGerandoPdf] = useState(false)

  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [usuarioFiltro, setUsuarioFiltro] = useState('')
  const [telaFiltro, setTelaFiltro] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('')

  async function buscarMovimentacoes() {
    setCarregando(true)
    let query = supabase.from('historico_geral').select('*').order('created_at', { ascending: false })

    if (dataInicio) query = query.gte('created_at', dataInicio + 'T00:00:00')
    if (dataFim) query = query.lte('created_at', dataFim + 'T23:59:59')
    if (usuarioFiltro) query = query.eq('usuario_email', usuarioFiltro)
    if (telaFiltro) query = query.eq('tela', telaFiltro)
    if (tipoFiltro) query = query.eq('tipo', tipoFiltro)

    const { data, error } = await query.limit(500)
    if (!error) setMovimentacoes(data || [])
    setCarregando(false)
  }

  useEffect(() => { buscarMovimentacoes() }, [dataInicio, dataFim, usuarioFiltro, telaFiltro, tipoFiltro])

  function limparFiltros() {
    setDataInicio(''); setDataFim(''); setUsuarioFiltro(''); setTelaFiltro(''); setTipoFiltro('')
  }

  // Monta o HTML interno do relatório (usado na impressão)
  function montarConteudoRelatorio() {
    const dataAtual = new Date().toLocaleDateString('pt-BR')
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    const itensHtml = movimentacoes.map((m, i) => `
      <div style="background:${i % 2 === 0 ? '#ffffff' : '#f7f9fa'};border:1px solid #edf2f7;border-radius:8px;padding:12px 14px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <strong style="color:#1a6b5a;font-size:13px;">${m.tela} — ${m.tipo}</strong>
          <span style="font-size:11px;color:#a0aec0;white-space:nowrap;margin-left:8px;">
            ${new Date(m.created_at).toLocaleDateString('pt-BR')} às ${new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p style="font-size:12.5px;color:#4a5568;margin-top:4px;">${m.descricao}</p>
        <span style="font-size:11px;color:#a0aec0;">por ${m.usuario_nome}</span>
        ${formatarDadosParaImpressao(m.dados)}
      </div>
    `).join('')

    const filtrosAplicados = []
    if (dataInicio) filtrosAplicados.push(`De: ${new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')}`)
    if (dataFim) filtrosAplicados.push(`Até: ${new Date(dataFim + 'T12:00:00').toLocaleDateString('pt-BR')}`)
    if (usuarioFiltro) filtrosAplicados.push(`Usuário: ${NOMES_POR_EMAIL[usuarioFiltro] || usuarioFiltro}`)
    if (telaFiltro) filtrosAplicados.push(`Tela: ${telaFiltro}`)
    if (tipoFiltro) filtrosAplicados.push(`Tipo: ${tipoFiltro}`)

    return `
      <div style="font-family: Arial, Helvetica, sans-serif; color:#2d3748; padding:32px; width:820px; background:white;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #1a6b5a; padding-bottom:16px; margin-bottom:20px;">
          <div>
            <h1 style="font-size:20px; color:#1a6b5a; margin-bottom:4px;">Relatório de Histórico Geral</h1>
            <p style="font-size:12px; color:#718096;">Santiagos Presentes</p>
          </div>
          <div style="text-align:right; font-size:12px; color:#718096;">
            <p>Emitido em: ${dataAtual} às ${horaAtual}</p>
            <p>${movimentacoes.length} movimentação(ões) listada(s)</p>
          </div>
        </div>

        ${filtrosAplicados.length > 0 ? `
        <div style="font-size:12px; color:#718096; margin-bottom:16px; background:#f7fafc; padding:10px 14px; border-radius:8px; border:1px solid #edf2f7;">
          <strong style="color:#2d3748;">Filtros aplicados:</strong> ${filtrosAplicados.join(' | ')}
        </div>` : ''}

        ${itensHtml}

        <div style="margin-top:24px; text-align:center; font-size:11px; color:#a0aec0;">
          Relatório gerado automaticamente pelo sistema — Santiagos Presentes
        </div>
      </div>
    `
  }

  // ─── Impressão no padrão do Estoque.jsx ───────────────────────────────────
  function imprimir() {
    const conteudo = montarConteudoRelatorio()
    const janela = window.open('', '_blank')
    janela.document.write(`
      <html>
        <head>
          <title>Histórico Geral</title>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            @media print { .btn-imprimir { display:none; } }
          </style>
        </head>
        <body>
          ${conteudo}
          <div class="btn-imprimir" style="margin-top:20px; text-align:center; padding-bottom:32px;">
            <button onclick="window.print()" style="background:#1a6b5a; color:white; border:none; padding:10px 24px; border-radius:8px; font-size:14px; font-weight:bold; cursor:pointer;">🖨️ Imprimir</button>
          </div>
        </body>
      </html>
    `)
    janela.document.close()
    janela.focus()
  }

  // ─── Geração de PDF profissional (texto nativo, sem screenshot) ───────────
  function gerarPDFProfissional() {
    const doc = new jsPDF('p', 'pt', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 40
    const contentWidth = pageWidth - margin * 2

    const primaria = [26, 107, 90]     // #1a6b5a
    const texto = [45, 55, 72]         // #2d3748
    const secundaria = [113, 128, 150] // #718096
    const clara = [160, 174, 192]      // #a0aec0

    const dataAtual = new Date().toLocaleDateString('pt-BR')
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    const filtrosAplicados = []
    if (dataInicio) filtrosAplicados.push(`De: ${new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')}`)
    if (dataFim) filtrosAplicados.push(`Até: ${new Date(dataFim + 'T12:00:00').toLocaleDateString('pt-BR')}`)
    if (usuarioFiltro) filtrosAplicados.push(`Usuário: ${NOMES_POR_EMAIL[usuarioFiltro] || usuarioFiltro}`)
    if (telaFiltro) filtrosAplicados.push(`Tela: ${telaFiltro}`)
    if (tipoFiltro) filtrosAplicados.push(`Tipo: ${tipoFiltro}`)

    let y = margin

    function cabecalhoCompleto() {
      doc.setFillColor(...primaria)
      doc.rect(0, 0, pageWidth, 4, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.setTextColor(...primaria)
      doc.text('Relatório de Histórico Geral', margin, margin + 10)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...secundaria)
      doc.text('Santiagos Presentes', margin, margin + 24)

      doc.setFontSize(8.5)
      doc.text(`Emitido em: ${dataAtual} às ${horaAtual}`, pageWidth - margin, margin + 10, { align: 'right' })
      doc.text(`${movimentacoes.length} movimentação(ões) listada(s)`, pageWidth - margin, margin + 22, { align: 'right' })

      doc.setDrawColor(...primaria)
      doc.setLineWidth(1)
      doc.line(margin, margin + 32, pageWidth - margin, margin + 32)

      y = margin + 48

      if (filtrosAplicados.length > 0) {
        doc.setFontSize(8.5)
        const linhas = doc.splitTextToSize(`Filtros aplicados: ${filtrosAplicados.join(' | ')}`, contentWidth - 20)
        const altura = linhas.length * 11 + 12
        doc.setFillColor(247, 250, 252)
        doc.roundedRect(margin, y, contentWidth, altura, 3, 3, 'F')
        doc.setTextColor(...texto)
        doc.text(linhas, margin + 10, y + 14)
        y += altura + 14
      }
    }

    function cabecalhoContinuacao() {
      doc.setFillColor(...primaria)
      doc.rect(0, 0, pageWidth, 4, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...primaria)
      doc.text('Histórico Geral (continuação)', margin, margin + 6)
      y = margin + 24
    }

    function rodape() {
      const totalPaginas = doc.internal.getNumberOfPages()
      for (let p = 1; p <= totalPaginas; p++) {
        doc.setPage(p)
        doc.setFontSize(7.5)
        doc.setTextColor(...clara)
        doc.text('Relatório gerado automaticamente pelo sistema — Santiagos Presentes', margin, pageHeight - 20)
        doc.text(`Página ${p} de ${totalPaginas}`, pageWidth - margin, pageHeight - 20, { align: 'right' })
      }
    }

    // Monta as linhas de detalhe (campo "dados") de forma legível e compacta
    function linhasDeDados(dados) {
      const linhas = []
      if (!dados || typeof dados !== 'object' || Object.keys(dados).length === 0) return linhas

      Object.entries(dados).forEach(([chave, valor]) => {
        if (Array.isArray(valor) && valor.length > 0 && typeof valor[0] === 'object') {
          linhas.push({ texto: chave.toUpperCase(), bold: true })
          valor.forEach(obj => {
            const linha = Object.entries(obj).map(([k, v]) => `${k}: ${formatarValor(v)}`).join('   ')
            doc.setFontSize(7.5)
            doc.splitTextToSize(linha, contentWidth - 34).forEach(l => linhas.push({ texto: l, indent: true }))
          })
        } else if (valor && typeof valor === 'object') {
          linhas.push({ texto: chave.toUpperCase(), bold: true })
          Object.entries(valor).forEach(([k, v]) => linhas.push({ texto: `${k}: ${formatarValor(v)}`, indent: true }))
        } else {
          linhas.push({ texto: `${chave}: ${formatarValor(valor)}` })
        }
      })
      return linhas
    }

    cabecalhoCompleto()

    movimentacoes.forEach((m, i) => {
      doc.setFontSize(8.5)
      const descLinhas = doc.splitTextToSize(m.descricao || '', contentWidth - 20)
      const dadosLinhas = linhasDeDados(m.dados)

      const alturaBloco =
        16 +                                   // título
        descLinhas.length * 11 + 4 +           // descrição
        12 +                                   // "por fulano"
        (dadosLinhas.length ? dadosLinhas.length * 10 + 10 : 0) +
        14                                     // respiro final

      // Quebra de página ANTES de desenhar, sem cortar o item ao meio
      if (y + alturaBloco > pageHeight - 50) {
        doc.addPage()
        cabecalhoContinuacao()
      }

      doc.setFillColor(i % 2 === 0 ? 255 : 247, i % 2 === 0 ? 255 : 249, i % 2 === 0 ? 255 : 250)
      doc.setDrawColor(237, 242, 247)
      doc.roundedRect(margin, y, contentWidth, alturaBloco - 6, 3, 3, 'FD')

      let yi = y + 14
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(...primaria)
      doc.text(`${m.tela} — ${m.tipo}`, margin + 10, yi)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...clara)
      const dataTexto = `${new Date(m.created_at).toLocaleDateString('pt-BR')} às ${new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
      doc.text(dataTexto, pageWidth - margin - 10, yi, { align: 'right' })

      yi += 12
      doc.setFontSize(8.5)
      doc.setTextColor(...texto)
      doc.text(descLinhas, margin + 10, yi)
      yi += descLinhas.length * 11 + 4

      doc.setFontSize(7.5)
      doc.setTextColor(...clara)
      doc.text(`por ${m.usuario_nome}`, margin + 10, yi)
      yi += 12

      if (dadosLinhas.length) {
        doc.setDrawColor(225, 225, 225)
        doc.line(margin + 10, yi - 6, pageWidth - margin - 10, yi - 6)
        dadosLinhas.forEach(linha => {
          doc.setFont('helvetica', linha.bold ? 'bold' : 'normal')
          doc.setFontSize(7.5)
          doc.setTextColor(...(linha.bold ? primaria : texto))
          doc.text(linha.texto, margin + (linha.indent ? 22 : 10), yi)
          yi += 10
        })
      }

      y += alturaBloco
    })

    rodape()
    return doc
  }

  // ─── Compartilhar via apps do dispositivo, com qualidade profissional ─────
  async function compartilhar() {
    setGerandoPdf(true)
    try {
      const doc = gerarPDFProfissional()
      const pdfBlob = doc.output('blob')
      const file = new File([pdfBlob], 'historico-geral-santiagos.pdf', { type: 'application/pdf' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        // Abre o menu nativo de compartilhamento (WhatsApp, Email, Drive, etc.)
        await navigator.share({
          files: [file],
          title: 'Histórico Geral - Santiagos Presentes',
          text: 'Relatório de histórico geral',
        })
      } else {
        // Sem suporte a Web Share API com arquivos: baixa o PDF
        doc.save('historico-geral-santiagos.pdf')
      }
    } catch (err) {
      // Usuário cancelando o share (AbortError) não é erro real
      if (err?.name !== 'AbortError') {
        console.error('Erro ao gerar/compartilhar PDF:', err)
      }
    } finally {
      setGerandoPdf(false)
    }
  }

  const campo = { width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }

  return (
    <div>
      <PageHeader title="Histórico Geral" subtitle="Todas as movimentações realizadas no app" icon={<History size={22} color="white" />} />

      {/* MODAL DE DETALHES */}
      {detalheAberto && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px',
          }}
          onClick={() => setDetalheAberto(null)}
        >
          <div
            style={{
              background: 'white', borderRadius: '16px', width: '100%', maxWidth: '480px',
              maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <strong style={{ fontSize: '16px', color: '#1a6b5a' }}>{detalheAberto.tela} — {detalheAberto.tipo}</strong>
                <p style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                  {new Date(detalheAberto.created_at).toLocaleDateString('pt-BR')} às {new Date(detalheAberto.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button
                onClick={() => setDetalheAberto(null)}
                style={{ background: '#f0f0f0', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex' }}
              >
                <X size={18} color="#666" />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Descrição</strong>
                <p style={{ fontSize: '14px', color: '#333', marginTop: '4px' }}>{detalheAberto.descricao}</p>
              </div>

              <div style={{ marginBottom: '16px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div>
                  <strong style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Usuário</strong>
                  <p style={{ fontSize: '14px', color: '#333', marginTop: '4px' }}>{detalheAberto.usuario_nome}</p>
                </div>
                {detalheAberto.referencia_id && (
                  <div>
                    <strong style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Referência</strong>
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', wordBreak: 'break-all' }}>{detalheAberto.referencia_id}</p>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid #eee', paddingTop: '16px' }}>
                <strong style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Detalhes completos</strong>
                <div style={{ marginTop: '10px' }}>
                  <DetalhesDados dados={detalheAberto.dados} />
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #eee' }}>
              <button
                onClick={() => setDetalheAberto(null)}
                style={{ width: '100%', background: '#1a6b5a', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginTop: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Filter size={16} color="#1a6b5a" />
          <strong style={{ color: '#1a6b5a', fontSize: '14px' }}>Filtros</strong>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>De</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={campo} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Até</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={campo} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Usuário</label>
            <select value={usuarioFiltro} onChange={e => setUsuarioFiltro(e.target.value)} style={campo}>
              <option value="">Todos</option>
              {Object.entries(NOMES_POR_EMAIL).map(([email, nome]) => (
                <option key={email} value={email}>{nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Tela</label>
            <select value={telaFiltro} onChange={e => setTelaFiltro(e.target.value)} style={campo}>
              <option value="">Todas</option>
              {TELAS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Tipo</label>
            <select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)} style={campo}>
              <option value="">Todos</option>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
          <button onClick={limparFiltros} style={{ background: '#eee', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <X size={14} /> Limpar filtros
          </button>
          <button onClick={imprimir} style={{ background: 'linear-gradient(135deg,#1a6b5a,#145a4a)', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={14} /> Imprimir
          </button>
          <button
            onClick={compartilhar}
            disabled={gerandoPdf}
            style={{
              background: 'linear-gradient(135deg,#f5821f,#c2185b)', color: 'white', border: 'none',
              padding: '8px 14px', borderRadius: '6px', cursor: gerandoPdf ? 'default' : 'pointer',
              fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
              opacity: gerandoPdf ? 0.7 : 1,
            }}
          >
            <Share2 size={14} /> {gerandoPdf ? 'Gerando PDF...' : 'Compartilhar'}
          </button>
        </div>
      </div>

      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        {carregando ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '24px' }}>Carregando...</p>
        ) : movimentacoes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#bbb' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>📋</div>
            <p style={{ fontSize: '14px' }}>Nenhuma movimentação encontrada</p>
          </div>
        ) : (
          <div id="lista-historico">
            {movimentacoes.map(m => (
              <div
                key={m.id}
                onClick={() => setDetalheAberto(m)}
                style={{
                  borderBottom: '1px solid #f0f0f0', padding: '10px 4px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                  borderRadius: '8px', transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8f8f8'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '14px', color: '#1a6b5a' }}>{m.tela} — {m.tipo}</strong>
                    <span style={{ fontSize: '11px', color: '#999', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                      {new Date(m.created_at).toLocaleDateString('pt-BR')} às {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#555', marginTop: '2px' }}>{m.descricao}</p>
                  <span style={{ fontSize: '11px', color: '#888' }}>por {m.usuario_nome}</span>
                </div>
                <ChevronRight size={16} color="#ccc" style={{ flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default HistoricoGeral
