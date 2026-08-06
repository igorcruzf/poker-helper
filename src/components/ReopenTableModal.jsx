export default function ReopenTableModal({ open, hasPayments, onCancel, onConfirm }) {
  if (!open) return null

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal">
        <p className="question">Reabrir a mesa?</p>
        <p className="modal-hint" style={{ textAlign: 'center' }}>
          Ela volta a aceitar cacifes e ajustes. O acerto atual é descartado
          {hasPayments && <strong> — inclusive as marcações de quem já pagou</strong>} e
          um novo é gerado quando você encerrar de novo. Os saldos continuam
          como estão.
        </p>
        <div className="modal-actions">
          <div className="round-action cancel" onClick={onCancel}>✕</div>
          <div className="round-action confirm" onClick={onConfirm}>✓</div>
        </div>
      </div>
    </div>
  )
}
