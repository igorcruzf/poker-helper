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

export function fmtDate(ts) {
  try {
    return new Date(ts).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  } catch {
    return ''
  }
}
