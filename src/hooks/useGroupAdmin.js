import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { reportResult } from '../lib/syncQueue.js'
import { playerLabel } from '../utils.js'

// Quem está no grupo e quem está batendo na porta. Fica fora do GroupProvider
// de propósito: só a tela de grupos precisa disso, e são duas consultas a mais
// que não fazem sentido rodar em toda mesa.
export function useGroupAdmin(groupId) {
  const [members, setMembers] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!supabase || !groupId) {
      setMembers([])
      setRequests([])
      setLoading(false)
      return
    }
    setLoading(true)
    const [memberRes, requestRes] = await Promise.all([
      supabase
        .from('group_members')
        .select('id, user_id, role, player_id, created_at, players ( name, nickname )')
        .eq('group_id', groupId),
      supabase
        .from('group_join_requests')
        .select('id, user_id, email, player_id, player_name, created_at, players ( name, nickname )')
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
    ])

    reportResult(memberRes.error || requestRes.error)
    if (memberRes.error || requestRes.error) {
      setError((memberRes.error || requestRes.error).message)
      setLoading(false)
      return
    }

    // Os perfis vêm numa consulta à parte: profiles se liga a auth.users, e o
    // PostgREST não atravessa daqui até lá sozinho.
    const rows = memberRes.data || []
    const ids = [...new Set(rows.map((m) => m.user_id).filter(Boolean))]
    let profiles = {}
    if (ids.length > 0) {
      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, photo')
        .in('id', ids)
      reportResult(profileError)
      ;(profileRows || []).forEach((p) => { profiles[p.id] = p })
    }

    const ROLE_ORDER = { owner: 0, host: 1, member: 2 }
    setMembers(
      rows
        .map((m) => ({
          ...m,
          name: m.players ? playerLabel(m.players) : null,
          profile: profiles[m.user_id] || null,
        }))
        .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
          (a.name || '').localeCompare(b.name || ''))
    )
    setRequests((requestRes.data || []).map((r) => ({
      ...r,
      // Ou o jogador do elenco que a pessoa diz ser, ou o nome novo que digitou.
      claimedName: (r.players ? playerLabel(r.players) : null) || r.player_name || null,
      isNewPlayer: !r.player_id,
    })))
    setError(null)
    setLoading(false)
  }, [groupId])

  useEffect(() => {
    load()
  }, [load])

  async function approve(requestId, role = 'member') {
    const { data, error } = await supabase.rpc('approve_join_request', {
      p_request: requestId,
      p_role: role,
    })
    reportResult(error)
    if (error) return { error }
    if (data && data.ok === false) return { error: new Error(data.reason) }
    await load()
    return { error: null }
  }

  async function reject(requestId) {
    const { error } = await supabase.rpc('reject_join_request', { p_request: requestId })
    reportResult(error)
    if (!error) await load()
    return { error }
  }

  async function setRole(memberId, role) {
    const { error } = await supabase.rpc('set_member_role', { p_member: memberId, p_role: role })
    reportResult(error)
    if (!error) await load()
    return { error }
  }

  // Host corrigindo quem é quem — a pessoa entrou representando o jogador errado.
  async function setMemberPlayer(memberId, playerId) {
    const { data, error } = await supabase.rpc('set_member_player', {
      p_member: memberId,
      p_player: playerId || null,
    })
    reportResult(error)
    if (error) return { error }
    if (data && data.ok === false) return { error: new Error(data.reason) }
    await load()
    return { error: null }
  }

  async function removeMember(memberId) {
    const { error } = await supabase.from('group_members').delete().eq('id', memberId)
    reportResult(error)
    if (!error) await load()
    return { error }
  }

  return {
    members, requests, loading, error,
    approve, reject, setRole, setMemberPlayer, removeMember, reload: load,
  }
}
