import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from './Header.jsx'
import ThemeModal from './ThemeModal.jsx'
import LanguageModal from './LanguageModal.jsx'
import SyncStatusBar from './SyncStatusBar.jsx'
import { useTheme } from '../hooks/useTheme.js'
import { useInstallPrompt } from '../hooks/useInstallPrompt.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroups } from '../hooks/useGroups.jsx'

// Cabeçalho + os modais que todo menu abre. Juntar aqui evita repetir o mesmo
// estado de tema/idioma em cada tela. O aviso de conexão mora aqui pelo mesmo
// motivo: cair a internet importa em qualquer tela, não só na mesa.
export default function AppChrome(props) {
  const navigate = useNavigate()
  const [theme, setTheme] = useTheme()
  const { canInstall, promptInstall } = useInstallPrompt()
  const { session } = useAuth()
  const { activeGroup } = useGroups()
  const [themeOpen, setThemeOpen] = useState(false)
  const [languageOpen, setLanguageOpen] = useState(false)

  return (
    <>
      <Header
        {...props}
        // Sessão aberta sempre tem grupos para gerenciar; quem chegou pelo link
        // do acerto não tem conta e não vê essa seção.
        onOpenGroups={session ? () => navigate('/grupos') : undefined}
        onOpenProfile={session ? () => navigate('/perfil') : undefined}
        groupName={activeGroup?.name}
        onOpenThemes={() => setThemeOpen(true)}
        onOpenLanguage={() => setLanguageOpen(true)}
        canInstall={canInstall}
        onInstall={promptInstall}
      />
      <SyncStatusBar />
      <ThemeModal open={themeOpen} theme={theme} onSelect={setTheme} onClose={() => setThemeOpen(false)} />
      <LanguageModal open={languageOpen} onClose={() => setLanguageOpen(false)} />
    </>
  )
}
