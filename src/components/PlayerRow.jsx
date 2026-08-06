import { useEffect, useRef, useState } from 'react'
import { fmt, saldoClass, computeSaldo } from '../utils.js'

export default function PlayerRow({
  player,
  buyIn,
  onCacifeChange,
  onDelete,
  onOpenAdjust,
  dragEnabled,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
}) {
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
    <div
      className={`player-row${isDragging ? ' dragging' : ''}`}
      draggable={dragEnabled}
      onDragStart={dragEnabled ? (e) => onDragStart(e, player.id) : undefined}
      onDragOver={dragEnabled ? (e) => onDragOver(e, player.id) : undefined}
      onDrop={dragEnabled ? (e) => onDrop(e, player.id) : undefined}
      onDragEnd={dragEnabled ? onDragEnd : undefined}
    >
      <div className="chip-btn remove" onClick={() => onDelete(player)}>−</div>
      <span className="player-name" title={player.name}>{player.name}</span>
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