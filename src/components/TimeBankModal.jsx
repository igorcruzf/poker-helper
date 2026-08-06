export default function TimeBankModal({ open, timeBank, onClose }) {
  if (!open) return null

  const { secondsLeft, running, done, duration, start, stop, dismiss } = timeBank

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <button className="close-x" onClick={onClose}>✕</button>
        <p className="question">Time bank</p>

        <div className="timer-display">{String(secondsLeft).padStart(2, '0')}</div>
        <div className="timer-blinds">{duration} segundos para decidir</div>

        {done ? (
          <div className="timer-confirm">
            <p className="modal-hint" style={{ textAlign: 'center' }}>⏰ Tempo esgotado!</p>
            <button className="timer-btn" onClick={dismiss}>Fechar</button>
          </div>
        ) : (
          <div className="timer-actions">
            <button className="timer-btn" onClick={start}>{running ? 'Reiniciar' : 'Iniciar'}</button>
            {running && <button className="timer-btn secondary" onClick={stop}>Parar</button>}
          </div>
        )}
      </div>
    </div>
  )
}
