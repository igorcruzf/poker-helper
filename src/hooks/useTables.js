import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { computeSaldo, shuffle } from '../utils.js'
import { useAuth } from './useAuth.jsx'

const TABLE_SELECT = `
  id, name, buy_in, rebuy_value, status, settlement_mode, settlement_player_id,
  share_token, allow_guest_payments, created_at, finished_at,
  table_players ( id, player_id, name, cacifes, adjustment, position ),
  settlements ( id, from_table_player_id, to_table_player_id, amount, paid, paid_at )
`

// Todas as mesas do usuário — a ativa e o histórico das encerradas.
export function useTables() {
  const { user } = useAuth()
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('poker_tables')
      .select(TABLE_SELECT)
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else {
      setTables(data || [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  async function createTable({
    name,
    buyIn,
    rebuy,
    players,
    settlementMode,
    settlementPlayerId,
    shuffleSeats,
    allowGuestPayments = true,
  }) {
    if (!user) return { data: null, error: new Error('Sem sessão') }

    const { data: table, error } = await supabase
      .from('poker_tables')
      .insert({
        owner_id: user.id,
        name: name?.trim() || null,
        buy_in: buyIn,
        rebuy_value: rebuy === null || rebuy === undefined ? null : rebuy,
        settlement_mode: settlementMode || 'top_winner',
        settlement_player_id: settlementMode === 'fixed_player' ? settlementPlayerId : null,
        allow_guest_payments: allowGuestPayments,
      })
      .select('id, share_token')
      .single()
    if (error) return { data: null, error }

    // A ordem em que entram é a ordem dos lugares; o primeiro abre como dealer.
    const seated = shuffleSeats ? shuffle(players) : players
    const rows = seated.map((p, i) => ({
      table_id: table.id,
      player_id: p.id || null,
      name: p.name,
      cacifes: 1,
      adjustment: 0,
      position: i,
    }))
    if (rows.length > 0) {
      const { error: playersError } = await supabase.from('table_players').insert(rows)
      if (playersError) {
        // Não deixa uma mesa órfã sem jogadores no banco.
        await supabase.from('poker_tables').delete().eq('id', table.id)
        return { data: null, error: playersError }
      }
    }
    return { data: table, error: null }
  }

  async function deleteTable(id) {
    setTables((prev) => prev.filter((t) => t.id !== id))
    const { error } = await supabase.from('poker_tables').delete().eq('id', id)
    if (error) load()
    return { error }
  }

  const activeTable = tables.find((t) => t.status === 'active') || null
  const finishedTables = tables.filter((t) => t.status === 'finished')

  return { tables, activeTable, finishedTables, loading, error, createTable, deleteTable, reload: load }
}

// Converte mesas encerradas para o formato que o StatsModal já entende.
export function tablesToHistory(tables) {
  return tables.map((t) => ({
    id: t.id,
    date: new Date(t.finished_at || t.created_at).getTime(),
    buyIn: Number(t.buy_in),
    players: (t.table_players || []).map((p) => ({
      name: p.name,
      cacifes: p.cacifes,
      saldo: computeSaldo(
        { adjustment: Number(p.adjustment), cacifes: p.cacifes },
        Number(t.buy_in),
        t.rebuy_value === null ? null : Number(t.rebuy_value)
      ),
    })),
  }))
}
