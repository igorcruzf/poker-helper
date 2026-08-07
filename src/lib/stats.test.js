import { describe, it, expect } from 'vitest'
import {
  computeHeadToHead, computeOverview, computePlayerStats, filterHistory, periodStart,
} from './stats.js'

const night = (date, buyIn, players) => ({ id: String(date), date, buyIn, players })
const p = (name, cacifes, saldo) => ({ name, cacifes, saldo })

const history = [
  night(1, 5, [p('André', 1, 20), p('Ícaro', 3, -15), p('Filipe', 2, -5)]),
  night(2, 10, [p('André', 2, -20), p('Ícaro', 1, 30), p('Filipe', 1, -10)]),
]

describe('computePlayerStats', () => {
  it('ordena pelo saldo acumulado', () => {
    const stats = computePlayerStats(history)
    expect(stats.map((s) => s.name)).toEqual(['Ícaro', 'André', 'Filipe'])
  })

  it('soma noites, cacifes e saldo por jogador', () => {
    const icaro = computePlayerStats(history).find((s) => s.name === 'Ícaro')
    expect(icaro.nights).toBe(2)
    expect(icaro.cacifes).toBe(4)
    expect(icaro.totalSaldo).toBe(15)
    expect(icaro.avgSaldo).toBe(7.5)
  })

  it('guarda a maior noite e o maior tombo de cada um', () => {
    const andre = computePlayerStats(history).find((s) => s.name === 'André')
    expect(andre.biggestWin).toBe(20)
    expect(andre.biggestLoss).toBe(-20)
  })

  it('calcula em quantas noites a pessoa saiu no lucro', () => {
    const stats = computePlayerStats(history)
    expect(stats.find((s) => s.name === 'Ícaro').winRate).toBe(50)
    expect(stats.find((s) => s.name === 'Filipe').winRate).toBe(0)
  })

  it('junta o mesmo nome escrito com caixa diferente', () => {
    const stats = computePlayerStats([night(1, 5, [p('igor', 1, 10)]), night(2, 5, [p('Igor', 1, 5)])])
    expect(stats).toHaveLength(1)
    expect(stats[0].nights).toBe(2)
  })

  it('não quebra sem histórico', () => {
    expect(computePlayerStats([])).toEqual([])
  })
})

describe('computeOverview', () => {
  it('resume mesas, cacifes e o dinheiro que rodou', () => {
    const o = computeOverview(history)
    expect(o.tables).toBe(2)
    expect(o.players).toBe(3)
    expect(o.cacifes).toBe(10)
    // noite 1: 6 cacifes x R$5 = 30 · noite 2: 4 x R$10 = 40
    expect(o.volume).toBe(70)
  })

  it('acha a maior noite e o maior tombo da mesa toda', () => {
    const o = computeOverview(history)
    expect(o.best).toMatchObject({ name: 'Ícaro', saldo: 30 })
    expect(o.worst).toMatchObject({ name: 'André', saldo: -20 })
  })

  it('acha quem mais apareceu', () => {
    expect(computeOverview(history).mostNights.nights).toBe(2)
  })

  it('os recordes de um jogo só trazem a data', () => {
    const o = computeOverview(history)
    // Ícaro tomou 3 cacifes na noite 1 — é o recorde individual.
    expect(o.mostCacifesGame).toMatchObject({ name: 'Ícaro', cacifes: 3, date: 1 })
    // O jogo 1 teve 6 cacifes no total contra 4 do jogo 2.
    expect(o.biggestGame).toMatchObject({ cacifes: 6, players: 3, date: 1 })
  })

  it('não quebra sem histórico', () => {
    const o = computeOverview([])
    expect(o).toMatchObject({
      tables: 0, players: 0, cacifes: 0,
      best: null, worst: null, mostCacifesGame: null, biggestGame: null,
    })
  })
})

describe('filterHistory', () => {
  // 15/06/2026 como "hoje" para os recortes serem previsíveis.
  const now = new Date(2026, 5, 15).getTime()
  const dated = [
    night(new Date(2024, 0, 10).getTime(), 5, [p('André', 1, 10)]),
    night(new Date(2026, 0, 10).getTime(), 5, [p('André', 1, 10)]),
    night(new Date(2026, 4, 20).getTime(), 5, [p('André', 1, 10)]),
    night(new Date(2026, 5, 1).getTime(), 5, [p('André', 1, 10)]),
  ]

  it('sem período devolve tudo', () => {
    expect(filterHistory(dated, 'all', now)).toHaveLength(4)
  })

  it('este ano corta o que é de anos anteriores', () => {
    expect(filterHistory(dated, 'year', now)).toHaveLength(3)
  })

  it('três meses e um mês vão apertando a janela', () => {
    // 3 meses = a partir de 15/03; 1 mês = a partir de 15/05, que ainda pega
    // a noite do dia 20/05.
    expect(filterHistory(dated, 'quarter', now)).toHaveLength(2)
    expect(filterHistory(dated, 'month', now)).toHaveLength(2)
    expect(filterHistory(dated, 'month', new Date(2026, 5, 25).getTime())).toHaveLength(1)
  })

  it('periodStart devolve nulo para "sempre"', () => {
    expect(periodStart('all', now)).toBe(null)
  })
})

describe('computeHeadToHead', () => {
  it('conta só as noites em que os dois jogaram juntos', () => {
    const extra = [
      ...history,
      night(3, 5, [p('André', 1, 5), p('Novato', 1, -5)]),
    ]
    const h2h = computeHeadToHead(extra, 'André')
    expect(h2h.find((x) => x.name === 'Ícaro').nights).toBe(2)
    expect(h2h.find((x) => x.name === 'Novato').nights).toBe(1)
  })

  it('soma o saldo dos dois lados na mesma base de noites', () => {
    const vsIcaro = computeHeadToHead(history, 'André').find((x) => x.name === 'Ícaro')
    // André: +20 e -20. Ícaro: -15 e +30.
    expect(vsIcaro.mySaldo).toBe(0)
    expect(vsIcaro.theirSaldo).toBe(15)
    expect(vsIcaro.ahead).toBe(1)
    expect(vsIcaro.behind).toBe(1)
  })

  it('empate na noite não conta para nenhum lado', () => {
    const tied = [night(1, 5, [p('André', 1, 10), p('Bia', 1, 10)])]
    const vsBia = computeHeadToHead(tied, 'André')[0]
    expect(vsBia.nights).toBe(1)
    expect(vsBia.ahead).toBe(0)
  })

  it('devolve lista vazia para quem não está no histórico', () => {
    expect(computeHeadToHead(history, 'Ninguém')).toEqual([])
  })
})
