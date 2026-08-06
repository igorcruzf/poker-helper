import { useState } from 'react'
import { useAlertPrefs } from '../hooks/useAlertPrefs.js'
import { useI18n } from '../hooks/useI18n.js'
import { fireAlert, vibrate } from '../lib/alerts.js'

// Som e vibração dos avisos, iguais no timer e no time bank.
export default function AlertToggles() {
  const { sound, vibrate: vibrateOn, canVibrate, setSound, setVibrate } = useAlertPrefs()
  const { t } = useI18n()
  const [result, setResult] = useState(null)

  function handleTest() {
    // O clique é a interação que o navegador exige para deixar vibrar.
    const buzzed = vibrateOn ? vibrate() : false
    fireAlert()
    setResult(!vibrateOn || buzzed ? 'ok' : 'blocked')
    setTimeout(() => setResult(null), 4000)
  }

  return (
    <>
      <div className="alert-toggles">
        <label className="alert-toggle">
          <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} />
          <span>{t('timer.sound')}</span>
        </label>
        {canVibrate && (
          <label className="alert-toggle">
            <input type="checkbox" checked={vibrateOn} onChange={(e) => setVibrate(e.target.checked)} />
            <span>{t('timer.vibrate')}</span>
          </label>
        )}
        <button className="alert-toggle alert-test" onClick={handleTest}>
          {t('timer.test')}
        </button>
      </div>

      {!canVibrate && <p className="alert-note">{t('timer.noVibration')}</p>}
      {result === 'blocked' && <p className="alert-note">{t('timer.vibrationBlocked')}</p>}
      {canVibrate && vibrateOn && <p className="alert-note">{t('timer.vibrationBackground')}</p>}
    </>
  )
}
