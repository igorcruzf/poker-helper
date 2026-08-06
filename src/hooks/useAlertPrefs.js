import { useEffect, useState } from 'react'
import { onAlertPrefsChange, readAlertPrefs, writeAlertPrefs } from '../lib/alerts.js'

// Som dos alertas de timer/time bank, compartilhado pelos dois.
export function useAlertPrefs() {
  const [prefs, setPrefs] = useState(readAlertPrefs)

  useEffect(() => onAlertPrefsChange(setPrefs), [])

  return {
    sound: prefs.sound,
    setSound: (value) => writeAlertPrefs({ sound: value }),
  }
}
