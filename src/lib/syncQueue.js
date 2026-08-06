import { supabase } from './supabase.js'

const KEY = 'poker-cacifes-pending-v1'

// Fila de escritas que falharam (offline, rede caindo no meio da noite).
// Chave = tabela + id da linha, valor = patch acumulado. Última escrita vence,
// que é exatamente a semântica certa para cacifes/ajustes: o estado final da
// linha é o que importa, não cada toque no +/-.
function readQueue() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(KEY, JSON.stringify(queue))
  } catch (e) {
    console.error('Não foi possível guardar a fila offline', e)
  }
}

const listeners = new Set()

function emit() {
  const count = pendingCount()
  listeners.forEach((fn) => fn(count))
}

export function onPendingChange(fn) {
  listeners.add(fn)
  fn(pendingCount())
  return () => listeners.delete(fn)
}

export function pendingCount() {
  return Object.keys(readQueue()).length
}

function enqueue(table, id, patch) {
  const queue = readQueue()
  const key = `${table}:${id}`
  queue[key] = { table, id, patch: { ...(queue[key]?.patch || {}), ...patch } }
  writeQueue(queue)
  emit()
}

function dequeue(key) {
  const queue = readQueue()
  delete queue[key]
  writeQueue(queue)
  emit()
}

// Atualiza uma linha; se a rede falhar, guarda o patch para reenviar depois.
export async function saveRow(table, id, patch) {
  if (!supabase) return { error: new Error('Supabase não configurado') }
  const { error } = await supabase.from(table).update(patch).eq('id', id)
  if (error) {
    enqueue(table, id, patch)
    return { error }
  }
  return { error: null }
}

export async function flushQueue() {
  if (!supabase) return
  const queue = readQueue()
  const entries = Object.entries(queue)
  for (const [key, item] of entries) {
    const { error } = await supabase.from(item.table).update(item.patch).eq('id', item.id)
    // Erro de rede: para e tenta tudo de novo mais tarde. Erro do servidor
    // (linha apagada, RLS): descarta, senão a fila trava para sempre.
    if (error && isNetworkError(error)) return
    dequeue(key)
  }
}

function isNetworkError(error) {
  const msg = String(error?.message || '')
  return /fetch|network|timeout|offline/i.test(msg)
}

export function startQueueFlusher() {
  if (!supabase) return () => {}
  flushQueue()
  const onOnline = () => flushQueue()
  window.addEventListener('online', onOnline)
  const interval = setInterval(() => {
    if (navigator.onLine && pendingCount() > 0) flushQueue()
  }, 20000)
  return () => {
    window.removeEventListener('online', onOnline)
    clearInterval(interval)
  }
}
