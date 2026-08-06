import { useLocalStorage } from './useLocalStorage.js'

// Past-nights log, separate from the live table state in usePlayers.
export function useHistory() {
  const [history, setHistory] = useLocalStorage('poker-dos-meninos-history-v1', [])

  function addNight(snapshot) {
    setHistory((h) => [...h, snapshot])
  }

  function deleteNight(id) {
    setHistory((h) => h.filter((n) => n.id !== id))
  }

  function clearHistory() {
    setHistory([])
  }

  return { history, addNight, deleteNight, clearHistory }
}
