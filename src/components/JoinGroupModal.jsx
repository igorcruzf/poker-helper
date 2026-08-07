import { useEffect, useState } from 'react'
import { useI18n } from '../hooks/useI18n.js'

// Duas etapas no mesmo modal: acha o grupo pelo código e, achando, pergunta
// quem a pessoa é lá dentro. Quem chega pelo link do convite já entra na
// segunda etapa, com o código preenchido.
export default function JoinGroupModal({ open, initialCode, onCancel, onFind, onRequest }) {
  const { t } = useI18n()
  const [code, setCode] = useState('')
  const [found, setFound] = useState(null)
  const [claim, setClaim] = useState('')
  const [claimName, setClaimName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setCode(initialCode || '')
    setFound(null)
    setClaim('')
    setClaimName('')
    setError('')
  }, [open, initialCode])

  // Chegou pelo link: procura sozinho, sem a pessoa ter que apertar nada.
  useEffect(() => {
    if (!open || !initialCode) return
    let alive = true
    setBusy(true)
    onFind(initialCode).then((data) => {
      if (!alive) return
      setFound(data || { notFound: true })
      setBusy(false)
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialCode])

  if (!open) return null

  const players = found?.players || []
  const canPick = found && !found.notFound && !found.already_member && !found.pending
  const canRequest = claim === '__new' ? claimName.trim().length > 0 : !!claim

  async function handleFind(e) {
    e.preventDefault()
    if (!code.trim()) return
    setBusy(true)
    setError('')
    const data = await onFind(code.trim())
    setFound(data || { notFound: true })
    setClaim('')
    setClaimName('')
    setBusy(false)
  }

  async function handleRequest() {
    // Antes o botão só ficava apagado, e ninguém entendia o que faltava.
    if (!canRequest) {
      setError(t(claim === '__new' ? 'groups.pickNameFirst' : 'groups.pickPlayerFirst'))
      return
    }
    setBusy(true)
    setError('')
    const err = await onRequest({
      code: code.trim(),
      playerId: claim === '__new' ? null : claim,
      playerName: claim === '__new' ? claimName.trim() : null,
    })
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <div className="overlay">
      <div className="modal">
        <p className="question">{t('groups.joinTitle')}</p>

        <form className="roster-add" onSubmit={handleFind}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t('groups.codePlaceholder')}
            maxLength={8}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            autoFocus={!initialCode}
          />
          <button type="submit" className="roster-add-btn" disabled={busy || !code.trim()}>
            {t('groups.find')}
          </button>
        </form>

        {found?.notFound && <div className="empty-state">{t('groups.notFound')}</div>}

        {found && !found.notFound && found.already_member && (
          <div className="empty-state">{t('groups.alreadyMember', { group: found.name })}</div>
        )}

        {found && !found.notFound && !found.already_member && found.pending && (
          <div className="empty-state">{t('groups.alreadyPending', { group: found.name })}</div>
        )}

        {canPick && (
          <>
            <p className="modal-hint">{t('groups.whoAreYou', { group: found.name })}</p>
            <div className="theme-list pick-list">
              {players.map((p) => (
                <button
                  key={p.id}
                  className={`theme-option${claim === p.id ? ' active' : ''}`}
                  onClick={() => { setClaim(p.id); setError('') }}
                >
                  <span className="theme-name">{p.name}</span>
                  {claim === p.id && <span className="theme-check">✓</span>}
                </button>
              ))}
              <button
                className={`theme-option${claim === '__new' ? ' active' : ''}`}
                onClick={() => { setClaim('__new'); setError('') }}
              >
                <span className="theme-name">
                  {t('groups.iAmNew')}
                  <small>{t('groups.iAmNewHint')}</small>
                </span>
                {claim === '__new' && <span className="theme-check">✓</span>}
              </button>
            </div>

            {error && <div className="auth-error">{error}</div>}

            {claim === '__new' && (
              <label className="auth-field">
                <span>{t('groups.myName')}</span>
                <input
                  value={claimName}
                  onChange={(e) => setClaimName(e.target.value)}
                  placeholder={t('groups.myNamePlaceholder')}
                />
              </label>
            )}

            <button className="add-player-btn" onClick={handleRequest} disabled={busy}>
              {t('groups.sendRequest')}
            </button>
          </>
        )}

        <div className="modal-actions">
          <div className="round-action cancel" onClick={onCancel}>✕</div>
        </div>
      </div>
    </div>
  )
}
