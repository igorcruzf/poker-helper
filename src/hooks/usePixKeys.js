import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { reportResult } from '../lib/syncQueue.js'

// Chave pix de cada jogador do elenco, indexada pelo id do jogador — que é como
// a mesa e o acerto se referem às pessoas. Só quem tem conta no grupo e
// cadastrou uma chave aparece aqui.
export function usePixKeys(groupId) {
  const [keys, setKeys] = useState({})

  useEffect(() => {
    if (!supabase || !groupId) {
      setKeys({})
      return
    }
    let alive = true

    async function load() {
      const { data: members, error } = await supabase
        .from('group_members')
        .select('player_id, user_id')
        .eq('group_id', groupId)
        .not('player_id', 'is', null)
      reportResult(error)
      if (!alive || error || !members || members.length === 0) return

      const userIds = [...new Set(members.map((m) => m.user_id))]
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, pix_key')
        .in('id', userIds)
      reportResult(profileError)
      if (!alive || profileError) return

      const pixByUser = {}
      ;(profiles || []).forEach((p) => {
        if (p.pix_key) pixByUser[p.id] = p.pix_key
      })

      const map = {}
      members.forEach((m) => {
        if (pixByUser[m.user_id]) map[m.player_id] = pixByUser[m.user_id]
      })
      setKeys(map)
    }

    load()
    return () => { alive = false }
  }, [groupId])

  return keys
}

// A mesa guarda o nome do jogador como estava naquela noite, mas mantém o
// `player_id`; é por ele que a chave chega até a linha do acerto.
export function pixByTablePlayer(tablePlayers, keysByPlayerId) {
  const map = {}
  ;(tablePlayers || []).forEach((p) => {
    const key = p.player_id && keysByPlayerId[p.player_id]
    if (key) map[p.id] = key
  })
  return map
}
