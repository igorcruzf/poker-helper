import { useState, useEffect } from 'react'

export const THEMES = [
  { id: 'felt', name: 'Feltro (padrão)' },
  { id: 'midnight', name: 'Meia-noite' },
  { id: 'classic', name: 'Clássico vermelho' },
  { id: 'wood', name: 'Madeira' },
]

export function useTheme() {
  const [theme, setTheme] = useState(() => {
	try {
	  return localStorage.getItem('poker-theme') || 'felt'
	} catch {
	  return 'felt'
	}
  })

  useEffect(() => {
	document.documentElement.dataset.theme = theme
	try {
	  localStorage.setItem('poker-theme', theme)
	} catch {
	  /* ignore */
	}
  }, [theme])

  return [theme, setTheme]
}
