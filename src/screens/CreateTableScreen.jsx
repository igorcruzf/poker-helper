import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoster } from '../hooks/useRoster.js'
import { useTables } from '../hooks/useTables.js'
import { parseMoney } from '../utils.js'
import DeleteRosterPlayerModal from '../components/DeleteRosterPlayerModal.jsx'

const DEFAULT_BUYIN = 5

export default function CreateTableScreen() {
  const navigate = useNavigate()
  const { roster, loading: rosterLoading, addToRoster, removeFromRoster } = useRoster()
  const { createTable } = useTables()

  const [name, setName] = useState('')
  const [buyIn, setBuyIn] = useState(String(DEFAULT_BUYIN))
  const [selected, setSelected] = useState([]) // ids do elenco
  const [newName, setNewName] = useState('')
  const [mode, setMode] = useState('top_winner')
  const [collectorId, setCollectorId] = useState('')
  const [shuffleSeats, setShuffleSeats] = useState(true)
  const [allowGuestPayments, setAllowGuestPayments] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [deletingRoster, setDeletingRoster] = useState(null)

  const selectedPlayers = selected
    .map((id) => roster.find((p) => p.id === id))
    .filter(Boolean)

  // Se quem ia receber saiu da seleção, a escolha deixa de valer.
  const effectiveCollectorId = selected.includes(collectorId) ? collectorId : ''

  function toggle(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  async function handleAddNew(e) {
    e.preventDefault()
    const value = newName.trim()
    if (!value) return
    const { data, error } = await addToRoster(value)
    if (error) {
      setError(error.message)
      return
    }
    setNewName('')
    setSelected((prev) => (prev.includes(data.id) ? prev : [...prev, data.id]))
  }

  async function handleDeleteRoster() {
    const { id } = deletingRoster
    setDeletingRoster(null)
    setSelected((prev) => prev.filter((p) => p !== id))
    const { error } = await removeFromRoster(id)
    if (error) setError(error.message)
  }

  async function handleCreate() {
    if (selectedPlayers.length === 0) {
      setError('Escolha pelo menos um jogador.')
      return
    }
    setBusy(true)
    setError('')
    const { data, error } = await createTable({
      name,
      buyIn: parseMoney(buyIn, { min: 0, fallback: DEFAULT_BUYIN }),
      players: selectedPlayers,
      settlementMode: mode,
      settlementPlayerId: mode === 'fixed_player' ? effectiveCollectorId : null,
      shuffleSeats,
      allowGuestPayments,
    })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    navigate(`/mesa/${data.id}`, { replace: true })
  }

  return (
    <div className="app-shell">
      <div className="app">
        <div className="screen-top">
          <button className="back-link" onClick={() => navigate('/')}>← Voltar</button>
          <span className="screen-title">Nova mesa</span>
        </div>

        <div className="rail">
          <div className="card">
            <label className="auth-field">
              <span>Nome da mesa (opcional)</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mesa de Poker"
              />
            </label>

            <label className="auth-field">
              <span>Valor do cacife</span>
              <input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={buyIn}
                onChange={(e) => setBuyIn(e.target.value)}
              />
            </label>

            <div className="section-title">Jogadores</div>

            {rosterLoading && <div className="empty-state">Carregando elenco…</div>}

            {!rosterLoading && roster.length === 0 && (
              <div className="empty-state">
                Você ainda não tem jogadores salvos.<br />Adicione o primeiro abaixo.
              </div>
            )}

            <div className="roster-list">
              {roster.map((p) => (
                <div
                  key={p.id}
                  className={`roster-item${selected.includes(p.id) ? ' selected' : ''}`}
                >
                  <button className="roster-pick" onClick={() => toggle(p.id)}>
                    <span className="roster-check">{selected.includes(p.id) ? '✓' : ''}</span>
                    <span className="roster-name">{p.name}</span>
                  </button>
                  <button
                    className="roster-del"
                    title={`Excluir ${p.name} do elenco`}
                    onClick={() => setDeletingRoster(p)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <form className="roster-add" onSubmit={handleAddNew}>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Novo jogador"
              />
              <button type="submit" className="roster-add-btn">Adicionar</button>
            </form>

            <div className="section-title">Quem recebe o dinheiro</div>
            <div className="theme-list">
              <button
                className={`theme-option${mode === 'top_winner' ? ' active' : ''}`}
                onClick={() => setMode('top_winner')}
              >
                <span className="theme-name">
                  Maior ganhador (padrão)
                  <small>Quem mais ganhou recebe de todos e repassa aos outros ganhadores.</small>
                </span>
                {mode === 'top_winner' && <span className="theme-check">✓</span>}
              </button>
              <button
                className={`theme-option${mode === 'fixed_player' ? ' active' : ''}`}
                onClick={() => setMode('fixed_player')}
                disabled={selectedPlayers.length === 0}
              >
                <span className="theme-name">
                  Jogador fixo
                  <small>O anfitrião (ou quem você escolher) centraliza o acerto.</small>
                </span>
                {mode === 'fixed_player' && <span className="theme-check">✓</span>}
              </button>
            </div>

            {mode === 'fixed_player' && (
              <select
                className="collector-select"
                value={effectiveCollectorId}
                onChange={(e) => setCollectorId(e.target.value)}
              >
                <option value="">Escolha o jogador…</option>
                {selectedPlayers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}

            <div className="section-title">Opções da mesa</div>
            <label className="switch-row">
              <input
                type="checkbox"
                checked={shuffleSeats}
                onChange={(e) => setShuffleSeats(e.target.checked)}
              />
              <span>
                Sortear os lugares
                <small>
                  Embaralha a ordem dos jogadores ao criar a mesa. Sentem-se seguindo a
                  lista: quem ficar em primeiro é o primeiro dealer.
                </small>
              </span>
            </label>
            <label className="switch-row">
              <input
                type="checkbox"
                checked={allowGuestPayments}
                onChange={(e) => setAllowGuestPayments(e.target.checked)}
              />
              <span>
                Jogadores podem marcar pagamento pelo link
                <small>
                  Desligado, o link do acerto vira só consulta e quem marca é você.
                </small>
              </span>
            </label>

            {error && <div className="auth-error">{error}</div>}
          </div>
        </div>

        <div className="footer-actions">
          <button
            className="add-player-btn"
            onClick={handleCreate}
            disabled={busy || selectedPlayers.length === 0 || (mode === 'fixed_player' && !effectiveCollectorId)}
          >
            {busy ? 'Criando…' : `Criar mesa (${selectedPlayers.length})`}
          </button>
        </div>
      </div>

      <DeleteRosterPlayerModal
        player={deletingRoster}
        onCancel={() => setDeletingRoster(null)}
        onConfirm={handleDeleteRoster}
      />
    </div>
  )
}
