import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PlayerRow from './PlayerRow.jsx'
import { setLocalePref } from '../lib/i18n.js'

const player = { id: 'tp1', name: 'André', cacifes: 2, adjustment: 0 }

function setup(props = {}) {
  const handlers = {
    onCacifeChange: vi.fn(),
    onDelete: vi.fn(),
    onOpenAdjust: vi.fn(),
  }
  render(<PlayerRow player={player} buyIn={5} rebuy={5} {...handlers} {...props} />)
  return handlers
}

beforeEach(() => setLocalePref('pt'))

describe('PlayerRow', () => {
  it('mostra o saldo derivado do cacife pago', () => {
    setup()
    // 2 cacifes de R$ 5, nada retirado.
    expect(screen.getByText('R$ -10,00')).toBeInTheDocument()
  })

  it('cobra o rebuy nos cacifes seguintes, não o valor de entrada', () => {
    setup({ player: { ...player, cacifes: 3 }, buyIn: 10, rebuy: 5 })
    // 10 + 5 + 5.
    expect(screen.getByText('R$ -20,00')).toBeInTheDocument()
  })

  it('soma e subtrai cacife pelos dois chips', async () => {
    const user = userEvent.setup()
    const { onCacifeChange } = setup()
    const [remove, minus, plus] = screen.getAllByText(/[−+]/)
    await user.click(plus)
    expect(onCacifeChange).toHaveBeenCalledWith('tp1', 1)
    await user.click(minus)
    expect(onCacifeChange).toHaveBeenCalledWith('tp1', -1)
    // O primeiro "−" da linha é o de excluir o jogador, não o de cacife.
    await user.click(remove)
    expect(onCacifeChange).toHaveBeenCalledTimes(2)
  })

  // O chip "+" ao lado do saldo era confundido com o de cacife e ninguém
  // descobria como fechar o saldo de alguém. Virou botão com a ação escrita.
  it('o botão de fechar saldo diz o que faz e abre o modal', async () => {
    const user = userEvent.setup()
    const { onOpenAdjust } = setup()
    const button = screen.getByRole('button', { name: /fechar/i })
    expect(button).toHaveTextContent('fechar')
    await user.click(button)
    expect(onOpenAdjust).toHaveBeenCalledWith(player)
  })

  it('só arrasta quando não há ordenação ativa', () => {
    const { container } = render(
      <PlayerRow player={player} buyIn={5} rebuy={5} dragEnabled={false} />
    )
    expect(container.querySelector('.player-row')).toHaveAttribute('draggable', 'false')
  })
})
