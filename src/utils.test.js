import { describe, it, expect } from 'vitest'
import { fmt, saldoClass, computeSaldo, cacifesCost, parseMoney, fmtDate } from './utils'

describe('fmt', () => {
  it('formats positive values with comma decimal', () => {
    expect(fmt(12.5)).toBe('R$ 12,50')
  })

  it('formats negative values with a leading minus', () => {
    expect(fmt(-3)).toBe('R$ -3,00')
  })

  it('treats non-numeric input as zero', () => {
    expect(fmt(undefined)).toBe('R$ 0,00')
    expect(fmt('abc')).toBe('R$ 0,00')
  })
})

describe('saldoClass', () => {
  it('classifies positive, negative and near-zero balances', () => {
    expect(saldoClass(10)).toBe('pos')
    expect(saldoClass(-10)).toBe('neg')
    expect(saldoClass(0)).toBe('zero')
    expect(saldoClass(0.0001)).toBe('zero')
  })
})

describe('computeSaldo', () => {
  it('is adjustment minus cacifes times buyIn', () => {
    expect(computeSaldo({ cacifes: 3, adjustment: 10 }, 20)).toBe(10 - 60)
  })

  it('treats a missing adjustment as zero', () => {
    expect(computeSaldo({ cacifes: 2 }, 5)).toBe(-10)
  })
})

describe('parseMoney', () => {
  it('accepts comma as decimal separator', () => {
    expect(parseMoney('12,5')).toBe(12.5)
  })

  it('falls back on empty or invalid input', () => {
    expect(parseMoney('', { fallback: 7 })).toBe(7)
    expect(parseMoney('abc', { fallback: 7 })).toBe(7)
  })

  it('clamps to the given minimum', () => {
    expect(parseMoney('-50', { min: 0 })).toBe(0)
  })
})

describe('fmtDate', () => {
  it('formats a timestamp as pt-BR dd/mm/yyyy', () => {
    const ts = new Date(2026, 0, 5).getTime()
    expect(fmtDate(ts)).toBe('05/01/2026')
  })

  it('does not throw on an invalid timestamp', () => {
    // toLocaleDateString on an Invalid Date returns the literal string
    // 'Invalid Date' rather than throwing, so fmtDate's try/catch never
    // actually triggers here — this just locks in that it doesn't crash.
    expect(fmtDate(undefined)).toBe('Invalid Date')
  })
})

describe('cacifesCost', () => {
  it('cobra o valor de entrada no primeiro cacife e o rebuy nos seguintes', () => {
    // entrada R$ 10, rebuy R$ 5: 1 cacife = 10, 2 = 15, 3 = 20
    expect(cacifesCost(1, 10, 5)).toBe(10)
    expect(cacifesCost(2, 10, 5)).toBe(15)
    expect(cacifesCost(3, 10, 5)).toBe(20)
  })

  it('cobra tudo igual quando não há rebuy próprio', () => {
    expect(cacifesCost(3, 10)).toBe(30)
    expect(cacifesCost(3, 10, null)).toBe(30)
    expect(cacifesCost(3, 10, undefined)).toBe(30)
  })

  it('não cobra nada de quem está com zero cacifes', () => {
    expect(cacifesCost(0, 10, 5)).toBe(0)
  })

  it('aceita rebuy mais caro que a entrada', () => {
    expect(cacifesCost(3, 5, 20)).toBe(45)
  })
})

describe('computeSaldo com rebuy', () => {
  it('desconta entrada + rebuys do valor levado da mesa', () => {
    // 3 cacifes (10 + 5 + 5 = 20), levou 50 → saldo 30
    expect(computeSaldo({ cacifes: 3, adjustment: 50 }, 10, 5)).toBe(30)
  })

  it('mantém o cálculo antigo sem rebuy informado', () => {
    expect(computeSaldo({ cacifes: 2, adjustment: 0 }, 5)).toBe(-10)
  })
})
