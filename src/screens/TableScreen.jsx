import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useInstallPrompt } from '../hooks/useInstallPrompt.js'
import { useTheme } from '../hooks/useTheme.js'
import { useBlindsTimer } from '../hooks/useBlindsTimer.js'
import { useTimeBank } from '../hooks/useTimeBank.js'
import { useTable } from '../hooks/useTable.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { useModals } from '../hooks/useModals.js'
import { useSortedPlayers } from '../hooks/useSortedPlayers.js'
import { useDragReorder } from '../hooks/useDragReorder.js'
import { onPendingChange } from '../lib/syncQueue.js'
import { buildSummaryText, copyText, liveUrlFor, shareUrlFor } from '../lib/summary.js'

import Header from '../components/Header.jsx'
import BuyInRow from '../components/BuyInRow.jsx'
import PlayerRow from '../components/PlayerRow.jsx'
import TotalRow from '../components/TotalRow.jsx'
import DeleteModal from '../components/DeleteModal.jsx'
import AdjustModal from '../components/AdjustModal.jsx'
import ThemeModal from '../components/ThemeModal.jsx'
import BlindsTimerModal from '../components/BlindsTimer.jsx'
import TimeBankModal from '../components/TimeBankModal.jsx'
import EndGameModal from '../components/EndGameModal.jsx'
import AddPlayerModal from '../components/AddPlayerModal.jsx'
import TableActionsBar from '../components/TableActionsBar.jsx'
import ShareTableModal from '../components/ShareTableModal.jsx'

