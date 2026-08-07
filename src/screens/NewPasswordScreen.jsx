import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { authErrorKey } from '../lib/supabase.js'
import AppChrome from '../components/AppChrome.jsx'
import { useI18n } from '../hooks/useI18n.js'

// Fim do caminho do "esqueci minha senha": o link do e-mail já criou a sessão,
// aqui só falta gravar a senha nova.
export default function NewPasswordScreen() {
  const navigate = useNavigate()
  const { updatePassword, endRecovery, signOut } = useAuth()
  const { t } = useI18n()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const mismatch = confirm.length > 0 && password !== confirm
  const canSubmit = password.length >= 6 && password === confirm && !busy

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError('')
    const { error } = await updatePassword(password)
    setBusy(false)
    if (error) {
      setError(t(authErrorKey(error)))
      return
    }
    endRecovery()
    navigate('/', { replace: true })
  }

  return (
    <div className="app-shell">
      <div className="app auth-app">
        <AppChrome />

        <div className="card auth-card">
          <p className="auth-lead">{t('login.newPasswordLead')}</p>

          <form onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>{t('login.newPassword')}</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.passwordHint')}
                autoFocus
              />
            </label>

            <label className="auth-field">
              <span>{t('login.confirmPassword')}</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              {mismatch && <small className="field-hint">{t('login.passwordMismatch')}</small>}
            </label>

            {error && <div className="auth-error">{error}</div>}

            <button className="add-player-btn" type="submit" disabled={!canSubmit}>
              {busy ? t('common.wait') : t('login.savePassword')}
            </button>
          </form>

          <button
            className="reset-cancel-link"
            type="button"
            onClick={() => { endRecovery(); signOut() }}
          >
            {t('login.backToSignIn')}
          </button>
        </div>
      </div>
    </div>
  )
}
