import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { startUpdateWatcher } from './lib/appUpdate.js'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // Se já havia um controlador, a troca significa service worker novo no ar.
  // Na primeira instalação o clients.claim() também dispara o evento, e aí
  // recarregar seria só um piscar à toa.
  const hadController = Boolean(navigator.serviceWorker.controller)
  let reloading = false

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return
    reloading = true
    window.location.reload()
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((reg) => {
        reg.update().catch(() => {})
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {})
        })
      })
      .catch((e) => console.warn('SW não registrado', e))
  })
}

startUpdateWatcher()
