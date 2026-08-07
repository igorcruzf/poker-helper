import { describe, it, expect } from 'vitest'
import { formatBytes, MAX_PHOTO_CHARS, MAX_PHOTO_LABEL } from './photo.js'

// O redimensionamento em si depende de canvas e só roda no navegador; aqui fica
// o que é puro — o rótulo que a pessoa lê e o teto que ele promete.
describe('formatBytes', () => {
  it('mostra KB até 1 MB e MB daí para cima', () => {
    expect(formatBytes(0)).toBe('0 KB')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(150 * 1024)).toBe('150 KB')
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.0 MB')
  })

  it('não quebra com entrada inválida', () => {
    expect(formatBytes(undefined)).toBe('0 KB')
    expect(formatBytes('abc')).toBe('0 KB')
  })
})

describe('teto da foto', () => {
  it('o rótulo mostrado é o mesmo limite que o código aplica', () => {
    expect(MAX_PHOTO_LABEL).toBe(formatBytes(MAX_PHOTO_CHARS))
  })

  // O CHECK de groups.image_url no schema.sql permite 300000 caracteres. O
  // limite do app tem que ficar abaixo, senão o banco recusa uma foto que a
  // tela deu como pronta.
  it('cabe com folga no CHECK do banco', () => {
    expect(MAX_PHOTO_CHARS).toBeLessThan(300000)
  })
})
