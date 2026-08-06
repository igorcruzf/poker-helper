import { describe, it, expect } from 'vitest'
import { computeOverview, computePlayerStats } from './stats.js'

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

  it('acha quem mais queimou cacife e quem mais apareceu', () => {
    const o = computeOverview(history)
    expect(o.mostCacifes.name).toBe('Ícaro')
    expect(o.mostNights.nights).toBe(2)
  })

  it('não quebra sem histórico', () => {
    const o = computeOverview([])
    expect(o).toMatchObject({ tables: 0, players: 0, cacifes: 0, best: null, worst: null })
  })
})
