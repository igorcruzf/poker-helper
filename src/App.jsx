import { useState } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { computeSaldo } from './utils.js'

import Header from './components/Header.jsx'
import BuyInRow from './components/BuyInRow.jsx'
import PlayerRow from './components/PlayerRow.jsx'
import TotalRow from './components/TotalRow.jsx'
import DeleteModal from './components/DeleteModal.jsx'
import AdjustModal from './components/AdjustModal.jsx'
import ExportModal from './components/ExportModal.jsx'
import ResetModal from './components/ResetModal.jsx'
import HandRankingScreen from './components/HandRankingScreen.jsx'

const DEFAULT_BUYIN = 5.0

function uid() {
  return 'p_' + Math.random().toString(36).slice(2, 9)
}

export default function App() {
  const [state, setState] = useLocalStorage('poker-dos-meninos-v1', {
    buyIn: DEFAULT_BUYIN,
    players: [],
  })

  const [view, setView] = useState('home') // 'home' | 'ranking'
  const [deletingPlayer, setDeletingPlayer] = useState(null)
  const [adjustingPlayer, setAdjustingPlayer] = useState(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  const buyIn = state.buyIn
  const players = state.players

  function handleBuyInChange(raw) {
    const v = parseFloat(raw)
    setState((s) => ({ ...s, buyIn: isNaN(v) ? 0 : v }))
  }

  function addPlayer() {
    const name = 'Jogador ' + (players.length + 1)
    setState((s) => ({
      ...s,
      players: [...s.players, { id: uid(), name, cacifes: 1, adjustment: 0 }],
    }))
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
        />

        {view === 'ranking' ? (
          <HandRankingScreen onBack={() => setView('home')} />
        ) : (
          <>
            <div className="rail">
              <div className="card">
                <BuyInRow buyIn={buyIn} onChange={handleBuyInChange} />

                {players.length > 0 && (
                  <div className="col-labels">
                    <span></span>
                    <span>Nome</span>
                    <span>Cacifes</span>
                    <span>Saldo</span>
                  </div>
                )}

                <div className="players">
                  {players.map((p) => (
                    <PlayerRow
                      key={p.id}
                      player={p}
                      buyIn={buyIn}
                      onRename={renamePlayer}
                      onCacifeChange={changeCacife}
                      onDelete={setDeletingPlayer}
                      onOpenAdjust={setAdjustingPlayer}
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
      />

      <ResetModal
        open={resetOpen}
        onCancel={() => setResetOpen(false)}
        onResetFull={resetFull}
        onResetKeepPlayers={resetKeepPlayers}
      />
    </div>
  )
}
