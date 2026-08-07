import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { reportResult } from '../lib/syncQueue.js'
import { playerLabel } from '../utils.js'
import { useAuth } from './useAuth.jsx'
import { useGroups } from './useGroups.jsx'

// Lista de jogadores recorrentes do grupo — a "galera" que aparece nas mesas.
// O elenco é do grupo, então todo host que entrar depois já encontra a turma
// cadastrada em vez de recomeçar do zero.
export function useRoster() {
  const { user } = useAuth()
  const { activeGroupId } = useGroups()
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!supabase || !activeGroupId) {
      setRoster([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('players')
      .select('id, name, nickname')
      .eq('group_id', activeGroupId)
      .order('name', { ascending: true })
    reportResult(error)
    if (error) setError(error.message)
    else {
      // `label` é o que vai para a tela e para o histórico da mesa.
      setRoster((data || []).map((p) => ({ ...p, label: playerLabel(p) })))
      setError(null)
    }
    setLoading(false)
  }, [activeGroupId])

  useEffect(() => {
    load()
  }, [load])

  async function addToRoster(rawName, rawNickname) {
    const name = String(rawName || '').trim()
    const nickname = String(rawNickname || '').trim()
    if (!name) return { data: null, error: new Error('Nome vazio') }
    if (!activeGroupId) return { data: null, error: new Error('Sem grupo ativo') }

    // Só é a mesma pessoa se nome E apelido baterem: "André" e "André (Careca)"
    // são dois jogadores diferentes.
    const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
    const existing = roster.find((p) => same(p.name, name) && same(p.nickname, nickname))
    if (existing) return { data: existing, error: null }

    const { data, error } = await supabase
      .from('players')
      // `owner_id` vira só o registro de quem cadastrou: quem manda no acesso
      // agora é o grupo.
      .insert({ owner_id: user?.id, group_id: activeGroupId, name, nickname: nickname || null })
      .select('id, name, nickname')
      .single()
    reportResult(error)
    if (error) return { data: null, error }
    const row = { ...data, label: playerLabel(data) }
    setRoster((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)))
    return { data: row, error: null }
  }

  // Corrigir o nome de alguém do elenco. Diferente de apagar, aqui a correção
  // alcança o histórico: o snapshot em `table_players` existe para o passado não
  // mudar quando alguém sai do elenco, mas um nome digitado errado precisa ser
  // consertado em todas as noites — senão as estatísticas rachariam em dois.
  async function renameInRoster(id, { name: rawName, nickname: rawNickname }) {
    const name = String(rawName || '').trim()
    const nickname = String(rawNickname || '').trim()
    if (!name) return { error: new Error('Nome vazio') }

    const { error } = await supabase
      .from('players')
      .update({ name, nickname: nickname || null })
      .eq('id', id)
    reportResult(error)
    if (error) return { error }

    const label = playerLabel({ name, nickname })
    const { error: historyError } = await supabase
      .from('table_players')
      .update({ name: label })
      .eq('player_id', id)
    reportResult(historyError)
    if (historyError) return { error: historyError }

    await load()
    return { error: null }
  }

  async function removeFromRoster(id) {
    setRoster((prev) => prev.filter((p) => p.id !== id))
    const { error } = await supabase.from('players').delete().eq('id', id)
    reportResult(error)
    if (error) load()
    return { error }
  }

  return { roster, loading, error, addToRoster, renameInRoster, removeFromRoster, reload: load }
}
