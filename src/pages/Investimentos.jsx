import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import PageHeader from '../components/PageHeader'
import {ShoppingCart, ClipboardList, RotateCcw, Package, TrendingUp, Boxes, Users, DollarSign, History, BarChart3, FileText, ScanLine, X, CheckCircle, CameraOff} from 'lucide-react'

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

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

function mesReferenciaAtual() {
  const hoje = new Date()
  return `${MESES_PT[hoje.getMonth()]}/${hoje.getFullYear()}`
}

function Investimentos() {
  const [codigo, setCodigo] = useState('')
  const [produto, setProduto] = useState(null)
  const [fornecedor, setFornecedor] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [valorTotal, setValorTotal] = useState('')
  const [mes, setMes] = useState(mesReferenciaAtual())
  const [mensagem, setMensagem] = useState('')
  const [cameraAberta, setCameraAberta] = useState(false)

  const custoUnitario = quantidade && valorTotal ? (parseFloat(valorTotal) / parseInt(quantidade)).toFixed(2) : '0.00'
  const lucroUnitario = produto && custoUnitario ? (parseFloat(produto.preco_venda) - parseFloat(custoUnitario)).toFixed(2) : '0.00'
  const lucroFinal = lucroUnitario && quantidade ? (parseFloat(lucroUnitario) * parseInt(quantidade)).toFixed(2) : '0.00'

  // Percentual do lucro unitário em relação ao custo unitário
  const percentualLucroUnitario = parseFloat(custoUnitario) > 0
    ? ((parseFloat(lucroUnitario) / parseFloat(custoUnitario)) * 100).toFixed(1)
    : '0.0'

  // Percentual do lucro final em relação ao valor total investido
  const percentualLucroFinal = valorTotal && parseFloat(valorTotal) > 0
    ? ((parseFloat(lucroFinal) / parseFloat(valorTotal)) * 100).toFixed(1)
    : '0.0'

  async function buscarProduto(codigoOverride) {
    const codigoUsado = codigoOverride || codigo
    if (!codigoUsado) return
    const { data, error } = await supabase.from('produtos').select('*').eq('codigo', codigoUsado).single()
    if (error || !data) {
      setProduto(null)
      setMensagem('Produto não encontrado!')
    } else {
      setProduto(data)
      setMensagem('')
    }
  }

  function onLeituraCamera(codigoLido) {
    setCameraAberta(false)
    setCodigo(codigoLido)
    buscarProduto(codigoLido)
  }

  async function salvarInvestimento() {
    if (!produto || !fornecedor || !quantidade || !valorTotal || !mes) {
      setMensagem('Preencha todos os campos!')
      return
    }

    const { error } = await supabase.from('investimentos').insert({
      produto_id: produto.id,
      fornecedor: capitalizarPalavras(fornecedor),  // <- aqui
      quantidade: parseInt(quantidade),
      valor_total_pago: parseFloat(valorTotal),
      preco_venda: parseFloat(produto.preco_venda),
      mes: capitalizarPalavras(mes)
    })

    if (error) {
      setMensagem('Erro ao salvar: ' + error.message)
    } else {
      await supabase.from('produtos').update({ estoque: produto.estoque + parseInt(quantidade) }).eq('id', produto.id)
      setMensagem('Investimento registrado com sucesso!')
      setCodigo(''); setProduto(null); setFornecedor(''); setQuantidade(''); setValorTotal(''); setMes(mesReferenciaAtual())
    }
  }

  function capitalizarPalavras(str) {
    return str.trim().replace(/\b\w/g, l => l.toUpperCase())
  }

  const campo = { width:'100%', padding:'10px', marginTop:'6px', borderRadius:'6px', border:'1px solid #ddd' }
  const card = { background:'white', padding:'24px', borderRadius:'12px', maxWidth:'560px', marginTop:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }

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
        title="Investimentos"
        subtitle="Compras, fornecedores e investimentos realizados"
        icon={<TrendingUp size={22} color="white" />}
      />
      <div style={card}>
        <div style={{marginBottom:'16px'}}>
          <label>Código do Produto</label><br/>
          <div style={{display:'flex', gap:'8px', marginTop:'6px'}}>
            <input
              value={codigo}
              onChange={e => setCodigo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscarProduto()}
              placeholder="Ex: 0001"
              style={{...campo, marginTop:0, flex:1}}
            />
            {/* Botão câmera / QR Code */}
            <button
              onClick={() => setCameraAberta(true)}
              title="Escanear código de barras ou QR Code"
              style={{
                background: 'linear-gradient(135deg, #f5821f, #c2185b)',
                color: 'white', border: 'none',
                padding: '10px 14px', borderRadius: '6px',
                cursor: 'pointer', fontSize: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <ScanLine size={20} />
            </button>
            <button onClick={() => buscarProduto()} style={{background:'#1a1a2e', color:'white', border:'none', padding:'10px 16px', borderRadius:'6px', cursor:'pointer'}}>Buscar</button>
          </div>
        </div>

        {produto && (
          <div style={{background:'#f0f9f0', border:'1px solid #4caf50', borderRadius:'8px', padding:'12px', marginBottom:'16px'}}>
            <strong>✅ {produto.nome}</strong> | {produto.categoria} | R$ {produto.preco_venda}
          </div>
        )}

        <div style={{marginBottom:'16px'}}>
          <label>Fornecedor / Loja</label><br/>
          <input value={fornecedor} onChange={e => setFornecedor(e.target.value)} placeholder="Ex: Atacadão" style={campo}/>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px'}}>
          <div>
            <label>Quantidade Comprada</label><br/>
            <input type="number" value={quantidade} onChange={e => setQuantidade(e.target.value)} placeholder="Ex: 10" style={campo}/>
          </div>
          <div>
            <label>Valor Total Pago (R$)</label><br/>
            <input type="number" value={valorTotal} onChange={e => setValorTotal(e.target.value)} placeholder="Ex: 150.00" style={campo}/>
          </div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', marginBottom:'16px', background:'#f8f8f8', padding:'12px', borderRadius:'8px'}}>
          <div>
            <small>Custo Unitário</small><br/>
            <strong>R$ {custoUnitario}</strong>
          </div>
          <div>
            <small>Lucro Unitário</small><br/>
            <strong style={{color: parseFloat(lucroUnitario) >= 0 ? 'green' : 'red'}}>R$ {lucroUnitario}</strong><br/>
            <small style={{color: parseFloat(percentualLucroUnitario) >= 0 ? 'green' : 'red'}}>
              ({percentualLucroUnitario}%)
            </small>
          </div>
          <div>
            <small>Lucro Final</small><br/>
            <strong style={{color: parseFloat(lucroFinal) >= 0 ? 'green' : 'red'}}>R$ {lucroFinal}</strong><br/>
            <small style={{color: parseFloat(percentualLucroFinal) >= 0 ? 'green' : 'red'}}>
              ({percentualLucroFinal}%)
            </small>
          </div>
        </div>

        <div style={{marginBottom:'24px'}}>
          <label>Mês de Referência</label><br/>
          <input value={mes} readOnly disabled style={{...campo, background:'#f5f5f5', color:'#888', cursor:'not-allowed'}}/>
        </div>

        <button onClick={salvarInvestimento} style={{background:'linear-gradient(135deg, #f5821f, #c2185b)', color:'white', border:'none', padding:'12px 24px', borderRadius:'8px', cursor:'pointer', fontSize:'16px', width:'100%'}}>
          Registrar Investimento
        </button>
        {mensagem && <p style={{marginTop:'16px', color: mensagem.includes('sucesso') ? 'green' : 'red'}}>{mensagem}</p>}
      </div>
    </div>
  )
}

export default Investimentos
