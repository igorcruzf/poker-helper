import { useI18n } from '../hooks/useI18n.js'

export default function DeleteRosterPlayerModal({ player, onCancel, onConfirm }) {
  const { t } = useI18n()
  if (!player) return null

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal">
        <p className="question">{t('create.deleteRoster', { name: player.label || player.name })}</p>
        <p className="modal-hint" style={{ textAlign: 'center' }}>
          {t('create.deleteRosterHint')}
        </p>
        <div className="modal-actions">
          <div className="round-action cancel" onClick={onCancel}>✕</div>
          <div className="round-action confirm" onClick={onConfirm}>✓</div>
        </div>
      </div>
    </div>
  )
}
