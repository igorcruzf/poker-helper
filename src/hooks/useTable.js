import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { reportResult, saveRow } from '../lib/syncQueue.js'
import {
  EPS,
  balancePlayers,
  buildSettlement,
  round2,
  settlementFromBalances,
} from '../lib/settlement.js'
import { cacifesCost, computeSaldo } from '../utils.js'

const TABLE_SELECT = `
  id, name, buy_in, rebuy_value, status, settlement_mode, settlement_player_id,
  share_token, allow_guest_payments, created_at, finished_at,
  table_players ( id, player_id, name, cacifes, adjustment, position ),
  settlements ( id, from_table_player_id, to_table_player_id, amount, paid, paid_at )
`

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  // Fallback para navegadores antigos: uuid v4 na unha.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function normalizePlayers(rows) {
  return [...(rows || [])]
    .sort((a, b) => a.position - b.position)
    .map((p) => ({
      id: p.id,
      player_id: p.player_id,
      name: p.name,
      cacifes: Number(p.cacifes),
      adjustment: Number(p.adjustment),
      position: p.position,
    }))
}

// Estado vivo de uma mesa. O Supabase é a fonte da verdade: a UI atualiza na
// hora e a escrita vai atrás (com debounce por linha). Se a rede cair, o
// syncQueue segura o patch e reenvia depois.
export function useTable(tableId) {
  const [table, setTable] = useState(null)
  const [players, setPlayers] = useState([])
  const [settlements, setSettlements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [canUndo, setCanUndo] = useState(false)

  const playersRef = useRef([])
  const buyInRef = useRef(0)
  const past = useRef([])
  const timers = useRef({})
  const patches = useRef({})

  const load = useCallback(async () => {
    if (!supabase || !tableId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('poker_tables')
      .select(TABLE_SELECT)
      .eq('id', tableId)
      .single()
    reportResult(error)
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    const list = normalizePlayers(data.table_players)
    playersRef.current = list
    buyInRef.current = Number(data.buy_in)
    setTable(data)
    setPlayers(list)
    setSettlements(data.settlements || [])
    setError(null)
    setLoading(false)
  }, [tableId])

  useEffect(() => {
    load()
  }, [load])

  // --- persistência -------------------------------------------------------

  const scheduleSave = useCallback((tableName, id, patch, delay = 500) => {
    const key = `${tableName}:${id}`
    patches.current[key] = { ...(patches.current[key] || {}), ...patch }
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(() => {
      const body = patches.current[key]
      delete patches.current[key]
      delete timers.current[key]
      if (body) saveRow(tableName, id, body)
    }, delay)
  }, [])

  const flushSaves = useCallback(async () => {
    const keys = Object.keys(patches.current)
    await Promise.all(
      keys.map((key) => {
        clearTimeout(timers.current[key])
        delete timers.current[key]
        const body = patches.current[key]
        delete patches.current[key]
        const [tableName, id] = key.split(':')
        return saveRow(tableName, id, body)
      })
    )
  }, [])

  useEffect(() => () => {
    // Ao sair da tela, manda o que ainda estiver represado.
    Object.keys(patches.current).forEach((key) => {
      clearTimeout(timers.current[key])
      const [tableName, id] = key.split(':')
      saveRow(tableName, id, patches.current[key])
    })
    patches.current = {}
    timers.current = {}
  }, [])

  // --- undo ---------------------------------------------------------------

  function pushUndo() {
    past.current.push({
      players: playersRef.current.map((p) => ({ ...p })),
      buyIn: buyInRef.current,
    })
    if (past.current.length > 40) past.current.shift()
    setCanUndo(true)
  }

  function applyPlayers(next, { undoable = true } = {}) {
    if (undoable) pushUndo()
    playersRef.current = next
    setPlayers(next)
  }

  async function undo() {
    const prev = past.current.pop()
    setCanUndo(past.current.length > 0)
    if (!prev) return

    const current = playersRef.current
    playersRef.current = prev.players
    setPlayers(prev.players)

    const prevIds = new Set(prev.players.map((p) => p.id))
    const currentIds = new Set(current.map((p) => p.id))

    // Linhas que o undo traz de volta (desfazer uma exclusão).
    const toInsert = prev.players.filter((p) => !currentIds.has(p.id))
    if (toInsert.length > 0) {
      await supabase.from('table_players').insert(
        toInsert.map((p) => ({
          id: p.id,
          table_id: tableId,
          player_id: p.player_id,
          name: p.name,
          cacifes: p.cacifes,
          adjustment: p.adjustment,
          position: p.position,
        }))
      )
    }

    // Linhas criadas depois do snapshot (desfazer uma inclusão).
    const toDelete = current.filter((p) => !prevIds.has(p.id))
    if (toDelete.length > 0) {
      await supabase.from('table_players').delete().in('id', toDelete.map((p) => p.id))
    }

    // Linhas que existem dos dois lados mas mudaram.
    prev.players.forEach((p) => {
      const before = current.find((c) => c.id === p.id)
      if (!before) return
      if (
        before.cacifes !== p.cacifes ||
        before.adjustment !== p.adjustment ||
        before.name !== p.name ||
        before.position !== p.position
      ) {
        scheduleSave(
          'table_players',
          p.id,
          { cacifes: p.cacifes, adjustment: p.adjustment, name: p.name, position: p.position },
          0
        )
      }
    })
  }

  // --- mutações -----------------------------------------------------------

  async function addPlayer({ name, playerId } = {}) {
    const id = newId()
    const position = playersRef.current.length
    const row = {
      id,
      player_id: playerId || null,
      name: name || 'Jogador ' + (position + 1),
      cacifes: 1,
      adjustment: 0,
      position,
    }
    applyPlayers([...playersRef.current, row])
    const { error } = await supabase.from('table_players').insert({ ...row, table_id: tableId })
    if (error) {
      setError(error.message)
      // Desfaz o otimismo e tira o passo da pilha: nunca existiu.
      past.current.pop()
      setCanUndo(past.current.length > 0)
      applyPlayers(playersRef.current.filter((p) => p.id !== id), { undoable: false })
      return null
    }
    return id
  }

  function renamePlayer(id, name) {
    applyPlayers(playersRef.current.map((p) => (p.id === id ? { ...p, name } : p)))
    scheduleSave('table_players', id, { name }, 700)
  }

  function changeCacife(id, delta) {
    let next = null
    applyPlayers(
      playersRef.current.map((p) => {
        if (p.id !== id) return p
        next = Math.max(0, p.cacifes + delta)
        return { ...p, cacifes: next }
      })
    )
    if (next !== null) scheduleSave('table_players', id, { cacifes: next })
  }

  function adjustPlayer(id, delta) {
    let next = null
    applyPlayers(
      playersRef.current.map((p) => {
        if (p.id !== id) return p
        next = (p.adjustment || 0) + delta
        return { ...p, adjustment: next }
      })
    )
    if (next !== null) scheduleSave('table_players', id, { adjustment: next })
  }

  async function deletePlayer(id) {
    applyPlayers(playersRef.current.filter((p) => p.id !== id))
    await supabase.from('table_players').delete().eq('id', id)
  }

  function reorderPlayers(fromId, toId) {
    const before = playersRef.current
    const list = [...before]
    const from = list.findIndex((p) => p.id === fromId)
    const to = list.findIndex((p) => p.id === toId)
    if (from === -1 || to === -1) return
    const [moved] = list.splice(from, 1)
    list.splice(to, 0, moved)
    const renumbered = list.map((p, i) => ({ ...p, position: i }))
    applyPlayers(renumbered)
    renumbered.forEach((p, i) => {
      if (before[i]?.id !== p.id) scheduleSave('table_players', p.id, { position: i }, 0)
    })
  }

  // O timer vive no navegador do host; só o retrato vai para o banco, para
  // quem abrir a mesa por link conseguir acompanhar.
  function saveTimerState(state) {
    scheduleSave('poker_tables', tableId, { timer_state: state }, 0)
  }

  // --- encerramento -------------------------------------------------------

  // O jogador fixo é escolhido no elenco; aqui vira a linha dele nesta mesa.
  function collectorRowId() {
    if (!table?.settlement_player_id) return null
    return players.find((p) => p.player_id === table.settlement_player_id)?.id || null
  }

  function previewSettlement(balanceMode) {
    if (!table) return { collectorId: null, transfers: [], imbalance: 0, balances: [] }
    return buildSettlement(players, Number(table.buy_in), {
      mode: table.settlement_mode,
      playerId: collectorRowId(),
      balanceMode,
      rebuy,
    })
  }

  async function endGame(balanceMode) {
    if (!table || players.length === 0) return { error: new Error('Mesa sem jogadores') }
    await flushSaves()

    const buyInNow = Number(table.buy_in)
    const balances = balancePlayers(players, buyInNow, balanceMode, rebuy)
    const { transfers } = settlementFromBalances(balances, {
      mode: table.settlement_mode,
      playerId: collectorRowId(),
    })

    // Fechar a conta muda o saldo de quem absorveu a diferença — isso precisa
    // ficar gravado, senão o histórico não bate com o acerto.
    const rebalanced = playersRef.current.map((p) => {
      const b = balances.find((x) => x.id === p.id)
      if (!b || Math.abs(computeSaldo(p, buyInNow, rebuy) - b.saldo) <= EPS) return p
      return { ...p, adjustment: round2(b.saldo + cacifesCost(p.cacifes, buyInNow, rebuy)) }
    })
    const touched = rebalanced.filter((p, i) => p !== playersRef.current[i])
    if (touched.length > 0) {
      applyPlayers(rebalanced, { undoable: false })
      for (const p of touched) {
        const { error } = await saveRow('table_players', p.id, { adjustment: p.adjustment })
        if (error) return { error }
      }
    }

    if (transfers.length > 0) {
      const rows = transfers.map((t) => ({
        table_id: tableId,
        from_table_player_id: t.fromId,
        to_table_player_id: t.toId,
        amount: t.amount,
      }))
      const { error } = await supabase.from('settlements').insert(rows)
      if (error) return { error }
    }

    const finishedAt = new Date().toISOString()
    const { error } = await supabase
      .from('poker_tables')
      .update({ status: 'finished', finished_at: finishedAt })
      .eq('id', tableId)
    if (error) return { error }

    setTable((t) => (t ? { ...t, status: 'finished', finished_at: finishedAt } : t))
    await load()
    return { error: null }
  }

  // Volta a mesa para 'active'. O acerto antigo é jogado fora: com cacifes e
  // saldos livres de novo, ele deixaria de bater na primeira alteração.
  async function reopenTable() {
    const { error: delError } = await supabase.from('settlements').delete().eq('table_id', tableId)
    if (delError) return { error: delError }

    const { error } = await supabase
      .from('poker_tables')
      .update({ status: 'active', finished_at: null })
      .eq('id', tableId)
    if (error) return { error }

    setSettlements([])
    setTable((t) => (t ? { ...t, status: 'active', finished_at: null } : t))
    return { error: null }
  }

  async function markPaid(settlementId, paid) {
    setSettlements((prev) =>
      prev.map((s) => (s.id === settlementId ? { ...s, paid, paid_at: paid ? new Date().toISOString() : null } : s))
    )
    const { error } = await saveRow('settlements', settlementId, {
      paid,
      paid_at: paid ? new Date().toISOString() : null,
    })
    if (error) load()
  }

  const buyIn = table ? Number(table.buy_in) : 0
  // Nulo no banco significa "rebuy pelo mesmo valor da entrada".
  const rebuy = table && table.rebuy_value !== null && table.rebuy_value !== undefined
    ? Number(table.rebuy_value)
    : buyIn
  const total = players.reduce((acc, p) => acc + computeSaldo(p, buyIn, rebuy), 0)

  return {
    table,
    players,
    settlements,
    buyIn,
    rebuy,
    total,
    loading,
    error,
    canUndo,
    undo,
    addPlayer,
    renamePlayer,
    changeCacife,
    adjustPlayer,
    deletePlayer,
    reorderPlayers,
    saveTimerState,
    previewSettlement,
    endGame,
    reopenTable,
    markPaid,
    reload: load,
  }
}
