export default function DeleteRosterPlayerModal({ player, onCancel, onConfirm }) {
  if (!player) return null

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal">
        <p className="question">Excluir {player.name} do elenco?</p>
        <p className="modal-hint" style={{ textAlign: 'center' }}>
          Some da lista de jogadores das próximas mesas. As mesas antigas ficam
          intactas — nome, cacifes e saldos continuam no histórico.
        </p>
        <div className="modal-actions">
          <div className="round-action cancel" onClick={onCancel}>✕</div>
          <div className="round-action confirm" onClick={onConfirm}>✓</div>
        </div>
      </div>
    </div>
  )
}
