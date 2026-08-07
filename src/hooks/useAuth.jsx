import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  // Quem chega pelo link do e-mail de recuperação entra com sessão válida, mas
  // precisa trocar a senha antes de qualquer outra coisa.
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session || null)
      setLoading(false)
    })
    // Mantém a sessão viva entre visitas e reage a login/logout em outra aba.
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next || null)
      setLoading(false)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      if (event === 'SIGNED_OUT') setRecovering(false)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = {
    session,
    user: session?.user || null,
    loading,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    // Nome e sobrenome viajam nos metadados da conta: o gatilho
    // `handle_new_user` no banco lê dali para já criar o perfil junto.
    signUp: (email, password, { firstName = '', lastName = '' } = {}) =>
      supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { first_name: firstName.trim(), last_name: lastName.trim() },
        },
      }),
    signInWithGoogle: () =>
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      }),
    signOut: () => supabase.auth.signOut(),
    // O link vai para /nova-senha. Se essa URL não estiver liberada no painel
    // do Supabase, ele cai na Site URL e o evento PASSWORD_RECOVERY ainda
    // coloca a tela de trocar senha na frente — por isso os dois caminhos.
    resetPassword: (email) =>
      supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/nova-senha`,
      }),
    updatePassword: (password) => supabase.auth.updateUser({ password }),
    recovering,
    endRecovery: () => setRecovering(false),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
