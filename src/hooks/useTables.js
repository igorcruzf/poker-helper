import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { dropQueued, reportResult } from '../lib/syncQueue.js'
import { computeSaldo, playerLabel, shuffle } from '../utils.js'
import { useAuth } from './useAuth.jsx'
import { useGroups } from './useGroups.jsx'

const TABLE_SELECT = `
  id, name, buy_in, rebuy_value, status, settlement_mode, settlement_player_id,
  share_token, allow_guest_payments, created_at, finished_at,
  table_players ( id, player_id, name, cacifes, adjustment, position ),
  settlements ( id, from_table_player_id, to_table_player_id, amount, paid, paid_at )
`

// Todas as mesas do grupo — as em andamento e o histórico das encerradas.
export function useTables() {
  const { user } = useAuth()
  const { activeGroupId } = useGroups()
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!supabase || !user || !activeGroupId) {
      setTables([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('poker_tables')
      .select(TABLE_SELECT)
      .eq('group_id', activeGroupId)
      .order('created_at', { ascending: false })
    reportResult(error)
    if (error) setError(error.message)
    else {
      setTables(data || [])
      setError(null)
    }
    setLoading(false)
  }, [user, activeGroupId])

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
    if (!activeGroupId) return { data: null, error: new Error('Sem grupo ativo') }

    const { data: table, error } = await supabase
      .from('poker_tables')
      .insert({
        owner_id: user.id,
        group_id: activeGroupId,
        name: name?.trim() || null,
        buy_in: buyIn,
        rebuy_value: rebuy === null || rebuy === undefined ? null : rebuy,
        settlement_mode: settlementMode || 'top_winner',
        settlement_player_id: settlementMode === 'fixed_player' ? settlementPlayerId : null,
        allow_guest_payments: allowGuestPayments,
      })
      .select('id, share_token')
      .single()
    reportResult(error)
    if (error) return { data: null, error }

    // A ordem em que entram é a ordem dos lugares; o primeiro abre como dealer.
    const seated = shuffleSeats ? shuffle(players) : players
    const rows = seated.map((p, i) => ({
      table_id: table.id,
      player_id: p.id || null,
      // Grava o rótulo com apelido: é o que separa os dois Andrés no histórico.
      name: p.label || playerLabel(p),
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
    await load()
    return { data: table, error: null }
  }

  // A exclusão precisa ser confirmada pelo banco. Antes ela só sumia da tela: se
  // o delete não passasse (RLS, rede), a mesa voltava sozinha no próximo
  // carregamento e ninguém entendia o porquê.
  async function deleteTable(id) {
    const before = tables
    setTables((prev) => prev.filter((t) => t.id !== id))

    const table = before.find((t) => t.id === id)
    const { data, error } = await supabase
      .from('poker_tables')
      .delete()
      .eq('id', id)
      .select('id')
    reportResult(error)

    if (error) {
      setTables(before)
      setError(error.message)
      return { error }
    }
    if (!data || data.length === 0) {
      // Sem erro e sem linha apagada = o RLS barrou em silêncio.
      setTables(before)
      const denied = new Error('delete_denied')
      setError(denied.message)
      return { error: denied }
    }

    // Nada de patch represado apontando para linhas que não existem mais.
    dropQueued('poker_tables', id)
    dropQueued('table_players', (table?.table_players || []).map((p) => p.id))
    dropQueued('settlements', (table?.settlements || []).map((s) => s.id))
    setError(null)
    return { error: null }
  }

  // Mais de uma mesa pode estar aberta ao mesmo tempo (duas rodadas na mesma
  // noite, uma que ficou esquecida sem encerrar). Antes só a mais recente
  // aparecia e as outras ficavam invisíveis — inalcançáveis até para apagar.
  const activeTables = tables.filter((t) => t.status === 'active')
  const finishedTables = tables.filter((t) => t.status === 'finished')

  return {
    tables,
    activeTables,
    activeTable: activeTables[0] || null,
    finishedTables,
    loading,
    error,
    createTable,
    deleteTable,
    reload: load,
  }
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
