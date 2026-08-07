import { useEffect, useRef, useState } from 'react'
import { fmt, saldoClass, computeSaldo } from '../utils.js'
import Avatar from './Avatar.jsx'
import { useI18n } from '../hooks/useI18n.js'

export default function PlayerRow({
  player,
  buyIn,
  rebuy,
  onCacifeChange,
  onDelete,
  onOpenAdjust,
  onOpenProfile,
  photo,
  dragEnabled,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
}) {
  const { t } = useI18n()
  const saldo = computeSaldo(player, buyIn, rebuy)
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
      {/* Foto + nome abrem a página da pessoa. Sem `onOpenProfile` (mesa
          pública, por exemplo) fica só o texto, sem afordância de clique. */}
      {onOpenProfile ? (
        <button
          className="player-name-btn"
          onClick={() => onOpenProfile(player)}
          title={t('table.openProfile', { name: player.name })}
        >
          <Avatar photo={photo} name={player.name} size="xs" />
          <span className="player-name">{player.name}</span>
        </button>
      ) : (
        <span className="player-name" title={player.name}>{player.name}</span>
      )}
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
      {/* Era um chip "+" igual ao dos cacifes e ninguém entendia que ali se
          fecha o saldo do jogador. Agora é um botão com moldura e a ação
          escrita embaixo do valor. */}
      <button className="saldo-btn" onClick={() => onOpenAdjust(player)} title={t('table.saldoAction')}>
        <span className={`saldo-value ${saldoClass(saldo)}${bump ? ' bump' : ''}`}>{fmt(saldo)}</span>
        <span className="saldo-btn-hint">✎ {t('table.saldoAction')}</span>
      </button>
    </div>
  )
}