import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { reportResult } from '../lib/syncQueue.js'
import { profileName } from '../utils.js'

// Quem é quem no grupo, indexado pelo id do jogador do elenco — que é como a
// mesa, o acerto e as estatísticas se referem às pessoas. Junta numa consulta
// só o que antes estava espalhado: a conta por trás do jogador, a foto, o nome
// do perfil e a chave pix.
export function useGroupPeople(groupId) {
  const [byPlayerId, setByPlayerId] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!supabase || !groupId) {
      setByPlayerId({})
      setLoading(false)
      return
    }
    setLoading(true)

    const { data: members, error: memberError } = await supabase
      .from('group_members')
      .select('user_id, player_id')
      .eq('group_id', groupId)
      .not('player_id', 'is', null)
    reportResult(memberError)
    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      return
    }

    const rows = members || []
    const ids = [...new Set(rows.map((m) => m.user_id).filter(Boolean))]
    let profiles = {}
    if (ids.length > 0) {
      // Consulta à parte porque `profiles` se liga a `auth.users`, e o PostgREST
      // não atravessa de group_members até lá sozinho.
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, photo, pix_key')
        .in('id', ids)
      reportResult(profileError)
      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }
      ;(data || []).forEach((p) => { profiles[p.id] = p })
    }

    const map = {}
    rows.forEach((m) => {
      const profile = profiles[m.user_id] || null
      map[m.player_id] = {
        userId: m.user_id,
        name: profileName(profile) || null,
        photo: profile?.photo || null,
        pixKey: profile?.pix_key || null,
      }
    })
    setByPlayerId(map)
    setError(null)
    setLoading(false)
  }, [groupId])

  useEffect(() => {
    load()
  }, [load])

  return useMemo(() => ({
    byPlayerId,
    loading,
    error,
    reload: load,
    // Jogador sem conta é visitante, e a página dele é a do elenco.
    routeFor: (playerId) => {
      if (!playerId) return null
      const person = byPlayerId[playerId]
      return person ? `/perfil/${person.userId}` : `/jogador/${playerId}`
    },
    pixByPlayerId: Object.fromEntries(
      Object.entries(byPlayerId)
        .filter(([, person]) => person.pixKey)
        .map(([playerId, person]) => [playerId, person.pixKey])
    ),
  }), [byPlayerId, loading, error, load])
}

// A mesa guarda o nome do jogador como estava naquele dia, mas mantém o
// `player_id`; é por ele que a chave chega até a linha do acerto.
export function pixByTablePlayer(tablePlayers, pixByPlayerId) {
  const map = {}
  ;(tablePlayers || []).forEach((p) => {
    const key = p.player_id && pixByPlayerId[p.player_id]
    if (key) map[p.id] = key
  })
  return map
}
