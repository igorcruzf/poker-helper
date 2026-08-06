import { useState } from 'react'
import Header from './Header.jsx'
import ThemeModal from './ThemeModal.jsx'
import LanguageModal from './LanguageModal.jsx'
import { useTheme } from '../hooks/useTheme.js'
import { useInstallPrompt } from '../hooks/useInstallPrompt.js'

// Cabeçalho + os modais que todo menu abre. Juntar aqui evita repetir o mesmo
// estado de tema/idioma em cada tela.
export default function AppChrome(props) {
  const [theme, setTheme] = useTheme()
  const { canInstall, promptInstall } = useInstallPrompt()
  const [themeOpen, setThemeOpen] = useState(false)
  const [languageOpen, setLanguageOpen] = useState(false)

  return (
    <>
      <Header
        {...props}
        onOpenThemes={() => setThemeOpen(true)}
        onOpenLanguage={() => setLanguageOpen(true)}
        canInstall={canInstall}
        onInstall={promptInstall}
      />
      <ThemeModal open={themeOpen} theme={theme} onSelect={setTheme} onClose={() => setThemeOpen(false)} />
      <LanguageModal open={languageOpen} onClose={() => setLanguageOpen(false)} />
    </>
  )
}
