// Importa os hooks necessários
import { useState } from 'react'
// Importa a conexão com o Supabase
import { supabase } from '../supabase'

function Login() {
  // Estado para o email digitado
  const [email, setEmail] = useState('')
  // Estado para a senha digitada
  const [senha, setSenha] = useState('')
  // Estado para exibir mensagens de erro
  const [mensagem, setMensagem] = useState('')
  // Estado para controlar o carregamento
  const [carregando, setCarregando] = useState(false)

  // Função para realizar o login
  async function fazerLogin() {
    if (!email || !senha) { setMensagem('Preencha o e-mail e a senha!'); return }
    setCarregando(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      setMensagem('E-mail ou senha incorretos!')
      setCarregando(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a6b5a 0%, #145a4a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '40px 32px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        textAlign: 'center'
      }}>
        {/* Logo */}
        <img src="/logo.png" alt="Logo" style={{width:'100px', height:'100px', borderRadius:'50%', objectFit:'cover', marginBottom:'16px', border:'3px solid #1a6b5a'}}/>
        
        <h1 style={{color:'#1a6b5a', fontSize:'22px', fontWeight:'bold', marginBottom:'4px'}}>
          Santiagos Presentes
        </h1>
        <p style={{color:'#888', fontSize:'14px', marginBottom:'32px'}}>
          Faça login para continuar
        </p>

        {/* Campo de e-mail */}
        <div style={{marginBottom:'16px', textAlign:'left'}}>
          <label style={{fontSize:'13px', color:'#555', fontWeight:'bold'}}>E-mail</label><br/>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fazerLogin()}
            placeholder="seuemail@gmail.com"
            style={{width:'100%', padding:'12px', marginTop:'6px', borderRadius:'8px', border:'1px solid #ddd', fontSize:'15px'}}
          />
        </div>

        {/* Campo de senha */}
        <div style={{marginBottom:'24px', textAlign:'left'}}>
          <label style={{fontSize:'13px', color:'#555', fontWeight:'bold'}}>Senha</label><br/>
          <input
            type="password"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fazerLogin()}
            placeholder="••••••••"
            style={{width:'100%', padding:'12px', marginTop:'6px', borderRadius:'8px', border:'1px solid #ddd', fontSize:'15px'}}
          />
        </div>

        {/* Botão de login */}
        <button
          onClick={fazerLogin}
          disabled={carregando}
          style={{
            width:'100%',
            padding:'14px',
            background: carregando ? '#aaa' : 'linear-gradient(135deg, #f5821f, #e06010)',
            color:'white',
            border:'none',
            borderRadius:'10px',
            fontSize:'16px',
            fontWeight:'bold',
            cursor: carregando ? 'not-allowed' : 'pointer',
            boxShadow:'0 4px 12px rgba(245,130,31,0.4)'
          }}
        >
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>

        {/* Mensagem de erro */}
        {mensagem && (
          <p style={{marginTop:'16px', color:'red', fontSize:'14px'}}>{mensagem}</p>
        )}
      </div>
    </div>
  )
}

export default Login