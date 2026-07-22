import { useState } from 'react'
import { fmt, computeSaldo } from '../utils.js'

export default function ExportModal({ open, onClose, buyIn, players }) {
  const [copyLabel, setCopyLabel] = useState('Copiar resumo')

  if (!open) return null

  const lines = [`Poker dos Meninos — R$ ${buyIn.toFixed(2).replace('.', ',')} por cacife`, '']
  if (players.length === 0) {
    lines.push('(sem jogadores)')
  } else {
    players.forEach((p) => {
      lines.push(`${p.name}: ${fmt(computeSaldo(p, buyIn))}  (${p.cacifes}x cacife)`)
    })
  }
  const text = lines.join('\n')

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopyLabel('Copiado!')
      setTimeout(() => setCopyLabel('Copiar resumo'), 1500)
    } catch {
      setCopyLabel('Selecione e copie manualmente')
    }
  }

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <button className="close-x" onClick={onClose}>✕</button>
        <p className="question">Resumo da noite</p>
        <div className="share-text">{text}</div>
        <button className="copy-btn" onClick={handleCopy}>{copyLabel}</button>
      </div>
    </div>
  )
}
