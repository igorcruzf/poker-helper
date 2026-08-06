import { computeSaldo } from '../utils.js'

export const EPS = 0.005

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

// Escolhe quem centraliza o dinheiro: por padrão o maior saldo da mesa
// (quem tem mais a receber), ou um jogador fixo definido na criação.
export function pickCollector(balances, mode, fixedId) {
  if (balances.length === 0) return null
  if (mode === 'fixed_player' && fixedId) {
    const fixed = balances.find((b) => b.id === fixedId)
    if (fixed) return fixed
  }
  return balances.reduce((best, b) => (b.saldo > best.saldo ? b : best), balances[0])
}

export function toBalances(players, buyIn, rebuy) {
  return players.map((p) => ({
    id: p.id,
    name: p.name,
    cacifes: p.cacifes,
    saldo: round2(computeSaldo(p, buyIn, rebuy)),
  }))
}

// Fecha a conta antes de montar o acerto, quando a soma dos saldos não dá zero:
//   'even'   divide a diferença por igual entre todos
//   'top'    desconta do maior saldo (rateado se houver empate)
//   'ignore' deixa como está, e a sobra cai em quem centraliza
export function balancePlayers(players, buyIn, mode, rebuy) {
  const base = toBalances(players, buyIn, rebuy)
  const total = round2(base.reduce((acc, b) => acc + b.saldo, 0))
  if (base.length === 0 || !mode || mode === 'ignore' || Math.abs(total) <= EPS) return base

  if (mode === 'even') {
    const share = total / base.length
    return base.map((b) => ({ ...b, saldo: round2(b.saldo - share) }))
  }

  const max = Math.max(...base.map((b) => b.saldo))
  const tops = base.filter((b) => Math.abs(b.saldo - max) < EPS)
  const share = total / tops.length
  return base.map((b) =>
    Math.abs(b.saldo - max) < EPS ? { ...b, saldo: round2(b.saldo - share) } : b
  )
}

// Acerto em estrela: todo mundo que perdeu paga o centralizador, e ele repassa
// para quem ganhou. Sempre gera no máximo (n-1) transferências.
export function buildSettlement(players, buyIn, options = {}) {
  const balances = balancePlayers(players, buyIn, options.balanceMode, options.rebuy)
  return settlementFromBalances(balances, options)
}

export function settlementFromBalances(balances, options = {}) {
  const collector = pickCollector(balances, options.mode, options.playerId)
  if (!collector) return { collectorId: null, transfers: [], imbalance: 0, balances }

  const transfers = []
  balances.forEach((b) => {
    if (b.id === collector.id) return
    if (b.saldo < -EPS) {
      transfers.push({ fromId: b.id, toId: collector.id, amount: round2(-b.saldo) })
    } else if (b.saldo > EPS) {
      transfers.push({ fromId: collector.id, toId: b.id, amount: round2(b.saldo) })
    }
  })

  // Se a soma dos saldos não fecha em zero, a sobra/falta cai no centralizador.
  const imbalance = round2(balances.reduce((acc, b) => acc + b.saldo, 0))

  return { collectorId: collector.id, transfers, imbalance, balances }
}

export function settlementProgress(settlements) {
  const total = settlements.length
  const paid = settlements.filter((s) => s.paid).length
  const pendingAmount = settlements
    .filter((s) => !s.paid)
    .reduce((acc, s) => acc + Number(s.amount), 0)
  return { total, paid, pending: total - paid, pendingAmount: round2(pendingAmount) }
}
