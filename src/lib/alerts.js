import { playBeep } from '../utils.js'

const KEY = 'poker-alert-prefs-v1'
const DEFAULTS = { sound: true }

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
  if (readAlertPrefs().sound) playBeep(options.beep)
}
