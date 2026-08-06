import { useState, useEffect, useCallback } from 'react'

// Captura o evento beforeinstallprompt para permitir instalar o PWA sob demanda
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [installed, setInstalled] = useState(
	typeof window !== 'undefined' &&
	  window.matchMedia &&
	  window.matchMedia('(display-mode: standalone)').matches
  )

  useEffect(() => {
	function onBeforeInstall(e) {
	  e.preventDefault()
	  setDeferred(e)
	}
	function onInstalled() {
	  setInstalled(true)
	  setDeferred(null)
	}
	window.addEventListener('beforeinstallprompt', onBeforeInstall)
	window.addEventListener('appinstalled', onInstalled)
	return () => {
	  window.removeEventListener('beforeinstallprompt', onBeforeInstall)
	  window.removeEventListener('appinstalled', onInstalled)
	}
  }, [])

  const promptInstall = useCallback(async () => {
	if (!deferred) return
	deferred.prompt()
	try {
	  await deferred.userChoice
	} catch {
	  /* ignore */
	}
	setDeferred(null)
  }, [deferred])

  return { canInstall: !!deferred && !installed, promptInstall }
}
