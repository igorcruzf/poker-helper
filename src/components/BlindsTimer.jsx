import { parseMoney } from '../utils.js'

export default function BlindsTimerModal({ open, timer, onClose }) {
  if (!open) return null

  const {
	minutes, setMinutes,
	baseBlind, setBaseBlind,
	level, secondsLeft, running, awaitingConfirm, active,
	smallBlind, bigBlind, nextSmall,
	start, pause, reset, confirmNext,
  } = timer

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  return (
	<div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
	  <div className="modal">
		<button className="close-x" onClick={onClose}>✕</button>
		<p className="question">Timer de blinds</p>

		<div className="timer-display">{mm}:{ss}</div>
		<div className="timer-blinds">
		  Nível {level + 1} · Blinds {smallBlind} / {bigBlind}
		</div>

		{awaitingConfirm ? (
		  <div className="timer-confirm">
			<p className="modal-hint" style={{ textAlign: 'center' }}>
			  ⏰ Tempo esgotado! Próximo nível: {nextSmall} / {nextSmall * 2}
			</p>
			<button className="timer-btn" onClick={confirmNext}>Ir para o próximo nível</button>
		  </div>
		) : (
		  <>
			<div className="modal-field">
			  <label>Blind inicial (small)</label>
			  <input
				type="number"
				min="0"
				step="0.5"
				inputMode="decimal"
				value={baseBlind}
				disabled={active}
				onChange={(e) => setBaseBlind(parseMoney(e.target.value, { min: 0, fallback: 0 }))}
			  />
			</div>

			<div className="modal-field">
			  <label>Minutos por nível</label>
			  <input
				type="number"
				min="1"
				max="120"
				inputMode="numeric"
				value={minutes}
				onChange={(e) => setMinutes(Math.max(1, Math.min(120, parseInt(e.target.value, 10) || 1)))}
			  />
			</div>

			<p className="modal-hint">
			  O big blind é o dobro do small, e cada nível dobra o valor do anterior.
			</p>

			<div className="timer-actions">
			  <button className="timer-btn" onClick={running ? pause : start}>
				{running ? 'Pausar' : active ? 'Continuar' : 'Iniciar'}
			  </button>
			  <button className="timer-btn secondary" onClick={reset}>Zerar</button>
			</div>
		  </>
		)}
	  </div>
	</div>
  )
}
