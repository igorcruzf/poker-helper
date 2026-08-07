import { useCallback, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { diffPlayers, trackedFields } from '../lib/playersDiff.js'

const MAX_STEPS = 40

// Desfazer é uma pilha de retratos da lista de jogadores. Voltar não reescreve
// a mesa inteira: compara o retrato com o estado atual e manda ao banco só as
// inclusões, exclusões e alterações que revertem aquele passo.
export function usePlayerUndo({ tableId, playersRef, setPlayers, scheduleSave }) {
  const past = useRef([])
  const [canUndo, setCanUndo] = useState(false)

  const push = useCallback(() => {
    past.current.push(playersRef.current.map((p) => ({ ...p })))
    if (past.current.length > MAX_STEPS) past.current.shift()
    setCanUndo(true)
  }, [playersRef])

  // Uma ação que falhou no banco não pode ficar na pilha: desfazê-la reverteria
  // algo que nunca aconteceu.
  const drop = useCallback(() => {
    past.current.pop()
    setCanUndo(past.current.length > 0)
  }, [])

  const undo = useCallback(async () => {
    const snapshot = past.current.pop()
    setCanUndo(past.current.length > 0)
    if (!snapshot) return

    const current = playersRef.current
    playersRef.current = snapshot
    setPlayers(snapshot)

    const { inserted, deleted, updated } = diffPlayers(current, snapshot)

    // Quem o retrato traz de volta (desfazer uma exclusão).
    if (inserted.length > 0) {
      await supabase.from('table_players').insert(
        inserted.map((p) => ({
          id: p.id,
          table_id: tableId,
          player_id: p.player_id,
          ...trackedFields(p),
        }))
      )
    }

    // Quem entrou depois do retrato (desfazer uma inclusão).
    if (deleted.length > 0) {
      await supabase.from('table_players').delete().in('id', deleted.map((p) => p.id))
    }

    updated.forEach((p) => scheduleSave('table_players', p.id, trackedFields(p), 0))
  }, [tableId, playersRef, setPlayers, scheduleSave])

  return { canUndo, push, drop, undo }
}
