// O que mudou entre dois retratos da lista de jogadores. É o que o desfazer
// precisa saber para pedir ao banco exatamente as inclusões, exclusões e
// alterações que revertem o passo — em vez de reescrever a mesa inteira.
const TRACKED = ['cacifes', 'adjustment', 'name', 'position']

export function diffPlayers(before, after) {
  const beforeIds = new Set(before.map((p) => p.id))
  const afterIds = new Set(after.map((p) => p.id))

  return {
    inserted: after.filter((p) => !beforeIds.has(p.id)),
    deleted: before.filter((p) => !afterIds.has(p.id)),
    updated: after.filter((p) => {
      const old = before.find((b) => b.id === p.id)
      return old && TRACKED.some((field) => old[field] !== p[field])
    }),
  }
}

export function trackedFields(player) {
  return TRACKED.reduce((acc, field) => Object.assign(acc, { [field]: player[field] }), {})
}
