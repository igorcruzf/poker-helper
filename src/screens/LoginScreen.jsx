import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { authErrorMessage } from '../lib/supabase.js'

export default function LoginScreen() {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    const { data, error } =
      mode === 'signin' ? await signIn(email.trim(), password) : await signUp(email.trim(), password)
    if (error) {
      setError(authErrorMessage(error))
    } else if (mode === 'signup' && !data?.session) {
      setNotice('Conta criada. Confirme o e-mail que enviamos para entrar.')
    }
    setBusy(false)
  }

  async function handleGoogle() {
    setBusy(true)
    setError('')
    const { error } = await signInWithGoogle()
    if (error) {
      setError(authErrorMessage(error))
      setBusy(false)
    }
  }

  return (
    <div className="app-shell">
      <div className="app auth-app">
        <div className="header-titles auth-titles">
          <div className="eyebrow">Mesa de Poker</div>
          <h1><span className="suit gold">♠</span>Cacifes<span className="suit red">♥</span></h1>
        </div>

        <div className="card auth-card">
          <p className="auth-lead">
            {mode === 'signin' ? 'Entre para abrir a mesa.' : 'Crie sua conta para começar.'}
          </p>

          <form onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>E-mail</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
              />
            </label>

            <label className="auth-field">
              <span>Senha</span>
              <input
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mínimo 6 caracteres"
              />
            </label>

            {error && <div className="auth-error">{error}</div>}
            {notice && <div className="auth-notice">{notice}</div>}

            <button className="add-player-btn" type="submit" disabled={busy}>
              {busy ? 'Aguarde…' : mode === 'signin' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <div className="auth-divider"><span>ou</span></div>

          <button className="export-btn google-btn" onClick={handleGoogle} disabled={busy}>
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.2 5.400-4.6 7.1l7.5 5.8c4.4-4.1 6.8-10.1 6.8-17.4z" />
              <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.8-6.1C.9 16.3 0 20 0 24s.9 7.7 2.6 10.8l7.8-6.1z" />
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.7-3.7-13.6-9.0l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
            </svg>
            Continuar com Google
          </button>

          <button
            className="reset-cancel-link"
            type="button"
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice('') }}
          >
            {mode === 'signin' ? 'Não tenho conta — criar uma' : 'Já tenho conta — entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
