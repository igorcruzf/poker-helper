import { describe, it, expect } from 'vitest'
import { isChunkError } from './chunkError.js'

// Só erro de pedaço que não chegou dispara a recarga automática. Alargar demais
// faz o app recarregar em cima de um bug de verdade, escondendo o motivo;
// apertar demais devolve a tela branca depois de cada deploy.
describe('isChunkError', () => {
  it('reconhece as mensagens dos navegadores para import dinâmico que falhou', () => {
    const reais = [
      new Error('Failed to fetch dynamically imported module: https://app/assets/GroupsScreen-x.js'),
      new Error('Loading chunk 42 failed.'),
      new Error('error loading dynamically imported module'),
      new Error('Importing a module script failed.'),
    ]
    reais.forEach((e) => expect(isChunkError(e)).toBe(true))
  })

  it('não confunde com erro de código', () => {
    const outros = [
      new TypeError("Cannot read properties of null (reading 'useState')"),
      new Error('Supabase não configurado'),
      new Error('sem sessão'),
    ]
    outros.forEach((e) => expect(isChunkError(e)).toBe(false))
  })

  it('aguenta erro sem mensagem', () => {
    expect(isChunkError(null)).toBe(false)
    expect(isChunkError({})).toBe(false)
  })
})
