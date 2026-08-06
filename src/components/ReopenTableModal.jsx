import { useI18n } from '../hooks/useI18n.js'

export default function ReopenTableModal({ open, hasPayments, onCancel, onConfirm }) {
  const { t } = useI18n()
  if (!open) return null

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal">
        <p className="question">{t('settle.reopenTitle')}</p>
        <p className="modal-hint" style={{ textAlign: 'center' }}>
          {t('settle.reopenHint')}
          {hasPayments && <strong>{t('settle.reopenHintPaid')}</strong>}
          {t('settle.reopenHintEnd')}
        </p>
        <div className="modal-actions">
          <div className="round-action cancel" onClick={onCancel}>✕</div>
          <div className="round-action confirm" onClick={onConfirm}>✓</div>
        </div>
      </div>
    </div>
  )
}
