import { describe, it, expect } from 'vitest'
import { buildSummaryText } from './summary.js'

// Dois jogadores: um perdeu 10, o outro ganhou 10.
const players = [
  { id: 'p1', name: 'André', cacifes: 2, adjustment: 0 },
  { id: 'p2', name: 'Bia', cacifes: 2, adjustment: 20 },
]
const BUY_IN = 5

describe('buildSummaryText', () => {
  it('lista o saldo de cada um', () => {
    const text = buildSummaryText(players, BUY_IN)
    expect(text).toContain('André: R$ -10,00  (2x cacife)')
    expect(text).toContain('Bia: R$ 10,00  (2x cacife)')
  })

  it('mostra quem paga quem quando pedido', () => {
    const text = buildSummaryText(players, BUY_IN, { withSettlement: true })
    expect(text).toContain('André paga R$ 10,00 para Bia')
  })

  // A chave é de quem RECEBE: é ela que quem paga precisa ter em mãos ao ler a
  // mensagem no grupo.
  it('cola a chave pix de quem recebe no pagamento', () => {
    const text = buildSummaryText(players, BUY_IN, {
      withSettlement: true,
      pix: { p2: 'bia@email.com' },
    })
    expect(text).toContain('André paga R$ 10,00 para Bia (pix: bia@email.com)')
  })

  it('não inventa parênteses vazios para quem não cadastrou chave', () => {
    const text = buildSummaryText(players, BUY_IN, {
      withSettlement: true,
      pix: { p1: 'andre@email.com' },
    })
    expect(text).toContain('André paga R$ 10,00 para Bia')
    expect(text).not.toContain('(pix:')
  })
})
