import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { reportResult } from '../lib/syncQueue.js'
import { useAuth } from './useAuth.jsx'

const MyProfileContext = createContext(null)

const SELECT = 'id, first_name, last_name, photo, pix_key, created_at'
const OFFERED_KEY = 'poker-profile-setup-offered'

// Completar o perfil é convite, não cela: depois de oferecer uma vez, a pessoa
// segue a vida. Sem isso, quem tem uma conta antiga sem nome (o backfill
// preencheu nulo quando não havia nome nos metadados) era mandada para o
// formulário a cada F5.
function alreadyOffered(userId) {
  try {
    return localStorage.getItem(`${OFFERED_KEY}:${userId}`) === '1'
  } catch {
    return false
  }
}

export function markSetupOffered(userId) {
  if (!userId) return
  try {
    localStorage.setItem(`${OFFERED_KEY}:${userId}`, '1')
  } catch {
    /* modo privado: vale só para esta sessão */
  }
}

export function MyProfileProvider({ children }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  // Para qual conta o perfil já foi buscado, e se a busca falhou.
  const [loadedFor, setLoadedFor] = useState(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    if (!supabase || !user) {
      setProfile(null)
      setLoadedFor(null)
      setFailed(false)
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select(SELECT)
      .eq('id', user.id)
      .maybeSingle()
    reportResult(error)
    setProfile(error ? null : data || null)
    setFailed(!!error)
    setLoadedFor(user.id)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  // Leva o nome novo para o jogador que esta conta representa em todos os
  // grupos e para o histórico de mesas. Devolve os grupos que precisam de um
  // apelido quando o nome bate num homônimo — sem gravar nada nesse caso.
  async function syncPlayerName(name, nicknames) {
    const { data, error } = await supabase.rpc('sync_my_player_name', {
      p_name: name,
      p_nicknames: nicknames || {},
    })
    reportResult(error)
    if (error) return { error, conflicts: [] }
    if (data?.ok === false && data.reason === 'needs_nickname') {
      return { error: null, conflicts: data.conflicts || [] }
    }
    return { error: null, conflicts: [] }
  }

  async function save({ firstName, lastName, photo, pixKey }) {
    if (!user) return { error: new Error('Sem sessão') }
    // O gatilho cria o perfil junto com a conta, mas o upsert cobre contas
    // antigas que só ganharam perfil depois.
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      first_name: firstName?.trim() || null,
      last_name: lastName?.trim() || null,
      photo: photo || null,
      pix_key: pixKey?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    reportResult(error)
    if (error) return { error }
    await load()
    return { error: null }
  }

  // Derivado, e não um `useState` separado: com um sinalizador próprio existe um
  // quadro em que o usuário já chegou mas a busca ainda não começou, e a porta
  // lê "perfil sem nome" e desvia a pessoa no meio de um F5.
  const loading = !!user && loadedFor !== user.id

  const value = {
    profile,
    loading,
    save,
    syncPlayerName,
    reload: load,
    // Só empurra para o cadastro quando a leitura deu certo, o nome está mesmo
    // vazio e ainda não oferecemos: erro de rede não pode virar formulário.
    needsSetup:
      !loading && !failed && !!user && !profile?.first_name && !alreadyOffered(user.id),
  }

  return <MyProfileContext.Provider value={value}>{children}</MyProfileContext.Provider>
}

export function useMyProfile() {
  const ctx = useContext(MyProfileContext)
  if (!ctx) throw new Error('useMyProfile precisa estar dentro de <MyProfileProvider>')
  return ctx
}
