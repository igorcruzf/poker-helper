import AlertToggles from './AlertToggles.jsx'
import { useI18n } from '../hooks/useI18n.js'

export default function TimeBankModal({ open, timeBank, onClose }) {
  const { t } = useI18n()
  if (!open) return null

  const { secondsLeft, running, done, duration, start, stop, dismiss } = timeBank

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <button className="close-x" onClick={onClose}>✕</button>
        <p className="question">{t('timeBank.title')}</p>

        <div className="timer-display">{String(secondsLeft).padStart(2, '0')}</div>
        <div className="timer-blinds">{t('timeBank.seconds', { count: duration })}</div>

        {done ? (
          <div className="timer-confirm">
            <p className="modal-hint" style={{ textAlign: 'center' }}>{t('timeBank.timeUp')}</p>
            <div className="timer-actions">
              <button className="timer-btn" onClick={start}>{t('timeBank.restart')}</button>
              <button className="timer-btn secondary" onClick={dismiss}>{t('timeBank.close')}</button>
            </div>
          </div>
        ) : (
          <>
            <AlertToggles />
            <div className="timer-actions">
              <button className="timer-btn" onClick={start}>{running ? t('timeBank.restart') : t('timeBank.start')}</button>
              {running && <button className="timer-btn secondary" onClick={stop}>{t('timeBank.stop')}</button>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
