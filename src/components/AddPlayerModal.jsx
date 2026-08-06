import { useState } from 'react'
import { useRoster } from '../hooks/useRoster.js'

// Entra jogador no meio da noite: pega alguém do elenco ou cria na hora.
export default function AddPlayerModal({ open, tablePlayers, onCancel, onConfirm }) {
  const { roster, loading, addToRoster } = useRoster()
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) return null

  const seated = new Set(tablePlayers.map((p) => p.player_id).filter(Boolean))
  const available = roster.filter((p) => !seated.has(p.id))

  async function handleCreate(e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setBusy(true)
    const { data } = await addToRoster(name)
    setBusy(false)
    setNewName('')
    onConfirm({ name, playerId: data?.id || null })
  }

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal">
        <button className="close-x" onClick={onCancel}>✕</button>
        <p className="question">Novo jogador</p>

        {loading && <div className="empty-state">Carregando elenco…</div>}

        {!loading && available.length === 0 && (
          <div className="empty-state">Todo o elenco já está na mesa.</div>
        )}

        <div className="roster-list">
          {available.map((p) => (
            <div className="roster-item" key={p.id}>
              <button
                className="roster-pick"
                onClick={() => onConfirm({ name: p.name, playerId: p.id })}
              >
                <span className="roster-check">+</span>
                <span className="roster-name">{p.name}</span>
              </button>
            </div>
          ))}
        </div>

        <form className="roster-add" onSubmit={handleCreate}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ou digite um nome novo"
          />
          <button type="submit" className="roster-add-btn" disabled={busy || !newName.trim()}>
            Adicionar
          </button>
        </form>
      </div>
    </div>
  )
}
