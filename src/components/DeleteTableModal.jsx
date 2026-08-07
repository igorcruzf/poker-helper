import { fmtDate } from '../utils.js'
import { useI18n } from '../hooks/useI18n.js'

export default function DeleteTableModal({ table, onCancel, onConfirm }) {
  const { t } = useI18n()
  if (!table) return null

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal">
        <p className="question">
          {t('tables.deleteTitle', { date: fmtDate(table.finished_at || table.created_at) })}
        </p>
        <p className="modal-hint" style={{ textAlign: 'center' }}>
          {/* Apagar uma mesa ainda em andamento joga a noite fora inteira, não
              só o histórico — o aviso precisa dizer isso. */}
          {table.status === 'active' ? t('tables.deleteActiveHint') : t('tables.deleteHint')}
        </p>
        <div className="modal-actions">
          <div className="round-action cancel" onClick={onCancel}>✕</div>
          <div className="round-action confirm" onClick={onConfirm}>✓</div>
        </div>
      </div>
    </div>
  )
}
