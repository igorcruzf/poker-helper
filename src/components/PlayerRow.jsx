import { useEffect, useRef, useState } from 'react'
import { fmt, saldoClass, computeSaldo } from '../utils.js'

export default function PlayerRow({ player, buyIn, onRename, onCacifeChange, onDelete, onOpenAdjust }) {
  const saldo = computeSaldo(player, buyIn)
  const [bump, setBump] = useState(false)
  const firstRun = useRef(true)

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    setBump(true)
    const t = setTimeout(() => setBump(false), 420)
    return () => clearTimeout(t)
  }, [saldo])

  return (
    <div className="player-row">
      <div className="chip-btn remove" onClick={() => onDelete(player)}>−</div>
      <input
        className="name-input"
        value={player.name}
        onChange={(e) => onRename(player.id, e.target.value)}
      />
      <div className="stepper">
        <div
          className="chip-btn small"
          onClick={() => onCacifeChange(player.id, -1)}
        >−</div>
        <span className="value">{player.cacifes}</span>
        <div
          className="chip-btn small"
          onClick={() => onCacifeChange(player.id, 1)}
        >+</div>
      </div>
      <div className="saldo-stepper">
        <span className={`saldo-value ${saldoClass(saldo)}`}>{fmt(saldo)}</span>
        <div className="chip-btn small" onClick={() => onOpenAdjust(player)}>+</div>
      </div>
    </div>
  )
}
