import { useState, useEffect } from 'react'

// O nome vem do dicionário (`themes.<id>`); o que está aqui é só apoio.
export const THEMES = [
  { id: 'felt', name: 'Feltro (padrão)' },
  { id: 'light', name: 'Claro' },
  { id: 'midnight', name: 'Meia-noite' },
  { id: 'classic', name: 'Clássico vermelho' },
  { id: 'wood', name: 'Madeira' },
  { id: 'pride', name: 'Orgulho' },
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
