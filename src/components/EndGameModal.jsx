export default function EndGameModal({ open, onCancel, onConfirm }) {
  if (!open) return null

  return (
	<div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
	  <div className="modal">
		<p className="question">Encerrar jogo?</p>
		<p className="modal-hint" style={{ textAlign: 'center' }}>
		  O resultado atual será salvo no histórico e os cacifes serão zerados,
		  mantendo os jogadores.
		</p>
		<div className="modal-actions">
		  <div className="round-action cancel" onClick={onCancel}>✕</div>
		  <div className="round-action confirm" onClick={onConfirm}>✓</div>
		</div>
	  </div>
	</div>
  )
}
