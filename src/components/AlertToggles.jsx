import { useAlertPrefs } from '../hooks/useAlertPrefs.js'

// Som e vibração dos avisos, iguais no timer e no time bank.
export default function AlertToggles() {
  const { sound, vibrate, canVibrate, setSound, setVibrate } = useAlertPrefs()

  return (
    <div className="alert-toggles">
      <label className="alert-toggle">
        <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} />
        <span>🔊 Som</span>
      </label>
      {canVibrate && (
        <label className="alert-toggle">
          <input type="checkbox" checked={vibrate} onChange={(e) => setVibrate(e.target.checked)} />
          <span>📳 Vibrar</span>
        </label>
      )}
    </div>
  )
}
