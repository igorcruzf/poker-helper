import { useEffect, useState } from 'react'
import { useI18n } from '../hooks/useI18n.js'

// Trocar de nome pode esbarrar num homônimo em um grupo e não em outro. Aqui a
// pessoa resolve grupo a grupo, e só então a troca é aplicada — em todos de uma
// vez, para não deixar metade dos grupos com o nome antigo.
export default function NicknameConflictModal({ open, name, conflicts, busy, onCancel, onConfirm }) {
  const { t } = useI18n()
  const [nicknames, setNicknames] = useState({})

  useEffect(() => {
    if (open) setNicknames({})
  }, [open, conflicts])

  if (!open) return null

  const missing = conflicts.some((c) => !String(nicknames[c.group_id] || '').trim())

  return (
    <div className="overlay">
      <div className="modal">
        <p className="question">{t('profile.nicknameNeeded')}</p>
        <p className="modal-hint">{t('profile.nicknameNeededHint', { name })}</p>

        {conflicts.map((c) => (
          <label className="auth-field" key={c.group_id}>
            <span>{c.group_name}</span>
            <input
              value={nicknames[c.group_id] || ''}
              onChange={(e) =>
                setNicknames((prev) => ({ ...prev, [c.group_id]: e.target.value }))
              }
              placeholder={t('create.nicknamePlaceholder')}
            />
            <small className="field-hint">
              {t('profile.nicknameNeededField', { name, group: c.group_name })}
            </small>
          </label>
        ))}

        <div className="modal-actions">
          <div className="round-action cancel" onClick={onCancel}>✕</div>
          <div
            className={`round-action confirm${missing || busy ? ' disabled' : ''}`}
            onClick={() => !missing && !busy && onConfirm(nicknames)}
          >✓</div>
        </div>
      </div>
    </div>
  )
}
