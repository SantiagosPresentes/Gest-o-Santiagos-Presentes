import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import PageHeader from '../components/PageHeader'
import { Package, Pencil, AlertTriangle, Search, X, ScanLine, CheckCircle, CameraOff, ArrowUpDown } from 'lucide-react'
import { registrarMovimentacao } from '../utils/logMovimentacao'

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

function Produtos() {
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('')
  const [preco, setPreco] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [estoqueMinimo, setEstoqueMinimo] = useState('')
  const [estoqueMaximo, setEstoqueMaximo] = useState('')
  const [produtos, setProdutos] = useState([])
  const [editando, setEditando] = useState(null)
  const [busca, setBusca] = useState('')
  const [ordenacao, setOrdenacao] = useState('nome') // 'nome' | 'codigo' | 'preco_asc' | 'preco_desc'
  const [cameraAlvo, setCameraAlvo] = useState(null) // 'codigo' | 'busca' | null

  useEffect(() => { carregarProdutos() }, [])

  async function carregarProdutos() {
    const { data } = await supabase.from('produtos').select('*').order('nome')
    if (data) setProdutos(data)
  }

  function onLeituraCamera(codigoLido) {
    if (cameraAlvo === 'codigo') {
      setCodigo(codigoLido)
    } else if (cameraAlvo === 'busca') {
      setBusca(codigoLido)
    }
    setCameraAlvo(null)
  }

  async function salvarProduto() {
    if (!codigo || !nome || !categoria || !preco) {
      setMensagem('Preencha todos os campos!'); return
    }
    const { error } = await supabase.from('produtos').insert({
      codigo: codigo.trim(),
      nome: nome.trim(),
      categoria: categoria.trim(),
      preco_venda: parseFloat(preco),
      estoque: 0,
      estoque_minimo: parseInt(estoqueMinimo) || 0,
      estoque_maximo: parseInt(estoqueMaximo) || 0
    })

    if (error) { setMensagem('Erro ao salvar: ' + error.message); return }
    setMensagem('Produto cadastrado com sucesso!')
    setCodigo(''); setNome(''); setCategoria(''); setPreco('')
    setEstoqueMinimo(''); setEstoqueMaximo('')
    carregarProdutos()
  }

  async function salvarEdicao() {
    if (!nome || !categoria || !preco) {
      setMensagem('Preencha todos os campos!'); return
    }
    const { error } = await supabase.from('produtos').update({
      nome: nome.trim(),
      categoria: categoria.trim(),
      preco_venda: parseFloat(preco),
      estoque_minimo: parseInt(estoqueMinimo) || 0,
      estoque_maximo: parseInt(estoqueMaximo) || 0
    }).eq('id', editando.id)
    
    if (error) { setMensagem('Erro ao atualizar: ' + error.message); return }
    setMensagem('Produto atualizado! Vendas anteriores não foram afetadas.')
    setEditando(null)
    setCodigo(''); setNome(''); setCategoria(''); setPreco('')
    setEstoqueMinimo(''); setEstoqueMaximo('')
    carregarProdutos()
  }

  function iniciarEdicao(produto) {
    setEditando(produto)
    setCodigo(produto.codigo)
    setNome(produto.nome)
    setCategoria(produto.categoria)
    setPreco(produto.preco_venda)
    setEstoqueMinimo(produto.estoque_minimo || 0)
    setEstoqueMaximo(produto.estoque_maximo || 0)
    setMensagem('')
    window.scrollTo(0, 0)
  }

  function cancelarEdicao() {
    setEditando(null)
    setCodigo(''); setNome(''); setCategoria(''); setPreco('')
    setEstoqueMinimo(''); setEstoqueMaximo('')
    setMensagem('')
  }

  const produtosFiltrados = produtos
    .filter(p =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.codigo.includes(busca)
    )
    .sort((a, b) => {
      if (ordenacao === 'nome') return a.nome.localeCompare(b.nome, 'pt-BR')
      if (ordenacao === 'codigo') return a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true })
      if (ordenacao === 'preco_asc') return parseFloat(a.preco_venda) - parseFloat(b.preco_venda)
      if (ordenacao === 'preco_desc') return parseFloat(b.preco_venda) - parseFloat(a.preco_venda)
      return 0
    })

  const campo = { width: '100%', padding: '10px', marginTop: '6px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }

  return (
    <div>
      {/* LEITOR DE CÂMERA */}
      {cameraAlvo && (
        <LeitorCamera
          onLeitura={onLeituraCamera}
          onFechar={() => setCameraAlvo(null)}
        />
      )}

      <PageHeader
        title="Produtos"
        subtitle="Cadastro e gerenciamento de produtos"
        icon={<Package size={22} color="white" />}
      />

      {/* FORMULÁRIO */}
      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', marginTop: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderTop: editando ? '3px solid #f5821f' : '3px solid #1a6b5a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          {editando ? (
            <Pencil size={16} color="#f5821f" />
          ) : (
            <Package size={16} color="#1a6b5a" />
          )}
          <h3 style={{ color: editando ? '#f5821f' : '#1a6b5a', margin: 0 }}>
            {editando ? `Editando: ${editando.nome}` : 'Novo Produto'}
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>

          <div>
            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Código do Produto</label><br />
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={codigo}
                onChange={e => setCodigo(e.target.value)}
                placeholder="Ex: 0001"
                disabled={!!editando}
                style={{ ...campo, flex: 1, background: editando ? '#f5f5f5' : 'white', color: editando ? '#888' : '#333' }}
              />
              {!editando && (
                <button
                  onClick={() => setCameraAlvo('codigo')}
                  title="Escanear código de barras ou QR Code"
                  style={{
                    marginTop: '6px',
                    background: 'linear-gradient(135deg, #f5821f, #c2185b)',
                    color: 'white', border: 'none',
                    padding: '0 12px', borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ScanLine size={17} />
                </button>
              )}
            </div>
            {editando && <small style={{ color: '#888' }}>O código não pode ser alterado</small>}
          </div>

          <div>
            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Nome do Produto</label><br />
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Cobredom" style={campo} />
          </div>

          <div>
            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Categoria</label><br />
            <select value={categoria} onChange={e => setCategoria(e.target.value)} style={campo}>
              <option value="">Selecione...</option>
              <option>Acessórios</option>
              <option>Cama / Mesa / Banho</option>
              <option>Cozinha</option>
              <option>Datas Comemorativas</option>
              <option>Decoração</option>
              <option>Escolar</option>
              <option>Infantil</option>
              <option>Lazer</option>
              <option>Perfumaria</option>
              <option>Utilidade</option>
            </select>
          </div>

          <div>
            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Preço de Venda (R$)</label><br />
            <input type="number" value={preco} onChange={e => setPreco(e.target.value)} placeholder="Ex: 25.90" style={campo} />
            {editando && (
              <small style={{ color: '#1a6b5a', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <AlertTriangle size={11} color="#1a6b5a" /> Não afeta vendas já realizadas
              </small>
            )}
          </div>

          {/* Mínimo e Máximo lado a lado */}
          <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Estoque Mínimo</label><br />
              <input
                type="number"
                value={estoqueMinimo}
                onChange={e => setEstoqueMinimo(e.target.value)}
                placeholder="Ex: 5"
                style={campo}
              />
            </div>
            <div>
              <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Estoque Máximo</label><br />
              <input
                type="number"
                value={estoqueMaximo}
                onChange={e => setEstoqueMaximo(e.target.value)}
                placeholder="Ex: 100"
                style={campo}
              />
            </div>
          </div>

        </div>{/* FIM DO GRID */}

        {/* BOTÕES */}
        <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
          {editando ? (
            <>
              <button onClick={salvarEdicao} style={{ flex: 1, background: 'linear-gradient(135deg, #f5821f, #e06010)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Pencil size={16} /> Salvar Alterações
              </button>
              <button onClick={cancelarEdicao} style={{ flex: 1, background: '#eee', color: '#333', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <X size={16} /> Cancelar
              </button>
            </>
          ) : (
            <button onClick={salvarProduto} style={{ flex: 1, background: 'linear-gradient(135deg, #1a6b5a, #145a4a)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Package size={16} /> Cadastrar Produto
            </button>
          )}
        </div>

        {mensagem && (
          <p style={{ marginTop: '16px', color: mensagem.includes('Erro') ? 'red' : 'green', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {mensagem.includes('Erro')
              ? <AlertTriangle size={14} color="red" />
              : <Package size={14} color="green" />
            }
            {mensagem}
          </p>
        )}
      </div>

      {/* LISTA DE PRODUTOS */}
      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', marginTop: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ color: '#1a6b5a', margin: 0 }}>Produtos Cadastrados ({produtos.length})</h3>
        </div>

        {/* Campo de busca com ícone + câmera */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} color="#a0aec0" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome ou código..."
              style={{ ...campo, marginTop: 0, paddingLeft: '36px' }}
            />
          </div>
          <button
            onClick={() => setCameraAlvo('busca')}
            title="Escanear código de barras ou QR Code"
            style={{
              background: 'linear-gradient(135deg, #f5821f, #c2185b)',
              color: 'white', border: 'none',
              padding: '0 12px', borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ScanLine size={17} />
          </button>
        </div>

        {/* Ordenação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <ArrowUpDown size={15} color="#888" style={{ flexShrink: 0 }} />
          <select
            value={ordenacao}
            onChange={e => setOrdenacao(e.target.value)}
            style={{ ...campo, marginTop: 0, maxWidth: '220px' }}
          >
            <option value="nome">Ordem alfabética (A-Z)</option>
            <option value="codigo">Ordem de código</option>
            <option value="preco_asc">Valor (menor para maior)</option>
            <option value="preco_desc">Valor (maior para menor)</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
          {produtosFiltrados.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f9f9f9', borderRadius: '8px', borderLeft: '3px solid #1a6b5a' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: '14px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</strong>
                <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>{p.codigo}</span>
                <span style={{ color: '#666', fontSize: '12px', marginLeft: '6px' }}>{p.categoria}</span><br />
                <strong style={{ color: '#1a6b5a', fontSize: '13px' }}>R$ {parseFloat(p.preco_venda).toFixed(2)}</strong>
                <span style={{ color: p.estoque > 0 ? 'green' : 'red', fontSize: '12px', marginLeft: '8px' }}>
                  Est: {p.estoque}
                </span>
                <span style={{ color: '#888', fontSize: '11px', marginLeft: '8px' }}>
                  Mín: {p.estoque_minimo || 0} / Máx: {p.estoque_maximo || 0}
                </span>
              </div>
              <button
                onClick={() => iniciarEdicao(p)}
                style={{ background: '#fff8e1', color: '#f57f17', border: '1px solid #f5821f', padding: '7px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '8px', flexShrink: 0 }}
                title="Editar produto"
              >
                <Pencil size={14} />
              </button>
            </div>
          ))}
          {produtosFiltrados.length === 0 && (
            <p style={{ textAlign: 'center', color: '#aaa', padding: '20px', gridColumn: '1/-1' }}>Nenhum produto encontrado</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Produtos
