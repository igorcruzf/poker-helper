import { useAlertPrefs } from '../hooks/useAlertPrefs.js'
import { useI18n } from '../hooks/useI18n.js'
import { fireAlert } from '../lib/alerts.js'

// Som dos avisos, igual no timer e no time bank.
export default function AlertToggles() {
  const { sound, setSound } = useAlertPrefs()
  const { t } = useI18n()

  return (
    <div className="alert-toggles">
      <label className="alert-toggle">
        <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} />
        <span>{t('timer.sound')}</span>
      </label>
      <button className="alert-toggle alert-test" onClick={() => fireAlert()}>
        {t('timer.test')}
      </button>
    </div>
  )
}
