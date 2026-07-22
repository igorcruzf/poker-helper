import { useState, useEffect } from 'react'
import { fmt, computeSaldo } from '../utils.js'

export default function AdjustModal({ player, buyIn, onCancel, onConfirm }) {
  const [value, setValue] = useState('')

  useEffect(() => {
    if (player) setValue(buyIn.toFixed(2))
  }, [player, buyIn])

  if (!player) return null

  const currentSaldo = computeSaldo(player, buyIn)
  const delta = parseFloat(value) || 0
  const finalSaldo = currentSaldo + delta

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal">
        <p className="question">Ajustar saldo</p>

        <div className="modal-field readonly">
          <label>Saldo atual</label>
          <input type="text" value={fmt(currentSaldo)} disabled />
        </div>

        <div className="modal-field">
          <label>Valor a acrescentar</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>

        <div className="modal-field readonly">
          <label>Saldo final</label>
          <input type="text" value={fmt(finalSaldo)} disabled />
        </div>

        <p className="modal-hint">
          Dica: informe o valor total das fichas que o jogador está finalizando na mesa, não apenas a diferença.
        </p>

        <div className="modal-actions">
          <div className="round-action cancel" onClick={onCancel}>✕</div>
          <div className="round-action confirm" onClick={() => onConfirm(player.id, delta)}>✓</div>
        </div>
      </div>
    </div>
  )
}
