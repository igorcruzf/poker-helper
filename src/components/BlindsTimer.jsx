import { parseMoney } from '../utils.js'
import { useI18n } from '../hooks/useI18n.js'
import AlertToggles from './AlertToggles.jsx'

export default function BlindsTimerModal({ open, timer, onClose }) {
  const { t } = useI18n()
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
		<p className="question">{t('timer.title')}</p>

		<div className="timer-display">{mm}:{ss}</div>
		<div className="timer-blinds">
		  {t('timer.levelInfo', { level: level + 1, small: smallBlind, big: bigBlind })}
		</div>

		{awaitingConfirm ? (
		  <div className="timer-confirm">
			<p className="modal-hint" style={{ textAlign: 'center' }}>
			  {t('timer.timeUp', { small: nextSmall, big: nextSmall * 2 })}
			</p>
			<button className="timer-btn" onClick={confirmNext}>{t('timer.nextLevel')}</button>
		  </div>
		) : (
		  <>
			<div className="modal-field">
			  <label>{t('timer.baseBlind')}</label>
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
			  <label>{t('timer.minutes')}</label>
			  <input
				type="number"
				min="1"
				max="120"
				inputMode="numeric"
				value={minutes}
				onChange={(e) => setMinutes(Math.max(1, Math.min(120, parseInt(e.target.value, 10) || 1)))}
			  />
			</div>

			<p className="modal-hint">{t('timer.hint')}</p>

			<AlertToggles />

			<div className="timer-actions">
			  <button className="timer-btn" onClick={running ? pause : start}>
				{running ? t('timer.pause') : active ? t('timer.resume') : t('timer.start')}
			  </button>
			  <button className="timer-btn secondary" onClick={reset}>{t('timer.reset')}</button>
			</div>
		  </>
		)}
	  </div>
	</div>
  )
}
