import { supabase } from './supabase.js'

const KEY = 'poker-cacifes-pending-v1'

// Espera entre as tentativas de uma mesma escrita. A primeira sai na hora; as
// outras dão tempo de uma oscilação curta de sinal passar antes de a alteração
// cair na fila offline.
const RETRY_DELAYS = [0, 500, 1500]

// Com a fila vazia não há escrita para servir de teste, então de tempos em
// tempos uma leitura barata confirma se a conexão voltou.
const PROBE_MS = 15000

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

// --- estado da conexão ------------------------------------------------------
// `online` aqui não é o navigator.onLine: é se o banco respondeu da última vez.
// O aparelho pode estar no wi-fi da casa e mesmo assim não alcançar o Supabase.
let online = true
const listeners = new Set()

export function syncStatus() {
  return { online, pending: pendingCount() }
}

function emit() {
  const status = syncStatus()
  listeners.forEach((fn) => fn(status))
}

export function onSyncStatus(fn) {
  listeners.add(fn)
  fn(syncStatus())
  return () => listeners.delete(fn)
}

function setOnline(next) {
  if (online === next) return
  online = next
  emit()
}

export function pendingCount() {
  return Object.keys(readQueue()).length
}

// Deixa qualquer chamada ao banco (inclusive leitura) alimentar o indicador.
export function reportResult(error) {
  if (!error) setOnline(true)
  else if (isNetworkError(error)) setOnline(false)
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

// Some com o que estiver represado de uma linha que não existe mais — sem isso
// a fila ficaria empurrando um patch para sempre depois de apagar uma mesa.
export function dropQueued(table, ids) {
  const list = Array.isArray(ids) ? ids : [ids]
  const queue = readQueue()
  let changed = false
  list.forEach((id) => {
    const key = `${table}:${id}`
    if (queue[key]) {
      delete queue[key]
      changed = true
    }
  })
  if (changed) {
    writeQueue(queue)
    emit()
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Repete só o que vale a pena repetir: queda de rede melhora sozinha, erro de
// permissão ou de dado não melhora nunca.
async function withRetry(run) {
  let result = { error: new Error('sem tentativa') }
  for (let i = 0; i < RETRY_DELAYS.length; i++) {
    if (RETRY_DELAYS[i] > 0) await sleep(RETRY_DELAYS[i])
    result = await run()
    if (!result.error) return result
    if (!isNetworkError(result.error)) return result
  }
  return result
}

// Atualiza uma linha; se a rede falhar, guarda o patch para reenviar depois.
export async function saveRow(table, id, patch) {
  if (!supabase) return { error: new Error('Supabase não configurado') }
  const { error } = await withRetry(() => supabase.from(table).update(patch).eq('id', id))
  if (error) {
    enqueue(table, id, patch)
    reportResult(error)
    return { error }
  }
  setOnline(true)
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
    if (error && isNetworkError(error)) {
      setOnline(false)
      return
    }
    dequeue(key)
  }
  setOnline(true)
}

function isNetworkError(error) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const msg = String(error?.message || '')
  return /fetch|network|timeout|offline|connection|abort|502|503|504/i.test(msg)
}

// Leitura mínima só para saber se o banco responde de novo.
async function probe() {
  if (!supabase) return
  const { error } = await supabase.from('poker_tables').select('id').limit(1)
  reportResult(error)
}

export function startQueueFlusher() {
  if (!supabase) return () => {}
  flushQueue()

  const onOnline = () => {
    // O navegador diz que voltou; quem confirma é o banco.
    if (pendingCount() > 0) flushQueue()
    else probe()
  }
  const onOffline = () => setOnline(false)
  const onVisible = () => {
    if (document.visibilityState !== 'visible') return
    if (pendingCount() > 0) flushQueue()
    else if (!online) probe()
  }

  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  document.addEventListener('visibilitychange', onVisible)

  const interval = setInterval(() => {
    if (!navigator.onLine) {
      setOnline(false)
      return
    }
    if (pendingCount() > 0) flushQueue()
    else if (!online) probe()
  }, PROBE_MS)

  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
    document.removeEventListener('visibilitychange', onVisible)
    clearInterval(interval)
  }
}
