import { fmt, fmtDate } from '../utils.js'

export default function HistoryModal({ open, history, onClose, onDelete, onClearAll }) {
  if (!open) return null

  const nights = [...history].sort((a, b) => b.date - a.date)

  return (
	<div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
	  <div className="modal modal-wide">
		<button className="close-x" onClick={onClose}>✕</button>
		<p className="question">Histórico de jogos</p>

		{nights.length === 0 ? (
		  <div className="empty-state">Nenhum jogo salvo ainda.<br />Use "Encerrar jogo" para guardar o resultado.</div>
		) : (
		  <div className="history-list">
			{nights.map((night) => {
			  const total = night.players.reduce((acc, p) => acc + p.saldo, 0)
			  return (
				<div className="history-item" key={night.id}>
				  <div className="history-head">
					<span className="history-date">{fmtDate(night.date)}</span>
					<span className="history-buyin">Cacife {fmt(night.buyIn)}</span>
					<button className="history-del" title="Apagar" onClick={() => onDelete(night.id)}>✕</button>
				  </div>
				  <div className="history-players">
					{night.players.map((p, i) => (
					  <div className="history-player" key={i}>
						<span className="hp-name">{p.name}</span>
						<span className={`hp-saldo ${p.saldo > 0.001 ? 'pos' : p.saldo < -0.001 ? 'neg' : 'zero'}`}>{fmt(p.saldo)}</span>
					  </div>
					))}
				  </div>
				  <div className="history-total">Total: {fmt(total)}</div>
				</div>
			  )
			})}
		  </div>
		)}

		{nights.length > 0 && (
		  <button className="reset-cancel-link" onClick={onClearAll}>Apagar todo o histórico</button>		)}
	  </div>
	</div>
  )
}
