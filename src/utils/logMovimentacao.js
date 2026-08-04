import { supabase } from '../supabase'

export const NOMES_POR_EMAIL = {
  'levilaureano@gmail.com': 'Levy Santiago',
  'bruninhaa_oliveiraa@hotmail.com': 'Bruna Ambrózio',
  'pr.ubaldosantiago@gmail.com': 'Ubaldo Santiago',
  'vivianesantiago580@gmail.com': 'Viviane Santiago',
}

export function nomeDoUsuario(email) {
  return NOMES_POR_EMAIL[email] || (email ? email.split('@')[0] : 'Desconhecido')
}

export async function registrarMovimentacao({ tela, tipo, descricao, referencia_id = null, dados = null }) {
  const { data: userData } = await supabase.auth.getUser()
  const email = userData?.user?.email || null
  const nome = nomeDoUsuario(email)

  const { error } = await supabase.from('historico_geral').insert({
    usuario_email: email,
    usuario_nome: nome,
    tela,
    tipo,
    descricao,
    referencia_id,
    dados,
  })
  if (error) console.error('Erro ao registrar movimentação:', error)
}