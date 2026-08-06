import { useState, useEffect, useRef } from 'react'
import { fmt, computeSaldo, parseMoney } from '../utils.js'
import { useI18n } from '../hooks/useI18n.js'

export default function AdjustModal({ player, buyIn, rebuy, onCancel, onConfirm }) {
  const { t } = useI18n()
  const [value, setValue] = useState('')
  const valueInputRef = useRef(null)

  useEffect(() => {
    if (player) {
      setValue('')
      valueInputRef.current?.focus()
    }
  }, [player])

  if (!player) return null

  const currentSaldo = computeSaldo(player, buyIn, rebuy)
  const delta = parseMoney(value, { fallback: 0 })
  const finalSaldo = currentSaldo + delta

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal">
        <p className="question">{t('adjust.title')}</p>

        <div className="modal-field readonly">
          <label>{t('adjust.current')}</label>
          <input type="text" value={fmt(currentSaldo)} disabled />
        </div>

        <div className="modal-field">
          <label>{t('adjust.amount')}</label>
          <input
            ref={valueInputRef}
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>

        <div className="modal-field readonly">
          <label>{t('adjust.final')}</label>
          <input type="text" value={fmt(finalSaldo)} disabled />
        </div>

        <p className="modal-hint">{t('adjust.hint')}</p>

        <div className="modal-actions">
          <div className="round-action cancel" onClick={onCancel}>✕</div>
          <div className="round-action confirm" onClick={() => onConfirm(player.id, delta)}>✓</div>
        </div>
      </div>
    </div>
  )
}