export default function TableScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { signOut, user } = useAuth()
  const {
    table, players, buyIn, total, loading, error,
    handleBuyInChange, handleBuyInBlur,
    addPlayer, changeCacife, deletePlayer, adjustPlayer, reorderPlayers,
    previewSettlement, endGame, undo, canUndo, saveTimerState,
  } = useTable(id)

  const [theme, setTheme] = useTheme()
  const timer = useBlindsTimer(saveTimerState)
  const timeBank = useTimeBank()
  const { canInstall, promptInstall } = useInstallPrompt()
  const {
    deletingPlayer, setDeletingPlayer,
    adjustingPlayer, setAdjustingPlayer,
    themeOpen, setThemeOpen,
    timerOpen, setTimerOpen,
    timeBankOpen, setTimeBankOpen,
    endGameOpen, setEndGameOpen,
  } = useModals()
  const [addOpen, setAddOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [pending, setPending] = useState(0)
  const { sort, sortedPlayers, toggleSort, sortArrow, dragEnabled } = useSortedPlayers(players, buyIn)
  const { dragId, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragReorder(reorderPlayers)

  useEffect(() => onPendingChange(setPending), [])

  // Mesa encerrada não é mais editável: vai direto para o acerto.
  useEffect(() => {
    if (table?.status === 'finished') navigate(`/mesa/${id}/acerto`, { replace: true })
  }, [table?.status, id, navigate])

  async function handleAddPlayer({ name, playerId }) {
    await addPlayer({ name, playerId })
    setAddOpen(false)
  }

  async function confirmEndGame(balanceMode, withLink) {
    // Copia antes do await: alguns navegadores só liberam a área de
    // transferência dentro do clique, e a gravação no banco quebraria isso.
    const copied = copyText(
      buildSummaryText(players, buyIn, {
        balanceMode,
        withSettlement: true,
        settlementMode: table.settlement_mode,
        collectorId: previewSettlement(balanceMode).collectorId,
        shareUrl: withLink ? shareUrlFor(table.share_token) : '',
      })
    )
    const { error } = await endGame(balanceMode)
    await copied
    setEndGameOpen(false)
    if (!error) navigate(`/mesa/${id}/acerto`, { replace: true })
  }

  if (loading) {
    return (
      <div className="app-shell">
        <div className="app"><div className="empty-state">Carregando mesa…</div></div>
      </div>
    )
  }

  if (error || !table) {
    return (
      <div className="app-shell">
        <div className="app">
          <div className="empty-state">Não foi possível abrir a mesa.<br />{error}</div>
          <div className="footer-actions">
            <button className="add-player-btn" onClick={() => navigate('/')}>Minhas mesas</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="app">
        <Header
          onOpenRanking={() => navigate('/ranking')}
          onOpenTables={() => navigate('/')}
          onOpenThemes={() => setThemeOpen(true)}
          onLogout={signOut}
          userEmail={user?.email}
          canInstall={canInstall}
          onInstall={promptInstall}
          subtitle={table.name}
          onShare={() => setShareOpen(true)}
        />

        {pending > 0 && (
          <div className="sync-flag">Sem conexão — {pending} alteração(ões) serão salvas ao voltar.</div>
        )}

        {timer.active && (
          <button
            className={`timer-bar${timer.awaitingConfirm ? ' alert' : ''}`}
            onClick={() => setTimerOpen(true)}
            title="Abrir timer de blinds"
          >
            <span className="timer-bar-time">
              {String(Math.floor(timer.secondsLeft / 60)).padStart(2, '0')}:
              {String(timer.secondsLeft % 60).padStart(2, '0')}
            </span>
            <span className="timer-bar-info">
              Nível {timer.level + 1} · {timer.smallBlind}/{timer.bigBlind}
            </span>
            {timer.awaitingConfirm && <span className="timer-bar-flag">⏰ Confirmar</span>}
          </button>
        )}

        {(timeBank.running || timeBank.done) && (
          <button
            className={`timer-bar${timeBank.done ? ' alert' : ''}`}
            onClick={() => setTimeBankOpen(true)}
            title="Abrir time bank"
          >
            <span className="timer-bar-time">{String(timeBank.secondsLeft).padStart(2, '0')}</span>
            <span className="timer-bar-info">Time bank</span>
            {timeBank.done && <span className="timer-bar-flag">⏰ Esgotado</span>}
          </button>
        )}

        <div className="rail">
          <div className="card">
            <BuyInRow buyIn={buyIn} onChange={handleBuyInChange} onBlur={handleBuyInBlur} />

            {players.length > 0 && (
              <div className="col-labels">
                <span></span>
                <span
                  className={`sortable${sort.key === 'nome' ? ' active' : ''}`}
                  onClick={() => toggleSort('nome')}
                >
                  Nome{sortArrow('nome')}
                </span>
                <span
                  className={`sortable${sort.key === 'cacifes' ? ' active' : ''}`}
                  onClick={() => toggleSort('cacifes')}
                >
                  Cacifes{sortArrow('cacifes')}
                </span>
                <span
                  className={`sortable${sort.key === 'saldo' ? ' active' : ''}`}
                  onClick={() => toggleSort('saldo')}
                >
                  Saldo{sortArrow('saldo')}
                </span>
              </div>
            )}

            <div className="players">
              {sortedPlayers.map((p) => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  buyIn={buyIn}
                  onCacifeChange={changeCacife}
                  onDelete={setDeletingPlayer}
                  onOpenAdjust={setAdjustingPlayer}
                  dragEnabled={dragEnabled}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  isDragging={dragId === p.id}
                />
              ))}
            </div>

            {players.length === 0 && (
              <div className="empty-state">
                Nenhum jogador na mesa.<br />Toque em "Jogador" na barra abaixo para adicionar.
              </div>
            )}

            {players.length > 0 && <TotalRow total={total} />}
          </div>
        </div>

        <div className="table-dock">
          {canUndo && (
            <button className="undo-strip" onClick={undo} title="Desfazer última ação">
              ↩ Desfazer última ação
            </button>
          )}
          <TableActionsBar
            onAddPlayer={() => setAddOpen(true)}
            onOpenTimer={() => setTimerOpen(true)}
            onOpenTimeBank={() => setTimeBankOpen(true)}
            onEndGame={() => setEndGameOpen(true)}
            timerActive={timer.active}
            timeBankActive={timeBank.running || timeBank.done}
          />
        </div>
      </div>

      <ShareTableModal
        open={shareOpen}
        url={liveUrlFor(table.share_token)}
        onClose={() => setShareOpen(false)}
      />

      <AddPlayerModal
        open={addOpen}
        tablePlayers={players}
        onCancel={() => setAddOpen(false)}
        onConfirm={handleAddPlayer}
      />

      <DeleteModal
        player={deletingPlayer}
        onCancel={() => setDeletingPlayer(null)}
        onConfirm={(p) => { deletePlayer(p.id); setDeletingPlayer(null) }}
      />

      <AdjustModal
        player={adjustingPlayer}
        buyIn={buyIn}
        onCancel={() => setAdjustingPlayer(null)}
        onConfirm={(pid, delta) => { adjustPlayer(pid, delta); setAdjustingPlayer(null) }}
      />

      <ThemeModal
        open={themeOpen}
        theme={theme}
        onSelect={setTheme}
        onClose={() => setThemeOpen(false)}
      />

      <BlindsTimerModal open={timerOpen} timer={timer} onClose={() => setTimerOpen(false)} />

      <TimeBankModal open={timeBankOpen} timeBank={timeBank} onClose={() => setTimeBankOpen(false)} />

      <EndGameModal
        open={endGameOpen}
        players={players}
        total={total}
        previewFor={previewSettlement}
        guestPayments={table.allow_guest_payments}
        onCancel={() => setEndGameOpen(false)}
        onConfirm={confirmEndGame}
      />
    </div>
  )
}
