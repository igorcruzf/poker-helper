import { describe, it, expect } from 'vitest'
import { pixByTablePlayer } from '../hooks/useGroupPeople.js'

describe('pixByTablePlayer', () => {
  const seats = [
    { id: 's1', player_id: 'p1' },
    { id: 's2', player_id: 'p2' },
    { id: 's3', player_id: null },
  ]

  it('traduz do jogador do elenco para o assento da mesa', () => {
    expect(pixByTablePlayer(seats, { p1: 'a@b.c' })).toEqual({ s1: 'a@b.c' })
  })

  it('ignora quem não tem chave e quem não veio do elenco', () => {
    expect(pixByTablePlayer(seats, { p2: null })).toEqual({})
    expect(pixByTablePlayer(seats, {})).toEqual({})
  })

  it('aguenta mesa sem jogadores', () => {
    expect(pixByTablePlayer(null, { p1: 'x' })).toEqual({})
  })
})
