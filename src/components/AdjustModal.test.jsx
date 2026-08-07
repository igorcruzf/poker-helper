import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdjustModal from './AdjustModal.jsx'
import { setLocalePref } from '../lib/i18n.js'

// Este modal foi refeito por causa de uma noite real: no iPhone o teclado
// numérico não tem vírgula e o valor era impossível de digitar. Os testes
// abaixo travam exatamente o comportamento que resolveu isso.
const player = { id: 'tp1', name: 'André', cacifes: 2, adjustment: 0 }

function setup(props = {}) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(
    <AdjustModal
      player={player}
      buyIn={5}
      rebuy={5}
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />
  )
  return { onConfirm, onCancel }
}

const key = (label) => screen.getByRole('button', { name: label })
// "R$ 0,00" aparece em mais de um lugar do modal (o que já foi retirado, o que
// está sendo digitado, o saldo final), então cada asserção mira o seu.
const typed = () => document.querySelector('.adjust-display-value').textContent
const finalSaldo = () => document.querySelector('.adjust-line.final .adjust-line-value').textContent

beforeEach(() => setLocalePref('pt'))

describe('AdjustModal', () => {
  it('começa em zero e preenche os centavos da direita para a esquerda', async () => {
    const user = userEvent.setup()
    setup()

    expect(typed()).toBe('R$ 0,00')

    // O que a pessoa aperta para chegar em 10,20.
    await user.click(key('1'))
    expect(typed()).toBe('R$ 0,01')
    await user.click(key('0'))
    expect(typed()).toBe('R$ 0,10')
    await user.click(key('2'))
    expect(typed()).toBe('R$ 1,02')
    await user.click(key('0'))
    expect(typed()).toBe('R$ 10,20')
  })

  it('não usa campo de texto — o teclado é do próprio modal', () => {
    setup()
    // Nada de <input>: é o que quebrava no iPhone.
    expect(document.querySelector('input')).toBeNull()
  })

  it('apaga o último dígito', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(key('5'))
    await user.click(key('0'))
    expect(typed()).toBe('R$ 0,50')
    await user.click(key('⌫'))
    expect(typed()).toBe('R$ 0,05')
  })

  it('o ± transforma o valor em desconto', async () => {
    const user = userEvent.setup()
    const { onConfirm } = setup()
    await user.click(key('1'))
    await user.click(key('0'))
    await user.click(key('0'))
    expect(typed()).toBe('R$ 1,00')
    await user.click(key('±'))
    expect(typed()).toBe('R$ -1,00')

    await user.click(screen.getByText('✓'))
    expect(onConfirm).toHaveBeenCalledWith('tp1', -1)
  })

  it('mostra o saldo final somando ao que já foi retirado', async () => {
    const user = userEvent.setup()
    setup({ player: { ...player, adjustment: 4 } })
    // 2 cacifes de R$ 5 = R$ 10 pagos; já retirou 4, então o saldo é -6.
    expect(finalSaldo()).toBe('R$ -6,00')
    await user.click(key('1'))
    await user.click(key('0'))
    await user.click(key('0'))
    // Retirando mais 1,00: saldo final -5,00.
    expect(finalSaldo()).toBe('R$ -5,00')
  })

  it('não fecha ao clicar fora — encostar na borda apagava o valor digitado', async () => {
    const user = userEvent.setup()
    const { onCancel } = setup()
    await user.click(document.querySelector('.overlay'))
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('aceita teclado físico: dígitos, apagar e Enter', async () => {
    const user = userEvent.setup()
    const { onConfirm } = setup()
    await user.keyboard('123')
    expect(typed()).toBe('R$ 1,23')
    await user.keyboard('{Backspace}')
    expect(typed()).toBe('R$ 0,12')
    await user.keyboard('{Enter}')
    expect(onConfirm).toHaveBeenCalledWith('tp1', 0.12)
  })

  it('Escape fecha, já que não dá para clicar fora', async () => {
    const user = userEvent.setup()
    const { onCancel } = setup()
    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalled()
  })
})
