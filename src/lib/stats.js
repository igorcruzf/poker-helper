import { round2 } from './settlement.js'

// Agrega o histórico de mesas encerradas por jogador. O nome é a chave (o
// elenco pode ter mudado desde a noite jogada; o snapshot em table_players é
// que vale).
export function computePlayerStats(history) {
  const map = new Map()

  history.forEach((night) => {
    night.players.forEach((p) => {
      const label = p.name.trim() || '(sem nome)'
      const key = label.toLowerCase()
      const cur = map.get(key) || {
        name: label,
        nights: 0,
        wins: 0,
        totalSaldo: 0,
        cacifes: 0,
        biggestWin: 0,
        biggestLoss: 0,
      }
      cur.nights += 1
      if (p.saldo > 0.005) cur.wins += 1
      cur.totalSaldo += p.saldo
      cur.cacifes += p.cacifes || 0
      cur.biggestWin = Math.max(cur.biggestWin, p.saldo)
      cur.biggestLoss = Math.min(cur.biggestLoss, p.saldo)
      map.set(key, cur)
    })
  })

  return [...map.values()]
    .map((s) => ({
      ...s,
      totalSaldo: round2(s.totalSaldo),
      avgSaldo: round2(s.totalSaldo / s.nights),
      winRate: Math.round((s.wins / s.nights) * 100),
    }))
    .sort((a, b) => b.totalSaldo - a.totalSaldo)
}

// Números do topo da tela e os destaques de noite.
export function computeOverview(history) {
  const stats = computePlayerStats(history)
  let best = null
  let worst = null
  let cacifes = 0
  let volume = 0

  history.forEach((night) => {
    night.players.forEach((p) => {
      cacifes += p.cacifes || 0
      volume += (p.cacifes || 0) * night.buyIn
      const entry = { name: p.name, saldo: p.saldo, date: night.date }
      if (!best || p.saldo > best.saldo) best = entry
      if (!worst || p.saldo < worst.saldo) worst = entry
    })
  })

  const mostCacifes = [...stats].sort((a, b) => b.cacifes - a.cacifes)[0] || null
  const mostNights = [...stats].sort((a, b) => b.nights - a.nights)[0] || null

  return {
    tables: history.length,
    players: stats.length,
    cacifes,
    volume: round2(volume),
    best,
    worst,
    mostCacifes,
    mostNights,
  }
}
