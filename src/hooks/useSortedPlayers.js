import { useState } from 'react'
import { computeSaldo } from '../utils.js'

// Column sort for the player list. Drag-and-drop reordering is only
// meaningful with no active sort, so dragEnabled is derived here too.
export function useSortedPlayers(players, buyIn) {
  const [sort, setSort] = useState({ key: null, dir: 'asc' })

  function toggleSort(key) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' }
        : { key, dir: 'desc' }
    )
  }

  function sortArrow(key) {
    if (sort.key !== key) return ''
    return sort.dir === 'asc' ? ' ▲' : ' ▼'
  }

  const sortedPlayers = (() => {
    if (!sort.key) return players
    const factor = sort.dir === 'asc' ? 1 : -1
    return [...players].sort((a, b) => {
      let av, bv
      if (sort.key === 'nome') {
        return factor * a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' })
      } else if (sort.key === 'cacifes') {
        av = a.cacifes
        bv = b.cacifes
      } else {
        av = computeSaldo(a, buyIn)
        bv = computeSaldo(b, buyIn)
      }
      return factor * (av - bv)
    })
  })()

  return { sort, sortedPlayers, toggleSort, sortArrow, dragEnabled: !sort.key }
}
