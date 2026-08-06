import { useUndoableLocalStorage } from './useUndoableLocalStorage.js'
import { computeSaldo, parseMoney } from '../utils.js'

const DEFAULT_BUYIN = 5.0

function uid() {
  return 'p_' + Math.random().toString(36).slice(2, 9)
}

// Owns the live table state (buy-in + players) and every mutation on it.
// `onEndGame` is called with a history snapshot right before cacifes/adjustments reset.
export function usePlayers(onEndGame) {
  const [state, setState, undo, canUndo] = useUndoableLocalStorage('poker-dos-meninos-v1', {
    buyIn: DEFAULT_BUYIN,
    players: [],
  })

  const buyIn = state.buyIn
  const players = state.players

  function handleBuyInChange(raw) {
    const v = parseFloat(raw)
    setState((s) => ({ ...s, buyIn: isNaN(v) ? 0 : v }))
  }

  function handleBuyInBlur(raw) {
    const v = parseMoney(raw, { min: 0, fallback: 0 })
    setState((s) => ({ ...s, buyIn: v }))
  }

  function addPlayer() {
    const id = uid()
    const name = 'Jogador ' + (players.length + 1)
    setState((s) => ({
      ...s,
      players: [...s.players, { id, name, cacifes: 1, adjustment: 0 }],
    }))
    return id
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

  function deletePlayer(id) {
    setState((s) => ({ ...s, players: s.players.filter((p) => p.id !== id) }))
  }

  function adjustPlayer(id, delta) {
    setState((s) => ({
      ...s,
      players: s.players.map((p) =>
        p.id === id ? { ...p, adjustment: (p.adjustment || 0) + delta } : p
      ),
    }))
  }

  function reorderPlayers(fromId, toId) {
    setState((s) => {
      const list = [...s.players]
      const from = list.findIndex((p) => p.id === fromId)
      const to = list.findIndex((p) => p.id === toId)
      if (from === -1 || to === -1) return s
      const [moved] = list.splice(from, 1)
      list.splice(to, 0, moved)
      return { ...s, players: list }
    })
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
    onEndGame(snapshot)
    setState((s) => ({
      ...s,
      players: s.players.map((p) => ({ ...p, cacifes: 1, adjustment: 0 })),
    }))
  }

  function resetFull() {
    setState({ buyIn: DEFAULT_BUYIN, players: [] })
  }

  function resetKeepPlayers() {
    setState((s) => ({
      ...s,
      players: s.players.map((p) => ({ ...p, cacifes: 1, adjustment: 0 })),
    }))
  }

  const total = players.reduce((acc, p) => acc + computeSaldo(p, buyIn), 0)

  return {
    buyIn,
    players,
    total,
    handleBuyInChange,
    handleBuyInBlur,
    addPlayer,
    renamePlayer,
    changeCacife,
    deletePlayer,
    adjustPlayer,
    reorderPlayers,
    endGame,
    resetFull,
    resetKeepPlayers,
    undo,
    canUndo,
  }
}
