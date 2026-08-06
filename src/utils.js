import { getLocale } from './lib/i18n.js'

const DATE_LOCALES = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' }

function dateLocale() {
  return DATE_LOCALES[getLocale()] || 'pt-BR'
}

// A moeda acompanha o idioma do host. Formatado na mão em vez de Intl para o
// resultado ser previsível (Intl usa espaço não-quebrável entre símbolo e valor).
const CURRENCY = {
  pt: { symbol: 'R$', after: false, space: true, decimal: ',', group: '.' },
  en: { symbol: '$', after: false, space: false, decimal: '.', group: ',' },
  es: { symbol: '€', after: true, space: true, decimal: ',', group: '.' },
}

export function currency() {
  return CURRENCY[getLocale()] || CURRENCY.pt
}

export function fmt(n) {
  const c = currency()
  const v = Number(n) || 0
  const sign = v < 0 ? '-' : ''
  const [whole, cents] = Math.abs(v).toFixed(2).split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, c.group)
  const number = sign + grouped + c.decimal + cents
  const gap = c.space ? ' ' : ''
  return c.after ? number + gap + c.symbol : c.symbol + gap + number
}

export function saldoClass(n) {
  if (n > 0.001) return 'pos'
  if (n < -0.001) return 'neg'
  return 'zero'
}

// O primeiro cacife custa o valor de entrada; os seguintes custam o rebuy, que
// pode ser diferente. Sem rebuy definido, todos valem o mesmo.
export function cacifesCost(cacifes, buyIn, rebuy) {
  const count = Number(cacifes) || 0
  if (count <= 0) return 0
  const extra = rebuy === null || rebuy === undefined ? buyIn : rebuy
  return buyIn + (count - 1) * extra
}

// Derived balance: manual cash-out adjustments minus what's owed for buy-ins taken
export function computeSaldo(player, buyIn, rebuy) {
  return (player.adjustment || 0) - cacifesCost(player.cacifes, buyIn, rebuy)
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

// Formato de data segue o idioma; o dinheiro nao, porque a mesa e em reais
// independente da lingua de quem olha.
export function fmtDate(ts) {
  try {
    return new Date(ts).toLocaleDateString(dateLocale(), {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  } catch {
    return ''
  }
}

// Fisher-Yates. Usado para sortear a ordem dos lugares na criação da mesa.
export function shuffle(list) {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}
