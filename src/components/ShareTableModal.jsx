import { useState } from 'react'
import { copyText } from '../lib/summary.js'

export default function ShareTableModal({ open, url, onClose }) {
  const [label, setLabel] = useState('Copiar link')

  if (!open) return null

  async function handleCopy() {
    const ok = await copyText(url)
    setLabel(ok ? 'Copiado!' : 'Não consegui copiar')
    setTimeout(() => setLabel('Copiar link'), 1600)
  }

  async function handleShare() {
    try {
      await navigator.share({ title: 'Cacifes — mesa ao vivo', url })
    } catch {
      /* usuário cancelou */
    }
  }

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <button className="close-x" onClick={onClose}>✕</button>
        <p className="question">Compartilhar a mesa</p>
        <p className="modal-hint" style={{ textAlign: 'center' }}>
          Quem abrir acompanha cacifes, saldos e o timer de blinds em tempo real,
          sem precisar de conta e sem conseguir alterar nada.
        </p>

        <div className="share-url">{url}</div>

        <div className="share-actions">
          <button className="timer-btn" onClick={handleCopy}>{label}</button>
          {typeof navigator !== 'undefined' && navigator.share && (
            <button className="timer-btn secondary" onClick={handleShare}>
              Compartilhar…
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
