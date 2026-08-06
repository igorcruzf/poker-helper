import { useState } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { useInstallPrompt } from './hooks/useInstallPrompt.js'
import { useTheme } from './hooks/useTheme.js'
import { useBlindsTimer } from './hooks/useBlindsTimer.js'
import { useTimeBank } from './hooks/useTimeBank.js'
import { usePlayers } from './hooks/usePlayers.js'
import { useHistory } from './hooks/useHistory.js'
import { useModals } from './hooks/useModals.js'
import { useSortedPlayers } from './hooks/useSortedPlayers.js'
import { useDragReorder } from './hooks/useDragReorder.js'

import Header from './components/Header.jsx'
import BuyInRow from './components/BuyInRow.jsx'
import PlayerRow from './components/PlayerRow.jsx'
import TotalRow from './components/TotalRow.jsx'
import DeleteModal from './components/DeleteModal.jsx'
import AdjustModal from './components/AdjustModal.jsx'
import ExportModal from './components/ExportModal.jsx'
import ResetModal from './components/ResetModal.jsx'
import HandRankingScreen from './components/HandRankingScreen.jsx'
import ThemeModal from './components/ThemeModal.jsx'
import HistoryModal from './components/HistoryModal.jsx'
import StatsModal from './components/StatsModal.jsx'
import BlindsTimerModal from './components/BlindsTimer.jsx'
import TimeBankModal from './components/TimeBankModal.jsx'
import EndGameModal from './components/EndGameModal.jsx'

export default function App() {
  const { history, addNight, deleteNight, clearHistory } = useHistory()
  const {
    buyIn,
    players,
    total,
    handleBuyInChange,
    handleBuyInBlur,
    addPlayer: addPlayerToState,
    renamePlayer,
    changeCacife,
    deletePlayer,
    adjustPlayer,
    reorderPlayers,
    endGame,
    resetFull: resetFullState,
    resetKeepPlayers: resetKeepPlayersState,
    undo,
    canUndo,
  } = usePlayers(addNight)
  const [theme, setTheme] = useTheme()
  const [copyEndsGame, setCopyEndsGame] = useLocalStorage('poker-copy-ends-game', true)
  const timer = useBlindsTimer()
  const timeBank = useTimeBank()
  const { canInstall, promptInstall } = useInstallPrompt()
  const [view, setView] = useState('home') // 'home' | 'ranking'
  const {
    deletingPlayer, setDeletingPlayer,
    adjustingPlayer, setAdjustingPlayer,
    exportOpen, setExportOpen,
    resetOpen, setResetOpen,
    themeOpen, setThemeOpen,
    historyOpen, setHistoryOpen,
    statsOpen, setStatsOpen,
    timerOpen, setTimerOpen,
    timeBankOpen, setTimeBankOpen,
    endGameOpen, setEndGameOpen,
  } = useModals()
  const [newPlayerId, setNewPlayerId] = useState(null)
  const { sort, sortedPlayers, toggleSort, sortArrow, dragEnabled } = useSortedPlayers(players, buyIn)
  const { dragId, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragReorder(reorderPlayers)

  function addPlayer() {
    const id = addPlayerToState()
    setNewPlayerId(id)
  }

  function confirmEndGame() {
    endGame()
    setEndGameOpen(false)
  }

  function confirmDelete(player) {
    deletePlayer(player.id)
    setDeletingPlayer(null)
  }

  function confirmAdjust(id, delta) {
    adjustPlayer(id, delta)
    setAdjustingPlayer(null)
  }

  function resetFull() {
    resetFullState()
    setResetOpen(false)
  }

  function resetKeepPlayers() {
    resetKeepPlayersState()
    setResetOpen(false)
  }

  return (
    <div className="app-shell">
      <div className="app">
        <Header
          onOpenRanking={() => setView('ranking')}
          onOpenReset={() => setResetOpen(true)}
          onOpenTimer={() => setTimerOpen(true)}
          onOpenTimeBank={() => setTimeBankOpen(true)}
          onOpenHistory={() => setHistoryOpen(true)}
          onOpenStats={() => setStatsOpen(true)}
          onOpenThemes={() => setThemeOpen(true)}
          onEndNight={() => setEndGameOpen(true)}
          canInstall={canInstall}
          onInstall={promptInstall}
        />

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

        {view === 'ranking' ? (
          <HandRankingScreen onBack={() => setView('home')} />
        ) : (
          <>
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
                      onRename={renamePlayer}
                      onCacifeChange={changeCacife}
                      onDelete={setDeletingPlayer}
                      onOpenAdjust={setAdjustingPlayer}
                      autoFocus={p.id === newPlayerId}
                      onFocused={() => setNewPlayerId(null)}
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
                    Nenhum jogador ainda.<br />Toque em "Novo jogador" abaixo para adicionar o primeiro.
                  </div>
                )}

                {players.length > 0 && <TotalRow total={total} />}
              </div>
            </div>

            <div className="footer-actions">
              <button className="add-player-btn" onClick={addPlayer}>Novo jogador</button>
              <button className="export-btn" title="Exportar resumo" onClick={() => setExportOpen(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                Copiar resumo
              </button>
            </div>
          </>
        )}
      </div>

      {canUndo && (
        <button className="undo-fab" onClick={undo} title="Desfazer última ação">
          ↩ Desfazer
        </button>
      )}

      <DeleteModal
        player={deletingPlayer}
        onCancel={() => setDeletingPlayer(null)}
        onConfirm={confirmDelete}
      />

      <AdjustModal
        player={adjustingPlayer}
        buyIn={buyIn}
        onCancel={() => setAdjustingPlayer(null)}
        onConfirm={confirmAdjust}
      />

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        buyIn={buyIn}
        players={players}
        copyEndsGame={copyEndsGame}
        setCopyEndsGame={setCopyEndsGame}
        onEndGame={endGame}
      />

      <ResetModal
        open={resetOpen}
        onCancel={() => setResetOpen(false)}
        onResetFull={resetFull}
        onResetKeepPlayers={resetKeepPlayers}
      />

      <ThemeModal
        open={themeOpen}
        theme={theme}
        onSelect={setTheme}
        onClose={() => setThemeOpen(false)}
      />

      <HistoryModal
        open={historyOpen}
        history={history}
        onClose={() => setHistoryOpen(false)}
        onDelete={deleteNight}
        onClearAll={clearHistory}
      />

      <StatsModal
        open={statsOpen}
        history={history}
        onClose={() => setStatsOpen(false)}
      />

      <BlindsTimerModal
        open={timerOpen}
        timer={timer}
        onClose={() => setTimerOpen(false)}
      />

      <TimeBankModal
        open={timeBankOpen}
        timeBank={timeBank}
        onClose={() => setTimeBankOpen(false)}
      />

      <EndGameModal
        open={endGameOpen}
        onCancel={() => setEndGameOpen(false)}
        onConfirm={confirmEndGame}
      />
    </div>
  )
}
