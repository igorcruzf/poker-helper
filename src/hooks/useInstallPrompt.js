import { useState, useEffect, useCallback } from 'react'

const INSTALLED_KEY = 'poker-app-installed'

// Standalone display-mode is the only reliable live signal; once we ever see
// it (or a completed install), we remember it so the button stays hidden
// even on a later visit made outside the installed shell.
function readInstalled() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true
  try {
	return localStorage.getItem(INSTALLED_KEY) === '1'
  } catch {
	return false
  }
}

function rememberInstalled() {
  try {
	localStorage.setItem(INSTALLED_KEY, '1')
  } catch {
	/* ignore */
  }
}

// Captura o evento beforeinstallprompt para permitir instalar o PWA sob demanda
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [installed, setInstalled] = useState(readInstalled)

  useEffect(() => {
	function onBeforeInstall(e) {
	  e.preventDefault()
	  setDeferred(e)
	}
	function onInstalled() {
	  setInstalled(true)
	  setDeferred(null)
	  rememberInstalled()
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
	  const choice = await deferred.userChoice
	  if (choice.outcome === 'accepted') {
		setInstalled(true)
		rememberInstalled()
	  }
	} catch {
	  /* ignore */
	}
	setDeferred(null)
  }, [deferred])

  return { canInstall: !!deferred && !installed, promptInstall }
}
