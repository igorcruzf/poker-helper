// Detecta deploy novo comparando o bundle que a index.html do servidor aponta
// com o que este documento carregou. É mais confiável do que depender do
// service worker: o sw.js é idêntico entre builds, então o navegador não vê
// "versão nova" nele — quem muda de nome a cada build são os arquivos com hash.

const RELOAD_KEY = 'poker-update-reloaded-for'
const CHECK_INTERVAL = 30 * 60 * 1000

function currentEntry() {
  const el = document.querySelector('script[type="module"][src]')
  return el ? new URL(el.getAttribute('src'), document.baseURI).pathname : null
}

async function deployedEntry() {
  // O `__update` faz o service worker deixar passar direto para a rede,
  // senão a resposta viria do cache e a comparação nunca mudaria.
  const res = await fetch(`${import.meta.env.BASE_URL}index.html?__update=${Date.now()}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  const html = await res.text()
  const match = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/)
  return match ? new URL(match[1], document.baseURI).pathname : null
}

async function isOutdated() {
  const mine = currentEntry()
  if (!mine) return null
  try {
    const theirs = await deployedEntry()
    if (!theirs || theirs === mine) return null
    return theirs
  } catch {
    return null // offline: segue com o que está carregado
  }
}

async function reloadIfOutdated() {
  const newer = await isOutdated()
  if (!newer) return
  // Se já recarregamos por essa mesma versão e ainda parece desatualizado,
  // alguma coisa está presa no cache — melhor parar do que entrar em loop.
  try {
    if (sessionStorage.getItem(RELOAD_KEY) === newer) return
    sessionStorage.setItem(RELOAD_KEY, newer)
  } catch {
    /* sessionStorage bloqueado: segue e recarrega uma vez */
  }
  window.location.reload()
}

export function startUpdateWatcher() {
  if (!import.meta.env.PROD) return

  reloadIfOutdated()

  // Um app instalado pode ficar dias aberto em segundo plano; a volta para o
  // primeiro plano é a hora natural de trocar de versão, e não no meio de uma
  // mão sendo contada.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reloadIfOutdated()
  })

  setInterval(() => {
    if (document.visibilityState === 'visible') reloadIfOutdated()
  }, CHECK_INTERVAL)
}
