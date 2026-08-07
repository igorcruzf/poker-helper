import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGroups } from '../hooks/useGroups.jsx'
import { useGroupPeople } from '../hooks/useGroupPeople.js'
import { useRoster } from '../hooks/useRoster.js'
import { useTables } from '../hooks/useTables.js'
import { parseMoney } from '../utils.js'
import Avatar from '../components/Avatar.jsx'
import BackBar from '../components/BackBar.jsx'
import DeleteRosterPlayerModal from '../components/DeleteRosterPlayerModal.jsx'
import EditRosterPlayerModal from '../components/EditRosterPlayerModal.jsx'
import { useI18n } from '../hooks/useI18n.js'

const DEFAULT_BUYIN = 5

export default function CreateTableScreen() {
  const navigate = useNavigate()
  const { roster, loading: rosterLoading, addToRoster, renameInRoster, removeFromRoster } = useRoster()
  const { createTable } = useTables()
  const { activeGroupId } = useGroups()
  const people = useGroupPeople(activeGroupId)
  const { t } = useI18n()

  const [name, setName] = useState('')
  const [buyIn, setBuyIn] = useState(String(DEFAULT_BUYIN))
  const [rebuy, setRebuy] = useState('')
  const [selected, setSelected] = useState([]) // ids do elenco
  const [newName, setNewName] = useState('')
  const [nickname, setNickname] = useState('')
  const [mode, setMode] = useState('top_winner')
  const [collectorId, setCollectorId] = useState('')
  const [shuffleSeats, setShuffleSeats] = useState(true)
  const [allowGuestPayments, setAllowGuestPayments] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [deletingRoster, setDeletingRoster] = useState(null)
  const [editingRoster, setEditingRoster] = useState(null)
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState('')

  const selectedPlayers = selected
    .map((id) => roster.find((p) => p.id === id))
    .filter(Boolean)

  // Se quem ia receber saiu da seleção, a escolha deixa de valer.
  const effectiveCollectorId = selected.includes(collectorId) ? collectorId : ''

  function toggle(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  // O apelido só é pedido quando o nome já existe no elenco — é o que impede
  // dois Andrés de virarem a mesma pessoa nas estatísticas.
  const clash = roster.find(
    (p) => p.name.trim().toLowerCase() === newName.trim().toLowerCase()
  )

  async function handleAddNew(e) {
    e.preventDefault()
    const value = newName.trim()
    if (!value || (clash && !nickname.trim())) return
    const { data, error } = await addToRoster(value, nickname)
    if (error) {
      setError(error.message)
      return
    }
    setNewName('')
    setNickname('')
    setSelected((prev) => (prev.includes(data.id) ? prev : [...prev, data.id]))
  }

  async function handleRenameRoster(values) {
    setEditBusy(true)
    setEditError('')
    const { error } = await renameInRoster(editingRoster.id, values)
    setEditBusy(false)
    if (error) {
      // Colisão com outro jogador do elenco cai aqui: nome + apelido são únicos.
      setEditError(error.message)
      return
    }
    setEditingRoster(null)
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
      setError(t('create.pickOne'))
      return
    }
    setBusy(true)
    setError('')
    const { data, error } = await createTable({
      name,
      buyIn: parseMoney(buyIn, { min: 0, fallback: DEFAULT_BUYIN }),
      // Vazio = rebuy pelo mesmo valor da entrada.
      rebuy: rebuy.trim() === '' ? null : parseMoney(rebuy, { min: 0, fallback: 0 }),
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
        <BackBar to="/" title={t('create.title')} />

        <div className="rail">
          <div className="card">
            <label className="auth-field">
              <span>{t('create.nameLabel')}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('create.namePlaceholder')}
              />
            </label>

            <label className="auth-field">
              <span>{t('create.buyInLabel')}</span>
              <input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={buyIn}
                onChange={(e) => setBuyIn(e.target.value)}
              />
            </label>

            <label className="auth-field">
              <span>{t('create.rebuyLabel')}</span>
              <input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={rebuy}
                onChange={(e) => setRebuy(e.target.value)}
                placeholder={t('create.rebuyPlaceholder', { value: buyIn || DEFAULT_BUYIN })}
              />
              <small className="field-hint">{t('create.rebuyHint')}</small>
            </label>

            <div className="section-title">{t('create.players')}</div>

            {rosterLoading && <div className="empty-state">{t('create.loadingRoster')}</div>}

            {!rosterLoading && roster.length === 0 && (
              <div className="empty-state">
                {t('create.emptyRoster')}<br />{t('create.emptyRosterHint')}
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
                    <Avatar photo={people.byPlayerId[p.id]?.photo} name={p.label} size="xs" />
                    <span className="roster-name">{p.label}</span>
                  </button>
                  {/* Quem tem conta muda o próprio nome no perfil — daqui só se
                      abre a página da pessoa. O ✎ fica para o visitante, que
                      não tem ninguém para editá-lo. */}
                  {people.byPlayerId[p.id] ? (
                    <button
                      className="roster-del roster-open"
                      title={t('create.openProfileTitle', { name: p.label })}
                      onClick={() => navigate(people.routeFor(p.id))}
                    >
                      →
                    </button>
                  ) : (
                    <button
                      className="roster-del roster-edit"
                      title={t('create.editRosterTitle', { name: p.label })}
                      onClick={() => { setEditError(''); setEditingRoster(p) }}
                    >
                      ✎
                    </button>
                  )}
                  <button
                    className="roster-del"
                    title={t('create.deleteRosterTitle', { name: p.label })}
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
                placeholder={t('create.newPlayer')}
              />
              <button
                type="submit"
                className="roster-add-btn"
                disabled={!newName.trim() || (!!clash && !nickname.trim())}
              >
                {t('create.add')}
              </button>
            </form>

            {clash && (
              <label className="auth-field nickname-field">
                <span>{t('create.nicknameLabel')}</span>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t('create.nicknamePlaceholder')}
                />
                <small className="field-hint">{t('create.nicknameHint', { name: clash.label })}</small>
              </label>
            )}

            <div className="section-title">{t('create.whoReceives')}</div>
            <div className="theme-list">
              <button
                className={`theme-option${mode === 'top_winner' ? ' active' : ''}`}
                onClick={() => setMode('top_winner')}
              >
                <span className="theme-name">
                  {t('create.topWinner')}
                  <small>{t('create.topWinnerHint')}</small>
                </span>
                {mode === 'top_winner' && <span className="theme-check">✓</span>}
              </button>
              <button
                className={`theme-option${mode === 'fixed_player' ? ' active' : ''}`}
                onClick={() => setMode('fixed_player')}
                disabled={selectedPlayers.length === 0}
              >
                <span className="theme-name">
                  {t('create.fixedPlayer')}
                  <small>{t('create.fixedPlayerHint')}</small>
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
                <option value="">{t('create.choosePlayer')}</option>
                {selectedPlayers.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            )}

            <div className="section-title">{t('create.options')}</div>
            <label className="switch-row">
              <input
                type="checkbox"
                checked={shuffleSeats}
                onChange={(e) => setShuffleSeats(e.target.checked)}
              />
              <span>
                {t('create.shuffle')}
                <small>{t('create.shuffleHint')}</small>
              </span>
            </label>
            <label className="switch-row">
              <input
                type="checkbox"
                checked={allowGuestPayments}
                onChange={(e) => setAllowGuestPayments(e.target.checked)}
              />
              <span>
                {t('create.guestPayments')}
                <small>{t('create.guestPaymentsHint')}</small>
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
            {busy ? t('create.creating') : t('create.submit', { count: selectedPlayers.length })}
          </button>
        </div>
      </div>

      <EditRosterPlayerModal
        player={editingRoster}
        busy={editBusy}
        error={editError}
        onCancel={() => setEditingRoster(null)}
        onConfirm={handleRenameRoster}
      />

      <DeleteRosterPlayerModal
        player={deletingRoster}
        onCancel={() => setDeletingRoster(null)}
        onConfirm={handleDeleteRoster}
      />
    </div>
  )
}
