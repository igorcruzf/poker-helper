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
