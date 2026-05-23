import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import html2canvas from 'html2canvas'
import PageHeader from '../components/PageHeader'

// Leitor de câmera usando a biblioteca ZXing via CDN (carregada dinamicamente)
function LeitorCamera({ onLeitura, onFechar }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [erro, setErro] = useState('')
  const [status, setStatus] = useState('Apontando câmera para o código...')

  useEffect(() => {
    let codeReader = null

    async function iniciar() {
      try {
        // Carrega a biblioteca ZXing dinamicamente se ainda não foi carregada
        if (!window.ZXing) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://unpkg.com/@zxing/library@0.19.1/umd/index.min.js'
            script.onload = resolve
            script.onerror = reject
            document.head.appendChild(script)
          })
        }

        codeReader = new window.ZXing.BrowserMultiFormatReader()
        const devices = await codeReader.listVideoInputDevices()

        if (devices.length === 0) {
          setErro('Nenhuma câmera encontrada.')
          return
        }

        // Prefere câmera traseira
        const deviceId = devices.find(d =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('tras') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        )?.deviceId || devices[devices.length - 1].deviceId

        await codeReader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
          if (result) {
            onLeitura(result.getText())
            codeReader.reset()
          }
        })
      } catch (e) {
        setErro('Erro ao acessar câmera: ' + e.message)
      }
    }

    iniciar()

    return () => {
      if (codeReader) codeReader.reset()
    }
  }, [])

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.92)', zIndex: 2000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <p style={{ color: 'white', fontSize: '16px', fontWeight: 'bold' }}>📷 Leitor de Código</p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginTop: '4px' }}>{status}</p>
        </div>

        {/* Visor da câmera */}
        <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', background: '#111' }}>
          <video ref={videoRef} style={{ width: '100%', display: 'block', maxHeight: '300px', objectFit: 'cover' }} />

          {/* Mira */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '200px', height: '120px',
            border: '2px solid #1a6b5a',
            borderRadius: '8px',
            boxShadow: '0 0 0 2000px rgba(0,0,0,0.4)',
            pointerEvents: 'none'
          }}>
            {/* Cantos da mira */}
            {[['0','0'], ['0','auto'], ['auto','0'], ['auto','auto']].map(([t,b], i) => (
              <div key={i} style={{
                position: 'absolute',
                top: t !== 'auto' ? '-2px' : 'auto',
                bottom: b !== 'auto' ? '-2px' : 'auto',
                left: i % 2 === 0 ? '-2px' : 'auto',
                right: i % 2 === 1 ? '-2px' : 'auto',
                width: '20px', height: '20px',
                borderTop: (i < 2) ? '3px solid #f5821f' : 'none',
                borderBottom: (i >= 2) ? '3px solid #f5821f' : 'none',
                borderLeft: (i % 2 === 0) ? '3px solid #f5821f' : 'none',
                borderRight: (i % 2 === 1) ? '3px solid #f5821f' : 'none',
              }}/>
            ))}
          </div>
        </div>

        {erro && (
          <div style={{ background: '#ffebee', color: '#c62828', padding: '10px 14px', borderRadius: '8px', marginTop: '12px', fontSize: '13px' }}>
            {erro}
          </div>
        )}

        <button
          onClick={onFechar}
          style={{
            marginTop: '16px', width: '100%',
            background: 'rgba(255,255,255,0.1)', color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '12px', borderRadius: '10px',
            fontSize: '15px', cursor: 'pointer'
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

function Vendas() {
  const [codigoBusca, setCodigoBusca] = useState('')
  const [itens, setItens] = useState([])
  const [cliente, setCliente] = useState(null)
  const [clientes, setClientes] = useState([])
  const [parcelamento, setParcelamento] = useState('1')
  const [parcelas, setParcelas] = useState([{ data: '', valor: '' }])
  const [observacao, setObservacao] = useState('')
  const [desconto, setDesconto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [vendaFinalizada, setVendaFinalizada] = useState(null)
  const [cameraAberta, setCameraAberta] = useState(false)
  const comprovanteRef = useRef(null)

  const subtotalItens = itens.reduce((acc, item) => acc + item.subtotal, 0)
  const valorDesconto = desconto && parseFloat(desconto) > 0 ? parseFloat(desconto) : 0
  const total = subtotalItens - valorDesconto

  useEffect(() => {
    supabase.from('clientes').select('*').order('nome').then(({ data }) => {
      if (data) setClientes(data)
    })
  }, [])

  useEffect(() => {
    const qtd = parseInt(parcelamento)
    const valorParcela = qtd > 0 && total > 0 ? (total / qtd).toFixed(2) : '0.00'
    const novasParcelas = Array.from({ length: qtd }, (_, i) => ({
      data: parcelas[i]?.data || '',
      valor: valorParcela
    }))
    setParcelas(novasParcelas)
  }, [parcelamento, total])

  async function buscarProduto(codigoOverride) {
    const codigo = codigoOverride || codigoBusca
    if (!codigo) return
    const { data } = await supabase.from('produtos').select('*').eq('codigo', codigo).single()
    if (!data) { setMensagem('Produto não encontrado!'); return }
    if (data.estoque <= 0) {
      setMensagem(`⚠️ "${data.nome}" está com estoque zerado!`)
      setCodigoBusca('')
      return
    }
    const existente = itens.find(i => i.produto_id === data.id)
    if (existente) {
      if (existente.quantidade >= data.estoque) {
        setMensagem(`⚠️ Estoque disponível: apenas ${data.estoque} unidade(s)!`)
        return
      }
      setItens(itens.map(i => i.produto_id === data.id
        ? { ...i, quantidade: i.quantidade + 1, subtotal: (i.quantidade + 1) * i.valor_unitario }
        : i
      ))
    } else {
      setItens([...itens, {
        produto_id: data.id,
        nome: data.nome,
        categoria: data.categoria,
        valor_unitario: parseFloat(data.preco_venda),
        quantidade: 1,
        subtotal: parseFloat(data.preco_venda),
        estoque_disponivel: data.estoque
      }])
    }
    setCodigoBusca('')
    setMensagem(`✅ ${data.nome} adicionado!`)
    setTimeout(() => setMensagem(''), 2000)
  }

  function onLeituraCamera(codigo) {
    setCameraAberta(false)
    setCodigoBusca(codigo)
    buscarProduto(codigo)
  }

  function alterarQuantidade(id, qtd, estoqueDisponivel) {
    if (qtd < 1) { setItens(itens.filter(i => i.produto_id !== id)); return }
    if (qtd > estoqueDisponivel) {
      setMensagem(`⚠️ Estoque disponível: apenas ${estoqueDisponivel} unidade(s)!`)
      return
    }
    setItens(itens.map(i => i.produto_id === id
      ? { ...i, quantidade: qtd, subtotal: qtd * i.valor_unitario }
      : i
    ))
  }

  function atualizarParcela(index, campo, valor) {
    const novas = [...parcelas]
    novas[index] = { ...novas[index], [campo]: valor }
    setParcelas(novas)
  }

  async function finalizarVenda() {
    if (!cliente || itens.length === 0) {
      setMensagem('Adicione produtos e selecione um cliente!')
      return
    }
    const todasComData = parcelas.every(p => p.data)
    if (!todasComData) {
      setMensagem('Preencha a data de todas as parcelas!')
      return
    }

    const obsParcelamento = parseInt(parcelamento) > 1
      ? `${parcelamento}x: ` + parcelas.map((p, i) =>
          `${i+1}ª R$${p.valor} em ${new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR')}`
        ).join(' | ')
      : ''

    const { data: venda, error } = await supabase.from('vendas').insert({
      cliente_id: cliente.id,
      data_para_pagar: parcelas[0].data,
      valor_bruto: subtotalItens,
      valor_total: total,
      desconto: valorDesconto,
      recebido: 0,
      situacao: 'Pendente',
      observacao: [
        obsParcelamento,
        valorDesconto > 0 ? `Desconto: R$ ${valorDesconto.toFixed(2)}` : '',
        observacao
      ].filter(Boolean).join(' | ')
    }).select().single()

    if (error) { setMensagem('Erro: ' + error.message); return }

    for (const item of itens) {
      await supabase.from('itens_venda').insert({
        venda_id: venda.id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario
      })
      const { data: prod } = await supabase.from('produtos').select('estoque').eq('id', item.produto_id).single()
      await supabase.from('produtos').update({ estoque: prod.estoque - item.quantidade }).eq('id', item.produto_id)
    }

    setVendaFinalizada({
      cliente, itens: [...itens], total,
      parcelas: [...parcelas], parcelamento, observacao, data: new Date()
    })
    setItens([])
    setCliente(null)
    setParcelas([{ data: '', valor: '' }])
    setParcelamento('1')
    setObservacao('')
    setDesconto('')
    setMensagem('')
  }

  function imprimir() {
    const conteudo = comprovanteRef.current.innerHTML
    const janela = window.open('', '_blank')
    janela.document.write(`
      <html><head><title>Comprovante - Santiagos Presentes</title>
      <style>* { margin:0; padding:0; box-sizing:border-box; } body { font-family:Arial,sans-serif; padding:20px; max-width:400px; margin:0 auto; } .logo { text-align:center; margin-bottom:16px; } .logo img { width:80px; height:80px; border-radius:50%; } h2 { text-align:center; color:#1a6b5a; font-size:18px; margin:8px 0 4px; } .info-loja { text-align:center; color:#666; font-size:13px; margin-bottom:16px; } .linha { border-top:1px dashed #999; margin:12px 0; } .total { display:flex; justify-content:space-between; font-size:16px; font-weight:bold; color:#1a6b5a; margin:8px 0; } @media print { button { display:none; } }</style>
      </head><body>${conteudo}</body></html>
    `)
    janela.document.close()
    janela.focus()
    setTimeout(() => { janela.print() }, 500)
  }

  async function compartilhar() {
    try {
      const canvas = await html2canvas(comprovanteRef.current, { scale: 2, useCORS: true })
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'comprovante-santiagos.png', { type: 'image/png' })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Comprovante - Santiagos Presentes' })
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = 'comprovante-santiagos.png'; a.click()
          URL.revokeObjectURL(url)
        }
      }, 'image/png')
    } catch (err) { console.error('Erro ao compartilhar:', err) }
  }

  const campo = { width: '100%', padding: '10px', marginTop: '6px', borderRadius: '6px', border: '1px solid #ddd' }

  return (
    <div>
      {/* LEITOR DE CÂMERA */}
      {cameraAberta && (
        <LeitorCamera
          onLeitura={onLeituraCamera}
          onFechar={() => setCameraAberta(false)}
        />
      )}

      <PageHeader
  title="Nova Venda"
  subtitle="Registre vendas e controle pagamentos"
  icon={
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="21" r="1"/>
      <circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  }
/>

      {/* MODAL DO COMPROVANTE */}
      {vendaFinalizada && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <div ref={comprovanteRef} style={{ padding: '24px' }}>
              <div className="logo" style={{ textAlign: 'center', marginBottom: '12px' }}>
                <img src="/logo.png" alt="Logo" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #1a6b5a' }} />
                <h2 style={{ color: '#1a6b5a', fontSize: '18px', marginTop: '8px' }}>Santiagos Presentes</h2>
                <p style={{ color: '#666', fontSize: '13px' }}>📞 (24) 98161-8699</p>
                <p style={{ color: '#999', fontSize: '12px' }}>
                  {vendaFinalizada.data.toLocaleDateString('pt-BR')} às {vendaFinalizada.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div style={{ borderTop: '1px dashed #999', margin: '12px 0' }} />
              <div style={{ marginBottom: '12px', fontSize: '14px' }}>
                <strong style={{ color: '#1a6b5a' }}>Cliente:</strong> {vendaFinalizada.cliente.nome}<br />
                {vendaFinalizada.cliente.telefone && <span style={{ color: '#666', fontSize: '13px' }}>📞 {vendaFinalizada.cliente.telefone}</span>}
              </div>
              <div style={{ borderTop: '1px dashed #999', margin: '12px 0' }} />
              <div style={{ marginBottom: '8px' }}><strong style={{ fontSize: '13px', color: '#555' }}>PRODUTOS</strong></div>
              {vendaFinalizada.itens.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ flex: 1, paddingRight: '8px' }}>{item.nome}</span>
                  <span style={{ color: '#666', marginRight: '8px' }}>{item.quantidade}x R$ {item.valor_unitario.toFixed(2)}</span>
                  <strong>R$ {item.subtotal.toFixed(2)}</strong>
                </div>
              ))}
              <div style={{ borderTop: '2px solid #333', margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', color: '#1a6b5a', marginBottom: '8px' }}>
                <span>TOTAL</span><span>R$ {vendaFinalizada.total.toFixed(2)}</span>
              </div>
              {parseInt(vendaFinalizada.parcelamento) > 1 ? (
                <div style={{ background: '#f8f8f8', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '13px', color: '#555' }}>PARCELAMENTO — {vendaFinalizada.parcelamento}x</strong>
                  {vendaFinalizada.parcelas.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '6px' }}>
                      <span>{i + 1}ª parcela — {new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      <strong>R$ {p.valor}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#555', marginBottom: '8px' }}>
                  <strong>Vencimento:</strong> {new Date(vendaFinalizada.parcelas[0].data + 'T12:00:00').toLocaleDateString('pt-BR')}
                </div>
              )}
              {vendaFinalizada.observacao && (
                <p style={{ fontSize: '12px', color: '#777', fontStyle: 'italic', marginTop: '8px' }}>Obs: {vendaFinalizada.observacao}</p>
              )}
              <div style={{ borderTop: '1px dashed #999', margin: '12px 0' }} />
              <p style={{ textAlign: 'center', fontSize: '12px', color: '#999' }}>Obrigado pela preferência!<br />Santiagos Presentes 🏪</p>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', gap: '8px' }}>
              <button onClick={imprimir} style={{ flex: 1, background: 'linear-gradient(135deg, #1a6b5a, #145a4a)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}>🖨️ Imprimir</button>
              <button onClick={compartilhar} style={{ flex: 1, background: 'linear-gradient(135deg, #1a6b5a, #145a4a)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}>📤 Compartilhar</button>
              <button onClick={() => setVendaFinalizada(null)} style={{ flex: 1, background: '#eee', color: '#333', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px' }}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid-2" style={{ marginTop: '16px' }}>

        {/* PRODUTOS */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ marginBottom: '16px', color: '#1a6b5a' }}>Produtos</h3>

          {/* Busca por código + botões câmera e adicionar */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              value={codigoBusca}
              onChange={e => setCodigoBusca(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscarProduto()}
              placeholder="Código do produto..."
              style={{ ...campo, marginTop: 0, flex: 1 }}
            />
            {/* Botão câmera / QR Code */}
            <button
              onClick={() => setCameraAberta(true)}
              title="Escanear código de barras ou QR Code"
              style={{
                background: 'linear-gradient(135deg, #f5821f, #c2185b)',
                color: 'white', border: 'none',
                padding: '10px 14px', borderRadius: '8px',
                cursor: 'pointer', fontSize: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/>
                <rect x="3" y="16" width="5" height="5"/>
                <path d="M21 16h-3v3"/><path d="M18 21h3"/><path d="M14 3h1v5h-1z"/>
                <path d="M14 11h1v2h-1z"/><path d="M11 3v3"/><path d="M11 10v2"/>
              </svg>
            </button>
            {/* Botão adicionar */}
            <button
              onClick={() => buscarProduto()}
              style={{
                background: '#1a6b5a', color: 'white', border: 'none',
                padding: '10px 16px', borderRadius: '8px',
                cursor: 'pointer', fontWeight: 'bold', fontSize: '20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >+</button>
          </div>

          {mensagem && (
            <p style={{
              color: mensagem.includes('✅') ? 'green' : '#e94560',
              fontSize: '13px', marginBottom: '12px',
              background: mensagem.includes('✅') ? '#e8f5e9' : '#fff0f3',
              padding: '8px 12px', borderRadius: '6px'
            }}>
              {mensagem}
            </p>
          )}

          {itens.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#bbb' }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>🛒</div>
              <p style={{ fontSize: '14px' }}>Nenhum produto adicionado</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>Digite o código ou use a câmera</p>
            </div>
          )}

          {itens.map(item => (
            <div key={item.produto_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#f8f8f8', borderRadius: '8px', marginBottom: '8px' }}>
              <div>
                <strong style={{ fontSize: '14px' }}>{item.nome}</strong><br />
                <small style={{ color: '#666' }}>{item.categoria} | R$ {item.valor_unitario.toFixed(2)}</small><br />
                <small style={{ color: '#1a6b5a' }}>Estoque: {item.estoque_disponivel}</small>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button onClick={() => alterarQuantidade(item.produto_id, item.quantidade - 1, item.estoque_disponivel)} style={{ background: '#ddd', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}>-</button>
                <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{item.quantidade}</span>
                <button onClick={() => alterarQuantidade(item.produto_id, item.quantidade + 1, item.estoque_disponivel)} style={{ background: '#ddd', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}>+</button>
                <strong style={{ color: '#1a6b5a', minWidth: '80px', textAlign: 'right' }}>R$ {item.subtotal.toFixed(2)}</strong>
              </div>
            </div>
          ))}

          <div style={{ borderTop: '2px solid #eee', marginTop: '16px', paddingTop: '16px', textAlign: 'right' }}>
            {valorDesconto > 0 && (
              <div style={{ fontSize: '14px', color: '#888', marginBottom: '4px' }}>
                Subtotal: R$ {subtotalItens.toFixed(2)}<br />
                <span style={{ color: '#2e7d32' }}>Desconto: -R$ {valorDesconto.toFixed(2)}</span>
              </div>
            )}
            <strong style={{ fontSize: '22px', color: '#1a6b5a' }}>Total: R$ {total.toFixed(2)}</strong>
          </div>
        </div>

        {/* DADOS DA VENDA */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ marginBottom: '16px', color: '#1a6b5a' }}>Dados da Venda</h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Cliente</label><br />
            <select value={cliente ? cliente.id : ''} onChange={e => setCliente(clientes.find(c => c.id === e.target.value) || null)} style={campo}>
              <option value="">Selecione o cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          {cliente && (
            <div style={{ background: '#f0f9f0', border: '1px solid #4caf50', borderRadius: '8px', padding: '10px', marginBottom: '16px', fontSize: '13px' }}>
              ✅ <strong>{cliente.nome}</strong> — {cliente.telefone}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Parcelamento</label><br />
            <select value={parcelamento} onChange={e => setParcelamento(e.target.value)} style={campo}>
              <option value="1">À vista (1x)</option>
              <option value="2">2x</option>
              <option value="3">3x</option>
              <option value="4">4x</option>
              <option value="5">5x</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px', background: '#f8f8f8', padding: '16px', borderRadius: '8px', border: '1px solid #eee' }}>
            <label style={{ fontWeight: 'bold', fontSize: '13px', color: '#1a6b5a' }}>
              {parseInt(parcelamento) === 1 ? 'Data de Pagamento' : `Datas das ${parcelamento} Parcelas`}
            </label>
            {parcelas.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', color: '#666', whiteSpace: 'nowrap', minWidth: '80px' }}>
                  {parseInt(parcelamento) > 1 ? `${i + 1}ª parcela` : 'Vencimento'}
                </span>
                <input
                  type="date"
                  value={p.data}
                  onChange={e => atualizarParcela(i, 'data', e.target.value)}
                  style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', minWidth: '140px' }}
                />
                {parseInt(parcelamento) > 1 && (
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1a6b5a', whiteSpace: 'nowrap' }}>
                    R$ {p.valor}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Observação (opcional)</label><br />
            <input value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Ex: Cliente busca na loja" style={campo} />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Desconto (R$)</label><br />
            <input type="number" step="0.01" min="0" value={desconto} onChange={e => setDesconto(e.target.value)} placeholder="Ex: 10.00" style={campo} />
            {valorDesconto > 0 && (
              <div style={{ marginTop: '8px', background: '#e8f5e9', border: '1px solid #4caf50', borderRadius: '6px', padding: '8px 12px', fontSize: '13px' }}>
                <span style={{ color: '#2e7d32' }}>✅ Desconto de <strong>R$ {valorDesconto.toFixed(2)}</strong> aplicado!</span>
              </div>
            )}
          </div>

          <button
            onClick={finalizarVenda}
            style={{ width: '100%', background: 'linear-gradient(135deg, #f5821f, #c2185b)', color: 'white', border: 'none', padding: '14px', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
          >
            Finalizar Venda →
          </button>
        </div>
      </div>
    </div>
  )
}

export default Vendas
