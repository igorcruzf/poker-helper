import { useState } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { useInstallPrompt } from './hooks/useInstallPrompt.js'
import { useUndoableLocalStorage } from './hooks/useUndoableLocalStorage.js'
import { useTheme } from './hooks/useTheme.js'
import { useBlindsTimer } from './hooks/useBlindsTimer.js'
import { computeSaldo, parseMoney } from './utils.js'

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
import EndGameModal from './components/EndGameModal.jsx'

const DEFAULT_BUYIN = 5.0

function uid() {
  return 'p_' + Math.random().toString(36).slice(2, 9)
}

export default function App() {
  const [state, setState, undo, canUndo] = useUndoableLocalStorage('poker-dos-meninos-v1', {
    buyIn: DEFAULT_BUYIN,
    players: [],
  })
  const [history, setHistory] = useLocalStorage('poker-dos-meninos-history-v1', [])
  const [theme, setTheme] = useTheme()
  const [copyEndsGame, setCopyEndsGame] = useLocalStorage('poker-copy-ends-game', true)
  const timer = useBlindsTimer()
  const { canInstall, promptInstall } = useInstallPrompt()
  const [view, setView] = useState('home') // 'home' | 'ranking'
  const [deletingPlayer, setDeletingPlayer] = useState(null)
  const [adjustingPlayer, setAdjustingPlayer] = useState(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [timerOpen, setTimerOpen] = useState(false)
  const [endGameOpen, setEndGameOpen] = useState(false)
  const [newPlayerId, setNewPlayerId] = useState(null)
  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  const [dragId, setDragId] = useState(null)

  const buyIn = state.buyIn
  const players = state.players

  function toggleSort(key) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' }
        : { key, dir: 'desc' }
    )
  }

  const sortedPlayers = (() => {
    if (!sort.key) return players
    const factor = sort.dir === 'asc' ? 1 : -1
    return [...players].sort((a, b) => {
      let av, bv
      if (sort.key === 'nome') {
        return factor * a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' })
      } else if (sort.key === 'cacifes') {
        av = a.cacifes
        bv = b.cacifes
      } else {
        av = computeSaldo(a, buyIn)
        bv = computeSaldo(b, buyIn)
      }
      return factor * (av - bv)
    })
  })()

  function sortArrow(key) {
    if (sort.key !== key) return ''
    return sort.dir === 'asc' ? ' ▲' : ' ▼'
  }

  function handleBuyInChange(raw) {
    const v = parseFloat(raw)
    setState((s) => ({ ...s, buyIn: isNaN(v) ? 0 : v }))
  }

  function handleBuyInBlur(raw) {
    const v = parseMoney(raw, { min: 0, fallback: 0 })
    setState((s) => ({ ...s, buyIn: v }))
  }

  // Drag-and-drop: só habilitado quando não há ordenação por coluna
  const dragEnabled = !sort.key

  function handleDragStart(e, id) {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e, targetId) {
    e.preventDefault()
    if (!dragId || dragId === targetId) return
    setState((s) => {
      const list = [...s.players]
      const from = list.findIndex((p) => p.id === dragId)
      const to = list.findIndex((p) => p.id === targetId)
      if (from === -1 || to === -1) return s
      const [moved] = list.splice(from, 1)
      list.splice(to, 0, moved)
      return { ...s, players: list }
    })
    setDragId(null)
  }

  function handleDragEnd() {
    setDragId(null)
  }

  function endGame() {
    if (players.length === 0) return
    const snapshot = {
      id: 'n_' + Date.now(),
      date: Date.now(),
      buyIn,
      players: players.map((p) => ({
        name: p.name,
        cacifes: p.cacifes,
        saldo: computeSaldo(p, buyIn),
      })),
    }
    setHistory((h) => [...h, snapshot])
    setState((s) => ({
      ...s,
      players: s.players.map((p) => ({ ...p, cacifes: 1, adjustment: 0 })),
    }))
  }

  function confirmEndGame() {
    endGame()
    setEndGameOpen(false)
  }

  function deleteNight(id) {
    setHistory((h) => h.filter((n) => n.id !== id))
  }

  function clearHistory() {
    setHistory([])
  }

  function addPlayer() {
      const id = uid()
      const name = 'Jogador ' + (players.length + 1)
      setState((s) => ({
        ...s,
        players: [...s.players, { id, name, cacifes: 1, adjustment: 0 }],
      }))
      setNewPlayerId(id)
   }

  function renamePlayer(id, name) {
    setState((s) => ({
      ...s,
      players: s.players.map((p) => (p.id === id ? { ...p, name } : p)),
    }))
  }

  function changeCacife(id, delta) {
    setState((s) => ({
      ...s,
      players: s.players.map((p) =>
        p.id === id ? { ...p, cacifes: Math.max(0, p.cacifes + delta) } : p
      ),
    }))
  }

  function confirmDelete(player) {
    setState((s) => ({ ...s, players: s.players.filter((p) => p.id !== player.id) }))
    setDeletingPlayer(null)
  }

  function confirmAdjust(id, delta) {
    setState((s) => ({
      ...s,
      players: s.players.map((p) =>
        p.id === id ? { ...p, adjustment: (p.adjustment || 0) + delta } : p
      ),
    }))
    setAdjustingPlayer(null)
  }

  function resetFull() {
    setState({ buyIn: DEFAULT_BUYIN, players: [] })
    setResetOpen(false)
  }

  function resetKeepPlayers() {
    setState((s) => ({
      ...s,
      players: s.players.map((p) => ({ ...p, cacifes: 1, adjustment: 0 })),
    }))
    setResetOpen(false)
  }

  const total = players.reduce((acc, p) => acc + computeSaldo(p, buyIn), 0)

  return (
    <div className="app-shell">
      <div className="app">
        <Header
          onOpenRanking={() => setView('ranking')}
          onOpenReset={() => setResetOpen(true)}
          onOpenTimer={() => setTimerOpen(true)}
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

      <EndGameModal
        open={endGameOpen}
        onCancel={() => setEndGameOpen(false)}
        onConfirm={confirmEndGame}
      />
    </div>
  )
}
