import { describe, it, expect } from 'vitest'
import { diffPlayers, trackedFields } from './playersDiff.js'

const p = (id, extra = {}) => ({
  id, name: id, cacifes: 1, adjustment: 0, position: 0, ...extra,
})

describe('diffPlayers', () => {
  it('acha quem entrou e quem saiu', () => {
    const d = diffPlayers([p('a'), p('b')], [p('b'), p('c')])
    expect(d.inserted.map((x) => x.id)).toEqual(['c'])
    expect(d.deleted.map((x) => x.id)).toEqual(['a'])
  })

  it('lista só quem mudou de verdade', () => {
    const before = [p('a'), p('b')]
    const after = [p('a'), p('b', { cacifes: 3 })]
    expect(diffPlayers(before, after).updated.map((x) => x.id)).toEqual(['b'])
  })

  it('ignora campos que não vão para o banco', () => {
    const before = [p('a')]
    const after = [p('a', { player_id: 'outro' })]
    expect(diffPlayers(before, after).updated).toEqual([])
  })

  it('não confunde reordenação com alteração de valor', () => {
    const before = [p('a', { position: 0 }), p('b', { position: 1 })]
    const after = [p('b', { position: 0 }), p('a', { position: 1 })]
    expect(diffPlayers(before, after).updated.map((x) => x.id).sort()).toEqual(['a', 'b'])
    expect(diffPlayers(before, after).inserted).toEqual([])
  })

  it('trackedFields devolve exatamente o que a linha grava', () => {
    expect(trackedFields(p('a', { cacifes: 2, player_id: 'x' })))
      .toEqual({ name: 'a', cacifes: 2, adjustment: 0, position: 0 })
  })
})
