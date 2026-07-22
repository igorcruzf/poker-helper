export default function DeleteModal({ player, onCancel, onConfirm }) {
  if (!player) return null

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal">
        <p className="question">Tem certeza que quer excluir o {player.name}?</p>
        <div className="modal-actions">
          <div className="round-action cancel" onClick={onCancel}>✕</div>
          <div className="round-action confirm" onClick={() => onConfirm(player)}>✓</div>
        </div>
      </div>
    </div>
  )
}
