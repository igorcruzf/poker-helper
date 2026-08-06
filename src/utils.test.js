import { describe, it, expect } from 'vitest'
import { fmt, saldoClass, computeSaldo, parseMoney, fmtDate } from './utils'

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
