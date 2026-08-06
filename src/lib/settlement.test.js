import { describe, it, expect } from 'vitest'
import { balancePlayers, buildSettlement, settlementProgress } from './settlement.js'

// saldo = adjustment - cacifes * buyIn
const p = (id, name, cacifes, adjustment) => ({ id, name, cacifes, adjustment })

describe('buildSettlement', () => {
  it('centraliza no maior ganhador por padrão', () => {
    // buyIn 10: A perde 10, B perde 10, C ganha 20
    const players = [p('a', 'A', 1, 0), p('b', 'B', 1, 0), p('c', 'C', 1, 30)]
    const { collectorId, transfers } = buildSettlement(players, 10)

    expect(collectorId).toBe('c')
    expect(transfers).toEqual([
      { fromId: 'a', toId: 'c', amount: 10 },
      { fromId: 'b', toId: 'c', amount: 10 },
    ])
  })

  it('repassa do centralizador para os outros ganhadores', () => {
    // A perde 30, B ganha 10, C ganha 20 (centraliza C)
    const players = [p('a', 'A', 4, 10), p('b', 'B', 1, 20), p('c', 'C', 1, 30)]
    const { collectorId, transfers } = buildSettlement(players, 10)

    expect(collectorId).toBe('c')
    expect(transfers).toContainEqual({ fromId: 'a', toId: 'c', amount: 30 })
    expect(transfers).toContainEqual({ fromId: 'c', toId: 'b', amount: 10 })
  })

  it('usa o jogador fixo quando a mesa foi criada assim', () => {
    const players = [p('a', 'A', 1, 0), p('b', 'B', 1, 0), p('c', 'C', 1, 30)]
    const { collectorId, transfers } = buildSettlement(players, 10, {
      mode: 'fixed_player',
      playerId: 'a',
    })

    expect(collectorId).toBe('a')
    // A centraliza mesmo tendo perdido: recebe de B e paga C.
    expect(transfers).toContainEqual({ fromId: 'b', toId: 'a', amount: 10 })
    expect(transfers).toContainEqual({ fromId: 'a', toId: 'c', amount: 20 })
  })

  it('cai no padrão se o jogador fixo não está mais na mesa', () => {
    const players = [p('a', 'A', 1, 0), p('c', 'C', 1, 30)]
    const { collectorId } = buildSettlement(players, 10, {
      mode: 'fixed_player',
      playerId: 'sumiu',
    })
    expect(collectorId).toBe('c')
  })

  it('gera no máximo uma transferência por jogador', () => {
    const players = [
      p('a', 'A', 2, 0), p('b', 'B', 2, 0), p('c', 'C', 2, 0),
      p('d', 'D', 1, 40), p('e', 'E', 1, 30),
    ]
    const { transfers } = buildSettlement(players, 10)
    expect(transfers).toHaveLength(players.length - 1)
  })

  it('reporta o desequilíbrio quando a soma não fecha em zero', () => {
    const players = [p('a', 'A', 1, 0), p('b', 'B', 1, 25)]
    const { imbalance } = buildSettlement(players, 10)
    expect(imbalance).toBe(5)
  })

  it('ignora quem terminou zerado', () => {
    const players = [p('a', 'A', 1, 10), p('b', 'B', 1, 0), p('c', 'C', 1, 20)]
    const { transfers } = buildSettlement(players, 10)
    expect(transfers.some((t) => t.fromId === 'a' || t.toId === 'a')).toBe(false)
  })

  it('acusa a mesa em que ninguém lançou o saldo final', () => {
    // Dois jogadores, 1 cacife de R$5 cada, nenhum ajuste: os dois ficam em -5
    // e somem R$10 da conta. A UI barra o encerramento nesse estado — aqui só
    // fixamos que o desequilíbrio é reportado, e não escondido no acerto.
    const players = [p('filipe', 'Filipe', 1, 0), p('icaro', 'Ícaro', 1, 0)]
    const { imbalance, transfers, collectorId } = buildSettlement(players, 5)

    expect(imbalance).toBe(-10)
    // Empate no maior saldo: centraliza o primeiro da lista.
    expect(collectorId).toBe('filipe')
    expect(transfers).toEqual([{ fromId: 'icaro', toId: 'filipe', amount: 5 }])
  })

  it('não quebra com a mesa vazia', () => {
    expect(buildSettlement([], 10)).toEqual({
      collectorId: null, transfers: [], imbalance: 0, balances: [],
    })
  })
})

describe('balancePlayers', () => {
  // Quatro jogadores, 1 cacife de R$5 cada, ninguém lançou o saldo final:
  // todos em -5, faltando R$20 na conta.
  const quatroSemSaldo = [
    p('a', 'André', 1, 0), p('b', 'Diego', 1, 0),
    p('c', 'Filipe', 1, 0), p('d', 'Ícaro', 1, 0),
  ]

  it('distribui igualmente: todos zeram e ninguém paga ninguém', () => {
    const balanced = balancePlayers(quatroSemSaldo, 5, 'even')
    expect(balanced.map((b) => b.saldo)).toEqual([0, 0, 0, 0])

    const { transfers, imbalance } = buildSettlement(quatroSemSaldo, 5, { balanceMode: 'even' })
    expect(imbalance).toBe(0)
    expect(transfers).toEqual([])
  })

  it('ajusta no maior saldo: com todos empatados o efeito é o mesmo', () => {
    const balanced = balancePlayers(quatroSemSaldo, 5, 'top')
    expect(balanced.map((b) => b.saldo)).toEqual([0, 0, 0, 0])
  })

  it('ajusta no maior saldo: desconta só de quem está na ponta', () => {
    // A -10, B -10, C +5 → sobra -15, que sai do C.
    const players = [p('a', 'A', 2, 0), p('b', 'B', 2, 0), p('c', 'C', 1, 10)]
    const balanced = balancePlayers(players, 5, 'top')
    expect(balanced.find((b) => b.id === 'a').saldo).toBe(-10)
    expect(balanced.find((b) => b.id === 'b').saldo).toBe(-10)
    expect(balanced.find((b) => b.id === 'c').saldo).toBe(20)
  })

  it('divide entre os empatados na ponta', () => {
    // A -20, B +5, C +5 → sobra -10, dividida entre B e C.
    const players = [p('a', 'A', 4, 0), p('b', 'B', 1, 10), p('c', 'C', 1, 10)]
    const balanced = balancePlayers(players, 5, 'top')
    expect(balanced.find((b) => b.id === 'b').saldo).toBe(10)
    expect(balanced.find((b) => b.id === 'c').saldo).toBe(10)
  })

  it("'ignore' e mesa já fechada não mexem em nada", () => {
    const fechada = [p('a', 'A', 1, 0), p('b', 'B', 1, 10)]
    expect(balancePlayers(quatroSemSaldo, 5, 'ignore').map((b) => b.saldo)).toEqual([-5, -5, -5, -5])
    expect(balancePlayers(fechada, 5, 'even').map((b) => b.saldo)).toEqual([-5, 5])
  })
})

describe('settlementProgress', () => {
  it('conta o que falta pagar', () => {
    const progress = settlementProgress([
      { paid: true, amount: 10 },
      { paid: false, amount: 15 },
      { paid: false, amount: 5 },
    ])
    expect(progress).toEqual({ total: 3, paid: 1, pending: 2, pendingAmount: 20 })
  })
})
