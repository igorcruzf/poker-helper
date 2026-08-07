// O que ainda está em aberto no grupo, do ponto de vista de quem está olhando.
// Vale para a lista de mesas: hoje a dívida só aparece se a pessoa abrir cada
// acerto antigo um por um, e depois de duas semanas ninguém abre.
export function pendingForPlayer(tables, myPlayerId) {
  const iOwe = []
  const owedToMe = []
  let groupPending = 0

  tables.forEach((table) => {
    const seats = table.table_players || []
    const seatOf = (id) => seats.find((s) => s.id === id) || null
    const nameOf = (id) => seatOf(id)?.name || '—'

    ;(table.settlements || []).forEach((s) => {
      if (s.paid) return
      groupPending += Number(s.amount) || 0
      if (!myPlayerId) return

      const from = seatOf(s.from_table_player_id)
      const to = seatOf(s.to_table_player_id)
      const entry = {
        id: s.id,
        tableId: table.id,
        tableName: table.name,
        date: table.finished_at || table.created_at,
        amount: Number(s.amount) || 0,
        shareToken: table.share_token,
      }

      if (from?.player_id === myPlayerId) {
        iOwe.push({ ...entry, who: nameOf(s.to_table_player_id), toSeatId: s.to_table_player_id })
      } else if (to?.player_id === myPlayerId) {
        owedToMe.push({ ...entry, who: nameOf(s.from_table_player_id) })
      }
    })
  })

  const sum = (list) => list.reduce((acc, e) => acc + e.amount, 0)

  return {
    iOwe,
    owedToMe,
    iOweTotal: sum(iOwe),
    owedToMeTotal: sum(owedToMe),
    groupPending,
  }
}
