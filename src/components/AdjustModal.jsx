import { useState, useEffect, useCallback } from 'react'
import {
  fmt,
  computeSaldo,
  saldoClass,
  pushMoneyDigit,
  popMoneyDigit,
  moneyDigitsToNumber,
} from '../utils.js'
import { useI18n } from '../hooks/useI18n.js'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

// O teclado é do próprio modal, não o do sistema. Isso resolve três coisas de
// uma vez: no iPhone o teclado numérico não tem vírgula (o valor ficava
// impossível de digitar), o teclado do sistema cobria o botão de confirmar, e
// com a máscara os centavos vão se preenchendo sozinhos da direita para a
// esquerda.
export default function AdjustModal({ player, buyIn, rebuy, onCancel, onConfirm }) {
  const { t } = useI18n()
  const [digits, setDigits] = useState('')
  const [negative, setNegative] = useState(false)

  useEffect(() => {
    if (player) {
      setDigits('')
      setNegative(false)
    }
  }, [player])

  const open = !!player
  const delta = moneyDigitsToNumber(digits) * (negative ? -1 : 1)

  const confirm = useCallback(() => {
    if (player) onConfirm(player.id, moneyDigitsToNumber(digits) * (negative ? -1 : 1))
  }, [player, digits, negative, onConfirm])

  // No desktop o teclado físico continua valendo — inclusive o Esc, que é o
  // único jeito de fechar sem clicar, já que o clique fora não fecha mais.
  useEffect(() => {
    if (!open) return
    function onKeyDown(e) {
      if (e.key >= '0' && e.key <= '9') {
        setDigits((d) => pushMoneyDigit(d, e.key))
      } else if (e.key === 'Backspace') {
        setDigits((d) => popMoneyDigit(d))
      } else if (e.key === '-' || e.key === '+') {
        setNegative(e.key === '-')
      } else if (e.key === 'Enter') {
        confirm()
      } else if (e.key === 'Escape') {
        onCancel()
      } else {
        return
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, confirm, onCancel])

  if (!player) return null

  const currentSaldo = computeSaldo(player, buyIn, rebuy)
  const finalSaldo = currentSaldo + delta

  return (
    // De propósito sem onClick no overlay: encostar fora estava fechando o
    // modal no meio da digitação e perdendo o valor.
    <div className="overlay">
      <div className="modal adjust-modal">
        <p className="question">{t('adjust.title')} · {player.name}</p>

        <div className="adjust-line">
          <span>{t('adjust.current')}</span>
          <span className="adjust-line-value">{fmt(player.adjustment || 0)}</span>
        </div>

        <div className="adjust-display">
          <span className="adjust-display-label">{t('adjust.amount')}</span>
          <span className="adjust-display-value">{fmt(delta)}</span>
        </div>

        <div className="keypad">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className="keypad-key"
              onClick={() => setDigits((d) => pushMoneyDigit(d, key))}
            >
              {key}
            </button>
          ))}
          <button
            type="button"
            className={`keypad-key sign${negative ? ' active' : ''}`}
            onClick={() => setNegative((v) => !v)}
            title={t('adjust.signHint')}
          >
            ±
          </button>
          <button
            type="button"
            className="keypad-key"
            onClick={() => setDigits((d) => pushMoneyDigit(d, '0'))}
          >
            0
          </button>
          <button
            type="button"
            className="keypad-key erase"
            onClick={() => setDigits((d) => popMoneyDigit(d))}
            title={t('adjust.erase')}
          >
            ⌫
          </button>
        </div>

        <div className="adjust-line final">
          <span>{t('adjust.final')}</span>
          <span className={`adjust-line-value ${saldoClass(finalSaldo)}`}>{fmt(finalSaldo)}</span>
        </div>

        <p className="modal-hint">{t('adjust.hint')}</p>

        <div className="modal-actions">
          <div className="round-action cancel" onClick={onCancel}>✕</div>
          <div className="round-action confirm" onClick={confirm}>✓</div>
        </div>
      </div>
    </div>
  )
}
