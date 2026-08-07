import { useCallback, useEffect, useRef } from 'react'
import { saveRow } from '../lib/syncQueue.js'

// Escrita represada por linha. Apertar o + cinco vezes seguidas vira uma
// escrita só com o valor final — o que importa é o estado da linha, não cada
// toque. Os patches de uma mesma linha se fundem enquanto o tempo não vence.
export function useDebouncedSave(defaultDelay = 500) {
  const timers = useRef({})
  const patches = useRef({})

  const schedule = useCallback((table, id, patch, delay = defaultDelay) => {
    const key = `${table}:${id}`
    patches.current[key] = { ...(patches.current[key] || {}), ...patch }
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(() => {
      const body = patches.current[key]
      delete patches.current[key]
      delete timers.current[key]
      if (body) saveRow(table, id, body)
    }, delay)
  }, [defaultDelay])

  // Manda tudo o que estiver represado agora e espera terminar. Encerrar a mesa
  // depende disso: o acerto tem que ser calculado sobre os valores já gravados.
  const flush = useCallback(async () => {
    const keys = Object.keys(patches.current)
    await Promise.all(
      keys.map((key) => {
        clearTimeout(timers.current[key])
        delete timers.current[key]
        const body = patches.current[key]
        delete patches.current[key]
        const [table, id] = key.split(':')
        return saveRow(table, id, body)
      })
    )
  }, [])

  // Ao sair da tela, o que ficou represado ainda vai — sem esperar, porque o
  // componente está morrendo; quem garante a entrega daí em diante é a fila.
  useEffect(() => () => {
    Object.keys(patches.current).forEach((key) => {
      clearTimeout(timers.current[key])
      const [table, id] = key.split(':')
      saveRow(table, id, patches.current[key])
    })
    patches.current = {}
    timers.current = {}
  }, [])

  return { schedule, flush }
}
