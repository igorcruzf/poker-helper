import { round2 } from './settlement.js'

// Recortes de tempo. Um saldo acumulado de dois anos esconde quem está ganhando
// agora — é a pergunta que a mesa faz depois de algumas temporadas.
export const PERIODS = ['all', 'year', 'quarter', 'month']

export function periodStart(period, now = Date.now()) {
  const d = new Date(now)
  switch (period) {
    case 'year':
      return new Date(d.getFullYear(), 0, 1).getTime()
    case 'quarter':
      return new Date(d.getFullYear(), d.getMonth() - 3, d.getDate()).getTime()
    case 'month':
      return new Date(d.getFullYear(), d.getMonth() - 1, d.getDate()).getTime()
    default:
      return null
  }
}

export function filterHistory(history, period, now = Date.now()) {
  const from = periodStart(period, now)
  if (from === null) return history
  return history.filter((night) => night.date >= from)
}

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

const sameName = (a, b) =>
  String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()

// Confronto direto: só as noites em que os dois sentaram na mesma mesa. Comparar
// o acumulado geral de duas pessoas não diz nada quando elas jogaram noites
// diferentes — aqui a base é a mesma para os dois.
export function computeHeadToHead(history, playerName) {
  const map = new Map()

  history.forEach((night) => {
    const me = night.players.find((p) => sameName(p.name, playerName))
    if (!me) return

    night.players.forEach((other) => {
      if (sameName(other.name, playerName)) return
      const key = other.name.trim().toLowerCase()
      const cur = map.get(key) || {
        name: other.name.trim(),
        nights: 0,
        ahead: 0,
        mySaldo: 0,
        theirSaldo: 0,
      }
      cur.nights += 1
      // Empate na noite não conta para nenhum dos dois lados.
      if (me.saldo - other.saldo > 0.005) cur.ahead += 1
      cur.mySaldo += me.saldo
      cur.theirSaldo += other.saldo
      map.set(key, cur)
    })
  })

  return [...map.values()]
    .map((h) => ({
      ...h,
      mySaldo: round2(h.mySaldo),
      theirSaldo: round2(h.theirSaldo),
      behind: h.nights - h.ahead,
    }))
    .sort((a, b) => b.nights - a.nights || a.name.localeCompare(b.name))
}

// Números do topo da tela e os destaques de noite.
export function computeOverview(history) {
  const stats = computePlayerStats(history)
  let best = null
  let worst = null
  // Recordes de um jogo só: um total de carreira não responde "quando foi".
  let mostCacifesGame = null
  let biggestGame = null
  let cacifes = 0
  let volume = 0

  history.forEach((game) => {
    let gameCacifes = 0
    game.players.forEach((p) => {
      cacifes += p.cacifes || 0
      gameCacifes += p.cacifes || 0
      volume += (p.cacifes || 0) * game.buyIn
      const entry = { name: p.name, saldo: p.saldo, date: game.date, cacifes: p.cacifes || 0 }
      if (!best || p.saldo > best.saldo) best = entry
      if (!worst || p.saldo < worst.saldo) worst = entry
      if (!mostCacifesGame || entry.cacifes > mostCacifesGame.cacifes) mostCacifesGame = entry
    })

    const entry = { date: game.date, cacifes: gameCacifes, players: game.players.length }
    if (!biggestGame || gameCacifes > biggestGame.cacifes) biggestGame = entry
  })

  const mostNights = [...stats].sort((a, b) => b.nights - a.nights)[0] || null

  return {
    tables: history.length,
    players: stats.length,
    cacifes,
    volume: round2(volume),
    best,
    worst,
    mostCacifesGame,
    biggestGame,
    mostNights,
  }
}
