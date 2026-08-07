import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { reportResult } from '../lib/syncQueue.js'
import { useAuth } from './useAuth.jsx'

const SELECT = 'id, first_name, last_name, photo, pix_key, created_at'

// O perfil de uma conta. `userId` nulo devolve perfil nulo sem carregar nada —
// é o caso do jogador visitante, que não tem conta por trás. Só o seu próprio
// pode ser salvo, que é o que o RLS deixa; o de outra pessoa só abre se vocês
// dividem algum grupo.
export function useProfile(userId) {
  const { user } = useAuth()
  const targetId = userId || null
  const isMine = !!targetId && targetId === user?.id

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!supabase || !targetId) {
      setProfile(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select(SELECT)
      .eq('id', targetId)
      .maybeSingle()
    reportResult(error)
    if (error) setError(error.message)
    else {
      setProfile(data || null)
      setError(null)
    }
    setLoading(false)
  }, [targetId])

  useEffect(() => {
    load()
  }, [load])

  async function save({ firstName, lastName, photo, pixKey }) {
    if (!isMine) return { error: new Error('Só dá para editar o próprio perfil') }
    const row = {
      id: targetId,
      first_name: firstName?.trim() || null,
      last_name: lastName?.trim() || null,
      photo: photo || null,
      pix_key: pixKey?.trim() || null,
      updated_at: new Date().toISOString(),
    }
    // O gatilho cria o perfil junto com a conta, mas um upsert cobre contas
    // antigas que só ganharam perfil depois.
    const { error } = await supabase.from('profiles').upsert(row)
    reportResult(error)
    if (error) return { error }
    await load()
    return { error: null }
  }

  return { profile, loading, error, isMine, save, reload: load }
}
