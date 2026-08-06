import { fmt } from '../utils.js'

function computeStats(history) {
  const map = new Map()
  history.forEach((night) => {
	night.players.forEach((p) => {
	  const key = p.name.trim().toLowerCase() || '(sem nome)'
	  const cur = map.get(key) || {
		name: p.name.trim() || '(sem nome)',
		nights: 0,
		totalSaldo: 0,
		biggestWin: -Infinity,
		biggestLoss: Infinity,
		cacifes: 0,
	  }
	  cur.nights += 1
	  cur.totalSaldo += p.saldo
	  cur.biggestWin = Math.max(cur.biggestWin, p.saldo)
	  cur.biggestLoss = Math.min(cur.biggestLoss, p.saldo)
	  cur.cacifes += p.cacifes || 0
	  map.set(key, cur)
	})
  })
  return [...map.values()].sort((a, b) => b.totalSaldo - a.totalSaldo)
}

export default function StatsModal({ open, history, onClose }) {
  if (!open) return null

  const stats = computeStats(history)

  return (
	<div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
	  <div className="modal modal-wide">
		<button className="close-x" onClick={onClose}>✕</button>
		<p className="question">Estatísticas</p>

		{stats.length === 0 ? (
		  <div className="empty-state">Sem dados ainda.<br />Encerre alguns jogos para gerar estatísticas.</div>
		) : (
		  <div className="stats-list">
			<div className="stats-row stats-head">
			  <span>Jogador</span>
			  <span>Jogos</span>
			  <span>Saldo total</span>
			</div>
			{stats.map((s, i) => (
			  <div className="stats-row" key={i}>
				<span className="stats-name">
				  {i === 0 && '👑 '}{s.name}
				  <small>Maior ganho {fmt(s.biggestWin)} · maior perda {fmt(s.biggestLoss)}</small>
				</span>
				<span>{s.nights}</span>
				<span className={s.totalSaldo > 0.001 ? 'pos' : s.totalSaldo < -0.001 ? 'neg' : 'zero'}>{fmt(s.totalSaldo)}</span>
			  </div>
			))}
		  </div>
		)}
	  </div>
	</div>
  )
}
