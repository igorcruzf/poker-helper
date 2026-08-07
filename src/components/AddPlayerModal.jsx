import { useState } from 'react'
import { useRoster } from '../hooks/useRoster.js'
import { useI18n } from '../hooks/useI18n.js'

// Entra jogador no meio da noite: pega alguém do elenco ou cria na hora.
export default function AddPlayerModal({ open, tablePlayers, onCancel, onConfirm }) {
  const { roster, loading, addToRoster } = useRoster()
  const { t } = useI18n()
  const [newName, setNewName] = useState('')
  const [nickname, setNickname] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) return null

  const seated = new Set(tablePlayers.map((p) => p.player_id).filter(Boolean))
  const available = roster.filter((p) => !seated.has(p.id))

  // O campo de apelido só aparece quando faz falta: já existe alguém com esse
  // nome no elenco e sem apelido os dois virariam a mesma pessoa.
  const clash = roster.find(
    (p) => p.name.trim().toLowerCase() === newName.trim().toLowerCase()
  )

  async function handleCreate(e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name || (clash && !nickname.trim())) return
    setBusy(true)
    const { data, error } = await addToRoster(name, nickname)
    setBusy(false)
    if (error) return
    setNewName('')
    setNickname('')
    onConfirm({ name: data.label, playerId: data.id })
  }

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal">
        <button className="close-x" onClick={onCancel}>✕</button>
        <p className="question">{t('table.addTitle')}</p>

        {loading && <div className="empty-state">{t('table.addLoading')}</div>}

        {!loading && available.length === 0 && (
          <div className="empty-state">{t('table.addAllSeated')}</div>
        )}

        <div className="roster-list">
          {available.map((p) => (
            <div className="roster-item" key={p.id}>
              <button
                className="roster-pick"
                onClick={() => onConfirm({ name: p.label, playerId: p.id })}
              >
                <span className="roster-check">+</span>
                <span className="roster-name">{p.label}</span>
              </button>
            </div>
          ))}
        </div>

        <form className="roster-add" onSubmit={handleCreate}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('table.addNewName')}
          />
          <button
            type="submit"
            className="roster-add-btn"
            disabled={busy || !newName.trim() || (!!clash && !nickname.trim())}
          >
            {t('create.add')}
          </button>
        </form>

        {clash && (
          <label className="auth-field nickname-field">
            <span>{t('create.nicknameLabel')}</span>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t('create.nicknamePlaceholder')}
              autoFocus
            />
            <small className="field-hint">{t('create.nicknameHint', { name: clash.label })}</small>
          </label>
        )}
      </div>
    </div>
  )
}
