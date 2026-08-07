import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { reportResult } from '../lib/syncQueue.js'
import { useAuth } from './useAuth.jsx'

const GroupContext = createContext(null)

const ACTIVE_KEY = 'poker-active-group'

function readActive() {
  try {
    return localStorage.getItem(ACTIVE_KEY) || null
  } catch {
    return null
  }
}

function writeActive(id) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id)
    else localStorage.removeItem(ACTIVE_KEY)
  } catch {
    /* modo privado: a escolha vale só para esta sessão */
  }
}

// Os grupos a que a conta pertence e qual deles está aberto. Tudo que é dado de
// mesa — elenco, noites, histórico, estatísticas — pendura no grupo ativo, não
// na conta, então isso precisa ser resolvido antes de qualquer tela carregar.
export function GroupProvider({ children }) {
  const { user } = useAuth()
  const [memberships, setMemberships] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeId, setActiveId] = useState(readActive)

  const load = useCallback(async () => {
    if (!supabase || !user) {
      setMemberships([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('group_members')
      .select('id, role, player_id, group_id, groups ( id, name, image_url, invite_code, created_by, created_at )')
      .eq('user_id', user.id)
    reportResult(error)
    if (error) {
      setError(error.message)
    } else {
      const rows = (data || [])
        .filter((row) => row.groups)
        .map((row) => ({
          membershipId: row.id,
          role: row.role,
          playerId: row.player_id,
          group: row.groups,
        }))
        .sort((a, b) => a.group.name.localeCompare(b.group.name))
      setMemberships(rows)
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  // Um grupo guardado que não existe mais (saiu, foi apagado) não pode travar o
  // app: cai no primeiro da lista.
  const active = useMemo(() => {
    if (memberships.length === 0) return null
    return memberships.find((m) => m.group.id === activeId) || memberships[0]
  }, [memberships, activeId])

  useEffect(() => {
    if (active && active.group.id !== activeId) {
      setActiveId(active.group.id)
      writeActive(active.group.id)
    }
  }, [active, activeId])

  const selectGroup = useCallback((id) => {
    setActiveId(id)
    writeActive(id)
  }, [])

  async function createGroup(name) {
    const { data, error } = await supabase.rpc('create_group', { p_name: name })
    reportResult(error)
    if (error) return { data: null, error }
    await load()
    if (data?.id) selectGroup(data.id)
    return { data, error: null }
  }

  // Só o código de convite abre essa porta — devolve o nome do grupo e os
  // jogadores que ainda não têm dono, para a pessoa dizer quem ela é.
  async function findGroupByCode(code) {
    const { data, error } = await supabase.rpc('find_group_by_code', { p_code: code })
    reportResult(error)
    if (error) return { data: null, error }
    return { data: data || null, error: null }
  }

  async function requestJoin({ code, playerId, playerName }) {
    const { data, error } = await supabase.rpc('request_group_join', {
      p_code: code,
      p_player_id: playerId || null,
      p_player_name: playerName || null,
    })
    reportResult(error)
    if (error) return { data: null, error }
    return { data, error: null }
  }

  // Nome e foto do grupo: o RLS já deixa host editar a linha direto.
  async function updateGroup(groupId, patch) {
    const { error } = await supabase.from('groups').update(patch).eq('id', groupId)
    reportResult(error)
    if (!error) await load()
    return { error }
  }

  // Qual jogador do elenco sou eu aqui. `playerId` nulo = só organizo, não jogo.
  async function setMyPlayer(playerId) {
    const membershipId = active?.membershipId
    if (!membershipId) return { error: new Error('Sem grupo ativo') }
    const { data, error } = await supabase.rpc('set_member_player', {
      p_member: membershipId,
      p_player: playerId || null,
    })
    reportResult(error)
    if (error) return { error }
    if (data && data.ok === false) return { error: new Error(data.reason) }
    await load()
    return { error: null }
  }

  async function leaveGroup(membershipId) {
    const { error } = await supabase.from('group_members').delete().eq('id', membershipId)
    reportResult(error)
    if (!error) await load()
    return { error }
  }

  const value = {
    memberships,
    groups: memberships.map((m) => ({ ...m.group, role: m.role })),
    activeGroup: active ? active.group : null,
    activeGroupId: active ? active.group.id : null,
    role: active ? active.role : null,
    isHost: !!active && (active.role === 'owner' || active.role === 'host'),
    isOwner: !!active && active.role === 'owner',
    myMembershipId: active ? active.membershipId : null,
    myPlayerId: active ? active.playerId : null,
    hasGroup: memberships.length > 0,
    loading,
    error,
    selectGroup,
    createGroup,
    updateGroup,
    setMyPlayer,
    findGroupByCode,
    requestJoin,
    leaveGroup,
    reload: load,
  }

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>
}

export function useGroups() {
  const ctx = useContext(GroupContext)
  if (!ctx) throw new Error('useGroups precisa estar dentro de <GroupProvider>')
  return ctx
}
