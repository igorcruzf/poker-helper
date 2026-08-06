import { playBeep } from '../utils.js'

const KEY = 'poker-alert-prefs-v1'
const DEFAULTS = { sound: true, vibrate: true }

// Vibração existe em Android/Chrome; iOS não expõe a API. Sem isso o toggle
// não aparece, em vez de oferecer algo que nunca vai acontecer.
export const canVibrate =
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

const listeners = new Set()

export function readAlertPrefs() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

export function writeAlertPrefs(patch) {
  const next = { ...readAlertPrefs(), ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch (e) {
    console.error('Não foi possível salvar as preferências de alerta', e)
  }
  listeners.forEach((fn) => fn(next))
  return next
}

export function onAlertPrefsChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// Lê a preferência na hora de tocar, não na montagem do hook: assim mudar o
// toggle com o timer rodando vale já no próximo aviso.
export function fireAlert(options = {}) {
  const prefs = readAlertPrefs()
  if (prefs.sound) playBeep(options.beep)
  if (prefs.vibrate && canVibrate) {
    try {
      navigator.vibrate(options.pattern || [180, 90, 180])
    } catch {
      /* ignore */
    }
  }
}

export function stopAlertFeedback() {
  if (canVibrate) {
    try {
      navigator.vibrate(0)
    } catch {
      /* ignore */
    }
  }
}
