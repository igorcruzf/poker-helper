import { useEffect, useState } from 'react'
import { useI18n } from '../hooks/useI18n.js'

export default function EditRosterPlayerModal({ player, busy, error, onCancel, onConfirm }) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')

  useEffect(() => {
    if (!player) return
    setName(player.name || '')
    setNickname(player.nickname || '')
  }, [player])

  if (!player) return null

  const disabled = !name.trim() || busy

  return (
    <div className="overlay">
      <div className="modal">
        <p className="question">{t('create.editRoster', { name: player.label })}</p>

        <label className="auth-field">
          <span>{t('create.rosterName')}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>

        <label className="auth-field">
          <span>{t('create.nicknameLabel')}</span>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={t('create.nicknamePlaceholder')}
          />
        </label>

        <p className="modal-hint">{t('create.editRosterHint')}</p>

        {error && <div className="auth-error">{error}</div>}

        <div className="modal-actions">
          <div className="round-action cancel" onClick={onCancel}>✕</div>
          <div
            className={`round-action confirm${disabled ? ' disabled' : ''}`}
            onClick={() => !disabled && onConfirm({ name: name.trim(), nickname: nickname.trim() })}
          >✓</div>
        </div>
      </div>
    </div>
  )
}
