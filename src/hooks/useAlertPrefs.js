import { useEffect, useState } from 'react'
import { canVibrate, onAlertPrefsChange, readAlertPrefs, writeAlertPrefs } from '../lib/alerts.js'

// Som e vibração dos alertas de timer/time bank, compartilhados pelos dois.
export function useAlertPrefs() {
  const [prefs, setPrefs] = useState(readAlertPrefs)

  useEffect(() => onAlertPrefsChange(setPrefs), [])

  return {
    sound: prefs.sound,
    vibrate: prefs.vibrate,
    canVibrate,
    setSound: (value) => writeAlertPrefs({ sound: value }),
    setVibrate: (value) => writeAlertPrefs({ vibrate: value }),
  }
}
