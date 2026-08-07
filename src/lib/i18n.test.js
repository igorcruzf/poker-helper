import { describe, it, expect, afterEach } from 'vitest'
import { DICT, SUPPORTED, setLocalePref, translate } from './i18n.js'
import { fmt } from '../utils.js'

afterEach(() => setLocalePref('auto'))

function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return value && typeof value === 'object' ? flatten(value, path) : [path]
  })
}

// Faltar uma chave não quebra a tela (cai no português), mas some com a
// tradução sem ninguém perceber. Aqui a gaveta que ficou para trás aparece.
describe('os três dicionários têm as mesmas chaves', () => {
  const base = flatten(DICT.pt).sort()

  SUPPORTED.filter((locale) => locale !== 'pt').forEach((locale) => {
    it(`${locale} cobre tudo que o pt tem, e nada a mais`, () => {
      expect(flatten(DICT[locale]).sort()).toEqual(base)
    })
  })
})

describe('translate', () => {
  it('devolve a string do idioma pedido', () => {
    expect(translate('pt', 'timeBank.stop')).toBe('Parar')
    expect(translate('en', 'timeBank.stop')).toBe('Stop')
    expect(translate('es', 'timeBank.stop')).toBe('Parar')
  })

  it('substitui os parâmetros', () => {
    expect(translate('en', 'table.level', { level: 3, small: 20, big: 40 }))
      .toBe('Level 3 · 20/40')
  })

  it('deixa o marcador quando falta o parâmetro', () => {
    expect(translate('pt', 'sync.pending')).toContain('{count}')
  })

  it('cai no português quando a chave falta no idioma', () => {
    expect(translate('en', 'hands.royalFlush.name')).toBe('Royal Flush')
  })

  it('devolve a própria chave quando ela não existe em lugar nenhum', () => {
    expect(translate('pt', 'nao.existe')).toBe('nao.existe')
  })
})

describe('fmt segue o idioma', () => {
  it('usa real no português', () => {
    setLocalePref('pt')
    expect(fmt(12.5)).toBe('R$ 12,50')
    expect(fmt(-3)).toBe('R$ -3,00')
    expect(fmt(1234.5)).toBe('R$ 1.234,50')
  })

  it('usa dólar no inglês', () => {
    setLocalePref('en')
    expect(fmt(12.5)).toBe('$12.50')
    expect(fmt(-3)).toBe('$-3.00')
    expect(fmt(1234.5)).toBe('$1,234.50')
  })

  it('usa euro no espanhol, com o símbolo depois', () => {
    setLocalePref('es')
    expect(fmt(12.5)).toBe('12,50 €')
    expect(fmt(1234.5)).toBe('1.234,50 €')
  })
})
