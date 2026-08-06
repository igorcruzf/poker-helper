import { fmt } from '../utils.js'
import { balancePlayers, settlementFromBalances } from './settlement.js'

// Texto que vai para o grupo. No meio do jogo sai só a parte de saldos; ao
// encerrar, sai também quem paga quem.
export function buildSummaryText(players, buyIn, options = {}) {
  const balances = balancePlayers(players, buyIn, options.balanceMode)
  const lines = [`Cacifes — ${fmt(buyIn)} por cacife`, '']

  if (balances.length === 0) {
    lines.push('(sem jogadores)')
    return lines.join('\n')
  }

  balances.forEach((b) => {
    lines.push(`${b.name}: ${fmt(b.saldo)}  (${b.cacifes}x cacife)`)
  })

  if (options.withSettlement) {
    const { transfers } = settlementFromBalances(balances, {
      mode: options.settlementMode,
      playerId: options.collectorId,
    })
    if (transfers.length > 0) {
      const nameOf = (id) => balances.find((b) => b.id === id)?.name || '—'
      lines.push('', 'Acerto:')
      transfers.forEach((t) => {
        lines.push(`${nameOf(t.fromId)} paga ${fmt(t.amount)} para ${nameOf(t.toId)}`)
      })
    } else {
      lines.push('', 'Ninguém deve nada a ninguém.')
    }
  }

  if (options.shareUrl) {
    lines.push('', `Acompanhe o acerto: ${options.shareUrl}`)
  }

  return lines.join('\n')
}

export function shareUrlFor(shareToken) {
  if (!shareToken) return ''
  return `${window.location.origin}/acerto/${shareToken}`
}

export function liveUrlFor(shareToken) {
  if (!shareToken) return ''
  return `${window.location.origin}/ao-vivo/${shareToken}`
}

// Copia sem quebrar em navegador que bloqueia a Clipboard API.
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = text
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(area)
      return ok
    } catch {
      return false
    }
  }
}
