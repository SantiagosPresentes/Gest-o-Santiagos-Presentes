import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import html2canvas from 'html2canvas'
import PageHeader from '../components/PageHeader'
import {ShoppingCart, ClipboardList, RotateCcw, Package, TrendingUp, Boxes, Users, DollarSign, History, BarChart3, FileText, ScanLine, X, CheckCircle, AlertCircle, CameraOff} from 'lucide-react'

// ─── Leitor de Código (BarcodeDetector nativo, com fallback ZXing) ────────────
function LeitorCamera({ onLeitura, onFechar }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const animFrameRef = useRef(null)
  const detectorRef = useRef(null)
  const lastCodeRef = useRef(null)
  const debounceRef = useRef(null)

  const [status, setStatus] = useState('starting') // starting | scanning | error
  const [errorMsg, setErrorMsg] = useState('')
  const [lastScanned, setLastScanned] = useState(null)
  const [scanLine, setScanLine] = useState(0)

  // Animação da linha de scan
  useEffect(() => {
    let dir = 1
    let pos = 10
    const interval = setInterval(() => {
      pos += dir * 1.2
      if (pos >= 90) dir = -1
      if (pos <= 10) dir = 1
      setScanLine(pos)
    }, 16)
    return () => clearInterval(interval)
  }, [])

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  const startScan = useCallback(async () => {
    try {
      // Prefere câmera traseira
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Usa BarcodeDetector nativo se disponível
      if ('BarcodeDetector' in window) {
        detectorRef.current = new window.BarcodeDetector({
          formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'code_93', 'upc_a', 'upc_e', 'itf', 'data_matrix']
        })
        setStatus('scanning')

        const tick = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            animFrameRef.current = requestAnimationFrame(tick)
            return
          }
          try {
            const barcodes = await detectorRef.current.detect(videoRef.current)
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue
              if (code !== lastCodeRef.current) {
                lastCodeRef.current = code
                clearTimeout(debounceRef.current)
                debounceRef.current = setTimeout(() => { lastCodeRef.current = null }, 2000)
                setLastScanned(code)
                setTimeout(() => {
                  stopCamera()
                  onLeitura(code)
                }, 300)
                return
              }
            }
          } catch (_) {}
          animFrameRef.current = requestAnimationFrame(tick)
        }
        animFrameRef.current = requestAnimationFrame(tick)
      } else {
        // Fallback: ZXing via CDN
        setStatus('scanning')
        if (!window.__zxingLoaded) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://unpkg.com/@zxing/browser@0.1.4/umd/index.min.js'
            script.onload = () => { window.__zxingLoaded = true; resolve() }
            script.onerror = reject
            document.head.appendChild(script)
          })
        }
        const codeReader = new window.ZXingBrowser.BrowserMultiFormatReader()
        codeReader.decodeFromVideoElement(videoRef.current, (result, err, controls) => {
          if (result) {
            const code = result.getText()
            controls.stop()
            stopCamera()
            onLeitura(code)
          }
        })
      }
    } catch (err) {
      console.error('Scanner error:', err)
      if (err.name === 'NotAllowedError') {
        setErrorMsg('Permissão de câmera negada. Habilite o acesso à câmera nas configurações do navegador.')
      } else if (err.name === 'NotFoundError') {
        setErrorMsg('Nenhuma câmera encontrada neste dispositivo.')
      } else {
        setErrorMsg('Não foi possível iniciar a câmera. ' + (err.message || ''))
      }
      setStatus('error')
    }
  }, [onLeitura, stopCamera])

  useEffect(() => {
    startScan()
    return () => {
      stopCamera()
      clearTimeout(debounceRef.current)
    }
  }, [startScan, stopCamera])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
      zIndex: 2000, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '20px 20px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'rgba(26,107,90,0.25)', border: '1px solid rgba(26,107,90,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ScanLine size={16} color='#4fd1a5' />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>Leitor de Código</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
              {status === 'scanning' ? 'Aponte para o código' : status === 'starting' ? 'Iniciando câmera...' : 'Erro'}
            </div>
          </div>
        </div>
        <button
          onClick={() => { stopCamera(); onFechar() }}
          style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Camera View */}
      <div style={{
        position: 'relative',
        width: '100%', maxWidth: '420px',
        aspectRatio: '1 / 1',
        overflow: 'hidden',
      }}>
        {status !== 'error' && (
          <video
            ref={videoRef}
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}

        {status === 'error' && (
          <div style={{
            width: '100%', height: '100%',
            background: '#111',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '16px',
            padding: '32px',
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CameraOff size={24} color='#ef4444' />
            </div>
            <p style={{
              fontSize: '13px', color: 'rgba(255,255,255,0.6)',
              textAlign: 'center', lineHeight: '1.6',
            }}>
              {errorMsg}
            </p>
          </div>
        )}

        {/* Overlay: viewfinder */}
        {status === 'scanning' && (
          <>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.45)',
              WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, transparent 55%, black 56%)',
              maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, transparent 55%, black 56%)',
            }} />

            {/* Cantos da mira */}
            {[
              { top: '20%', left: '20%', borderTop: '2px solid #1a6b5a', borderLeft: '2px solid #1a6b5a', borderRadius: '4px 0 0 0' },
              { top: '20%', right: '20%', borderTop: '2px solid #1a6b5a', borderRight: '2px solid #1a6b5a', borderRadius: '0 4px 0 0' },
              { bottom: '20%', left: '20%', borderBottom: '2px solid #1a6b5a', borderLeft: '2px solid #1a6b5a', borderRadius: '0 0 0 4px' },
              { bottom: '20%', right: '20%', borderBottom: '2px solid #1a6b5a', borderRight: '2px solid #1a6b5a', borderRadius: '0 0 4px 0' },
            ].map((style, i) => (
              <div key={i} style={{
                position: 'absolute', width: '28px', height: '28px', ...style,
              }} />
            ))}

            {/* Linha de scan */}
            <div style={{
              position: 'absolute',
              left: '21%', right: '21%',
              top: `${20 + scanLine * 0.6}%`,
              height: '1.5px',
              background: 'linear-gradient(to right, transparent, #1a6b5a 20%, #4fd1a5 50%, #1a6b5a 80%, transparent)',
              boxShadow: '0 0 8px rgba(26,107,90,0.8)',
              transition: 'top 16ms linear',
            }} />
          </>
        )}

        {/* Loading */}
        {status === 'starting' && (
          <div style={{
            position: 'absolute', inset: 0,
            background: '#111',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              border: '2px solid rgba(26,107,90,0.2)',
              borderTop: '2px solid #1a6b5a',
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
      </div>

      {/* Rodapé */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '24px 24px 40px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
      }}>
        {lastScanned ? (
          <div style={{
            background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '10px', padding: '10px 16px',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <CheckCircle size={14} color='#10b981' />
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
              Código lido: {lastScanned}
            </span>
          </div>
        ) : (
          <p style={{
            fontSize: '12px', color: 'rgba(255,255,255,0.4)',
            textAlign: 'center',
          }}>
            Posicione o código de barras ou QR Code dentro da área marcada
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Busca de Cliente (autocomplete) ──────────────────────────────────────────
function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function BuscaCliente({ clientes, cliente, onSelecionar, campoStyle }) {
  const [texto, setTexto] = useState('')
  const [aberto, setAberto] = useState(false)
  const [indiceAtivo, setIndiceAtivo] = useState(-1)
  const containerRef = useRef(null)
  const listaRef = useRef(null)

  // Mantém o texto do input sincronizado com o cliente selecionado
  useEffect(() => {
    setTexto(cliente ? cliente.nome : '')
  }, [cliente])

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickFora(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAberto(false)
        setIndiceAtivo(-1)
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [])

  const termoBusca = normalizarTexto(texto.trim())
  // Mostra TODOS os clientes cadastrados (sem limite) quando o campo está vazio,
  // e filtra por nome (em qualquer parte) conforme o usuário digita.
  const resultados = termoBusca
    ? clientes.filter(c => normalizarTexto(c.nome).includes(termoBusca))
    : clientes

  function selecionar(c) {
    onSelecionar(c)
    setTexto(c.nome)
    setAberto(false)
    setIndiceAtivo(-1)
  }

  function limpar() {
    onSelecionar(null)
    setTexto('')
    setAberto(false)
    setIndiceAtivo(-1)
  }

  function handleKeyDown(e) {
    if (!aberto) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndiceAtivo(i => Math.min(i + 1, resultados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndiceAtivo(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (indiceAtivo >= 0 && resultados[indiceAtivo]) {
        selecionar(resultados[indiceAtivo])
      }
    } else if (e.key === 'Escape') {
      setAberto(false)
      setIndiceAtivo(-1)
    }
  }

  // Mantém o item ativo (navegação por teclado) visível dentro da lista
  useEffect(() => {
    if (indiceAtivo < 0 || !listaRef.current) return
    const item = listaRef.current.children[indiceAtivo]
    if (item) item.scrollIntoView({ block: 'nearest' })
  }, [indiceAtivo])

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          value={texto}
          onChange={e => {
            setTexto(e.target.value)
            setAberto(true)
            setIndiceAtivo(-1)
            if (cliente) onSelecionar(null)
          }}
          onFocus={() => setAberto(true)}
          onClick={() => setAberto(true)}
          onKeyDown={handleKeyDown}
          placeholder="Digite o nome do cliente..."
          style={{ ...campoStyle, paddingRight: cliente ? '32px' : campoStyle.padding }}
          autoComplete="off"
        />
        {cliente && (
          <button
            type="button"
            onClick={limpar}
            title="Limpar seleção"
            style={{
              position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '4px',
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {aberto && (
        <div
          ref={listaRef}
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: 'white', border: '1px solid #ddd', borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 50,
            maxHeight: '260px', overflowY: 'auto',
          }}
        >
          {resultados.length === 0 ? (
            <div style={{ padding: '12px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
              Nenhum cliente encontrado
            </div>
          ) : (
            resultados.map((c, i) => (
              <div
                key={c.id}
                onMouseDown={(e) => { e.preventDefault(); selecionar(c) }}
                onMouseEnter={() => setIndiceAtivo(i)}
                style={{
                  padding: '10px 12px', cursor: 'pointer', fontSize: '14px',
                  background: i === indiceAtivo ? '#f0f9f0' : 'white',
                  borderBottom: i < resultados.length - 1 ? '1px solid #f0f0f0' : 'none',
                }}
              >
                <div style={{ fontWeight: '500' }}>{c.nome}</div>
                {c.telefone && <div style={{ fontSize: '12px', color: '#888' }}>{c.telefone}</div>}
              </div>
            ))
          )}
        </div>
      )}
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
  const [vendedorNome, setVendedorNome] = useState('')
  const subtotalItens = itens.reduce((acc, item) => acc + item.subtotal, 0)
  const valorDesconto = desconto && parseFloat(desconto) > 0 ? parseFloat(desconto) : 0
  const total = subtotalItens - valorDesconto

  useEffect(() => {
    supabase.from('clientes').select('*').order('nome').then(({ data }) => {
      if (data) setClientes(data)
    })

    // Mapeamento de email → nome do vendedor
    const nomesPorEmail = {
      'levilaureano@gmail.com': 'Levy Santiago',
      'bruninhaa_oliveiraa@hotmail.com': 'Bruna Ambrózio',
      'pr.ubaldosantiago@gmail.com': 'Ubaldo Santiago',
      'vivianesantiago580@gmail.com': 'Viviane Santiago',
    }

    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        const email = data.user.email
        const nome = nomesPorEmail[email] || email.split('@')[0]
        setVendedorNome(nome)
      }
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
      vendedor_nome: vendedorNome,
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
        title="Vendas"
        subtitle="Controle e acompanhamento das vendas realizadas"
        icon={<ShoppingCart size={22} color="white" />}
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
              <ScanLine size={20} />
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
            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Cliente</label>
            <BuscaCliente
              clientes={clientes}
              cliente={cliente}
              onSelecionar={setCliente}
              campoStyle={campo}
            />
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
