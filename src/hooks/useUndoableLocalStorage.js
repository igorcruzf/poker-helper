import { useState, useRef, useCallback, useEffect } from 'react'

// Estado persistido em localStorage com pilha de desfazer (undo).
export function useUndoableLocalStorage(key, initialValue, limit = 40) {
  const [value, setRaw] = useState(() => {
	try {
	  const raw = localStorage.getItem(key)
	  return raw ? JSON.parse(raw) : initialValue
	} catch {
	  return initialValue
	}
  })

  const past = useRef([])
  const [canUndo, setCanUndo] = useState(false)

  useEffect(() => {
	try {
	  localStorage.setItem(key, JSON.stringify(value))
	} catch (e) {
	  console.error('Falha ao salvar no localStorage', e)
	}
  }, [key, value])

  const setValue = useCallback((updater) => {
	setRaw((prev) => {
	  const next = typeof updater === 'function' ? updater(prev) : updater
	  if (JSON.stringify(next) === JSON.stringify(prev)) return prev
	  past.current.push(prev)
	  if (past.current.length > limit) past.current.shift()
	  setCanUndo(true)
	  return next
	})
  }, [limit])

  const undo = useCallback(() => {
	setRaw((prev) => {
	  if (past.current.length === 0) return prev
	  const previous = past.current.pop()
	  setCanUndo(past.current.length > 0)
	  return previous
	})
  }, [])

  return [value, setValue, undo, canUndo]
}
