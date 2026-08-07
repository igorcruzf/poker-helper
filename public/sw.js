const CACHE = 'poker-cacifes-v6'
const CORE = [
  '.', 'index.html', 'manifest.webmanifest', 'default_image.png',
  'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
	caches.open(CACHE).then((cache) => cache.addAll(CORE)).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
	caches.keys().then((keys) =>
	  Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
	)
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  // Chamadas ao Supabase (auth e dados) nunca podem sair do cache:
  // resposta velha aqui significa saldo errado na mesa.
  if (url.origin !== self.location.origin) return

  // Checagem de versão nova (lib/appUpdate.js): tem que bater na rede, senão
  // compararia o cache com ele mesmo e nunca acharia deploy novo.
  if (url.searchParams.has('__update')) return

  // Navegação: rede primeiro (para pegar o index.html novo depois de um deploy),
  // caindo para o cache quando estiver offline. Como as rotas são do
  // react-router, qualquer caminho volta para o index.html.
  if (req.mode === 'navigate') {
	event.respondWith(
	  fetch(req)
		.then((res) => {
		  const copy = res.clone()
		  caches.open(CACHE).then((cache) => cache.put('index.html', copy)).catch(() => {})
		  return res
		})
		.catch(() => caches.match('index.html').then((cached) => cached || caches.match('.')))
	)
	return
  }

  // Demais arquivos do app: cache primeiro, atualizando em segundo plano.
  event.respondWith(
	caches.match(req).then((cached) => {
	  const network = fetch(req)
		.then((res) => {
		  const copy = res.clone()
		  caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {})
		  return res
		})
		.catch(() => cached)
	  return cached || network
	})
  )
})
