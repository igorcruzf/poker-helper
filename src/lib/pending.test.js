import { describe, it, expect } from 'vitest'
import { pendingForPlayer } from './pending.js'

// Uma noite: o assento s1 é do jogador "p-me", s2 do "p-outro".
const table = {
  id: 't1',
  name: 'Sexta',
  created_at: 1,
  finished_at: 2,
  share_token: 'tok',
  table_players: [
    { id: 's1', player_id: 'p-me', name: 'Eu' },
    { id: 's2', player_id: 'p-outro', name: 'Bia' },
  ],
  settlements: [
    { id: 'x1', from_table_player_id: 's1', to_table_player_id: 's2', amount: 30, paid: false },
  ],
}

describe('pendingForPlayer', () => {
  it('separa o que eu devo do que tenho a receber', () => {
    const mine = pendingForPlayer([table], 'p-me')
    expect(mine.iOwe).toHaveLength(1)
    expect(mine.iOwe[0].who).toBe('Bia')
    expect(mine.iOweTotal).toBe(30)
    expect(mine.owedToMe).toHaveLength(0)

    const theirs = pendingForPlayer([table], 'p-outro')
    expect(theirs.owedToMe).toHaveLength(1)
    expect(theirs.owedToMeTotal).toBe(30)
    expect(theirs.iOwe).toHaveLength(0)
  })

  it('ignora o que já foi pago', () => {
    const paid = { ...table, settlements: [{ ...table.settlements[0], paid: true }] }
    const r = pendingForPlayer([paid], 'p-me')
    expect(r.iOwe).toHaveLength(0)
    expect(r.groupPending).toBe(0)
  })

  // Host que não joga não tem dívida, mas ainda precisa saber o que falta.
  it('soma o total do grupo mesmo sem jogador vinculado', () => {
    const r = pendingForPlayer([table], null)
    expect(r.groupPending).toBe(30)
    expect(r.iOwe).toHaveLength(0)
    expect(r.owedToMe).toHaveLength(0)
  })

  it('leva o assento de quem recebe, para achar a chave pix', () => {
    expect(pendingForPlayer([table], 'p-me').iOwe[0].toSeatId).toBe('s2')
  })
})
