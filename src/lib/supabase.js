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

// Mensagens do Supabase chegam em ingles; mapeia para chave de traducao.
export function authErrorKey(error) {
  const msg = String(error?.message || '')
  if (/invalid login credentials/i.test(msg)) return 'authError.credentials'
  if (/email not confirmed/i.test(msg)) return 'authError.unconfirmed'
  if (/user already registered/i.test(msg)) return 'authError.registered'
  if (/password should be at least/i.test(msg)) return 'authError.shortPassword'
  if (/unable to validate email/i.test(msg) || /invalid email/i.test(msg)) return 'authError.invalidEmail'
  if (/rate limit/i.test(msg)) return 'authError.rateLimit'
  return 'authError.generic'
}
