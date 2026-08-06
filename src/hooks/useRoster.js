import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './useAuth.jsx'

// Lista de jogadores recorrentes do usuário — a "galera" que aparece nas mesas.
export function useRoster() {
  const { user } = useAuth()
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('players')
      .select('id, name')
      .order('name', { ascending: true })
    if (error) setError(error.message)
    else {
      setRoster(data || [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  async function addToRoster(rawName) {
    const name = String(rawName || '').trim()
    if (!name || !user) return { data: null, error: new Error('Nome vazio') }

    const existing = roster.find((p) => p.name.trim().toLowerCase() === name.toLowerCase())
    if (existing) return { data: existing, error: null }

    const { data, error } = await supabase
      .from('players')
      .insert({ owner_id: user.id, name })
      .select('id, name')
      .single()
    if (error) return { data: null, error }
    setRoster((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return { data, error: null }
  }

  async function removeFromRoster(id) {
    setRoster((prev) => prev.filter((p) => p.id !== id))
    const { error } = await supabase.from('players').delete().eq('id', id)
    if (error) load()
    return { error }
  }

  return { roster, loading, error, addToRoster, removeFromRoster, reload: load }
}
