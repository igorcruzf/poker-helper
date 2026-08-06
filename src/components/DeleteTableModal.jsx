import { fmtDate } from '../utils.js'

export default function DeleteTableModal({ table, onCancel, onConfirm }) {
  if (!table) return null

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal">
        <p className="question">
          Apagar a mesa de {fmtDate(table.finished_at || table.created_at)}?
        </p>
        <p className="modal-hint" style={{ textAlign: 'center' }}>
          O acerto e os saldos dessa noite somem do histórico. Não dá para desfazer.
        </p>
        <div className="modal-actions">
          <div className="round-action cancel" onClick={onCancel}>✕</div>
          <div className="round-action confirm" onClick={onConfirm}>✓</div>
        </div>
      </div>
    </div>
  )
}
