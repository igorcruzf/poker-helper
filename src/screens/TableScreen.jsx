import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useBlindsTimer } from '../hooks/useBlindsTimer.js'
import { useTimeBank } from '../hooks/useTimeBank.js'
import { useTable } from '../hooks/useTable.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroups } from '../hooks/useGroups.jsx'
import { useModals } from '../hooks/useModals.js'
import { useSortedPlayers } from '../hooks/useSortedPlayers.js'
import { useDragReorder } from '../hooks/useDragReorder.js'
import { useGroupPeople, pixByTablePlayer } from '../hooks/useGroupPeople.js'
import { buildSummaryText, copyText, liveUrlFor, shareUrlFor } from '../lib/summary.js'
import { useI18n } from '../hooks/useI18n.js'

import AppChrome from '../components/AppChrome.jsx'
import BackBar from '../components/BackBar.jsx'
import ScreenStatus from '../components/ScreenStatus.jsx'
import BuyInRow from '../components/BuyInRow.jsx'
import PlayerRow from '../components/PlayerRow.jsx'
import TotalRow from '../components/TotalRow.jsx'
import DeleteModal from '../components/DeleteModal.jsx'
import AdjustModal from '../components/AdjustModal.jsx'
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
    table, players, buyIn, rebuy, total, loading, error,
    addPlayer, changeCacife, deletePlayer, adjustPlayer, reorderPlayers,
    previewSettlement, endGame, undo, canUndo, saveTimerState, reload,
  } = useTable(id)

  const { t } = useI18n()
  const { isHost, activeGroupId } = useGroups()
  const people = useGroupPeople(activeGroupId)
  const timer = useBlindsTimer(saveTimerState)
  const timeBank = useTimeBank()
  const {
    deletingPlayer, setDeletingPlayer,
    adjustingPlayer, setAdjustingPlayer,
    timerOpen, setTimerOpen,
    timeBankOpen, setTimeBankOpen,
    endGameOpen, setEndGameOpen,
  } = useModals()
  const [addOpen, setAddOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const { sort, sortedPlayers, toggleSort, sortArrow, dragEnabled } = useSortedPlayers(players, buyIn, rebuy)
  const { dragId, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragReorder(reorderPlayers)

  // Mesa encerrada não é mais editável: vai direto para o acerto.
  useEffect(() => {
    if (table?.status === 'finished') navigate(`/mesa/${id}/acerto`, { replace: true })
  }, [table?.status, id, navigate])

  // Quem é membro do grupo mas não host acompanha pela tela pública — o RLS
  // recusaria as escritas daqui de qualquer jeito.
  useEffect(() => {
    if (table && !isHost) navigate(`/ao-vivo/${table.share_token}`, { replace: true })
  }, [table, isHost, navigate])

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
        rebuy,
        collectorId: previewSettlement(balanceMode).collectorId,
        pix: pixByTablePlayer(players, people.pixByPlayerId),
        shareUrl: withLink ? shareUrlFor(table.share_token) : '',
      })
    )
    const { error } = await endGame(balanceMode)
    await copied
    setEndGameOpen(false)
    if (!error) navigate(`/mesa/${id}/acerto`, { replace: true })
  }

  if (loading || error || !table) {
    return (
      <div className="app-shell">
        <div className="app">
          <BackBar to="/" title={t('settle.myTables')} />
          <ScreenStatus loading={loading} error={error || (!table && true)} onRetry={reload} />
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="app">
        <AppChrome
          onOpenRanking={() => navigate('/ranking')}
          onOpenTables={() => navigate('/')}
          onLogout={signOut}
          userEmail={user?.email}
          subtitle={table.name}
          onShare={() => setShareOpen(true)}
        />

        <BackBar to="/" title={t('settle.myTables')} />

        {timer.active && (
          <button
            className={`timer-bar${timer.awaitingConfirm ? ' alert' : ''}`}
            onClick={() => setTimerOpen(true)}
            title={t('table.openTimer')}
          >
            <span className="timer-bar-time">
              {String(Math.floor(timer.secondsLeft / 60)).padStart(2, '0')}:
              {String(timer.secondsLeft % 60).padStart(2, '0')}
            </span>
            <span className="timer-bar-info">
              {t('table.level', { level: timer.level + 1, small: timer.smallBlind, big: timer.bigBlind })}
            </span>
            {timer.awaitingConfirm && <span className="timer-bar-flag">{t('table.confirmFlag')}</span>}
          </button>
        )}

        {(timeBank.running || timeBank.done) && (
          <button
            className={`timer-bar${timeBank.done ? ' alert' : ''}`}
            onClick={() => setTimeBankOpen(true)}
            title={t('table.openTimeBank')}
          >
            <span className="timer-bar-time">{String(timeBank.secondsLeft).padStart(2, '0')}</span>
            <span className="timer-bar-info">{t('table.timeBank')}</span>
            {timeBank.done && <span className="timer-bar-flag">{t('table.timeBankOver')}</span>}
          </button>
        )}

        <div className="rail">
          <div className="card">
            <BuyInRow buyIn={buyIn} rebuy={rebuy} />

            {players.length > 0 && (
              <div className="col-labels">
                <span></span>
                <span
                  className={`sortable${sort.key === 'nome' ? ' active' : ''}`}
                  onClick={() => toggleSort('nome')}
                >
                  {t('table.name')}{sortArrow('nome')}
                </span>
                <span
                  className={`sortable${sort.key === 'cacifes' ? ' active' : ''}`}
                  onClick={() => toggleSort('cacifes')}
                >
                  {t('table.cacifes')}{sortArrow('cacifes')}
                </span>
                <span
                  className={`sortable${sort.key === 'saldo' ? ' active' : ''}`}
                  onClick={() => toggleSort('saldo')}
                >
                  {t('table.saldo')}{sortArrow('saldo')}
                </span>
              </div>
            )}

            <div className="players">
              {sortedPlayers.map((p) => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  buyIn={buyIn}
                  rebuy={rebuy}
                  onCacifeChange={changeCacife}
                  onDelete={setDeletingPlayer}
                  onOpenAdjust={setAdjustingPlayer}
                  photo={people.byPlayerId[p.player_id]?.photo}
                  onOpenProfile={(pl) => {
                    const route = people.routeFor(pl.player_id)
                    if (route) navigate(route)
                  }}
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
                {t('table.empty')}<br />{t('table.emptyHint')}
              </div>
            )}

            {players.length > 0 && <TotalRow total={total} />}
          </div>
        </div>

        <div className="table-dock">
          {canUndo && (
            <button className="undo-strip" onClick={undo} title={t('table.undo')}>
              {t('table.undo')}
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
        rebuy={rebuy}
        onCancel={() => setAdjustingPlayer(null)}
        onConfirm={(pid, delta) => { adjustPlayer(pid, delta); setAdjustingPlayer(null) }}
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
