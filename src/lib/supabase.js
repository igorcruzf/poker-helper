import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
// O dashboard do Supabase gera VITE_SUPABASE_PUBLISHABLE_KEY (chave nova) no
// botão "Connect", mas material antigo ainda fala em anon key. Aceita os dois.
const anonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

// Sem as variáveis de ambiente o app sobe mesmo assim e mostra uma tela
// explicando o que falta configurar, em vez de quebrar em tela branca.
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'poker-cacifes-auth',
      },
    })
  : null

// Mensagens do Supabase chegam em inglês; traduz as mais comuns.
export function authErrorMessage(error) {
  if (!error) return ''
  const msg = String(error.message || '')
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha inválidos.'
  if (/email not confirmed/i.test(msg)) return 'Confirme o e-mail antes de entrar.'
  if (/user already registered/i.test(msg)) return 'Esse e-mail já tem conta. Faça login.'
  if (/password should be at least/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (/unable to validate email/i.test(msg) || /invalid email/i.test(msg)) return 'E-mail inválido.'
  if (/rate limit/i.test(msg)) return 'Muitas tentativas. Espere um pouco e tente de novo.'
  return msg || 'Algo deu errado. Tente de novo.'
}
