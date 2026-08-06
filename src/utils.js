export function fmt(n) {
  const v = Number(n) || 0
  const sign = v < 0 ? '-' : ''
  return 'R$ ' + sign + Math.abs(v).toFixed(2).replace('.', ',')
}

export function saldoClass(n) {
  if (n > 0.001) return 'pos'
  if (n < -0.001) return 'neg'
  return 'zero'
}

// Derived balance: manual cash-out adjustments minus what's owed for buy-ins taken
export function computeSaldo(player, buyIn) {
  return (player.adjustment || 0) - player.cacifes * buyIn
}

export function parseMoney(raw, options) {
  const min = options && options.min !== undefined ? options.min : -Infinity
  const fallback = options && options.fallback !== undefined ? options.fallback : 0
  if (raw === '' || raw === null || raw === undefined) return fallback
  const v = parseFloat(String(raw).replace(',', '.'))
  if (isNaN(v)) return fallback
  return Math.max(min, v)
}

// Louder, more piercing alert tone than a plain sine beep — square wave
// carries much further from phone speakers at a poker table.
export function playBeep({ frequency = 660, duration = 0.5, volume = 0.9, type = 'square' } = {}) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
    osc.start()
    osc.stop(ctx.currentTime + duration + 0.05)
    setTimeout(() => ctx.close(), (duration + 0.15) * 1000)
  } catch {
    /* ignore */
  }
}

export function fmtDate(ts) {
  try {
    return new Date(ts).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  } catch {
    return ''
  }
}
