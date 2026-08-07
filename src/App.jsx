import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import { GroupProvider, useGroups } from './hooks/useGroups.jsx'
import { isSupabaseConfigured } from './lib/supabase.js'
import { startQueueFlusher } from './lib/syncQueue.js'
import { useTheme } from './hooks/useTheme.js'
import { useI18n } from './hooks/useI18n.js'

import LoginScreen from './screens/LoginScreen.jsx'
import TablesScreen from './screens/TablesScreen.jsx'
import CreateTableScreen from './screens/CreateTableScreen.jsx'
import TableScreen from './screens/TableScreen.jsx'
import SettlementScreen from './screens/SettlementScreen.jsx'
import StatsScreen from './screens/StatsScreen.jsx'
import GroupsScreen from './screens/GroupsScreen.jsx'
import ProfileScreen from './screens/ProfileScreen.jsx'
import SharedSettlementScreen from './screens/SharedSettlementScreen.jsx'
import SharedTableScreen from './screens/SharedTableScreen.jsx'
import HandRankingScreen from './components/HandRankingScreen.jsx'

function Splash() {
  const { t } = useI18n()
  return (
    <div className="app-shell">
      <div className="app"><div className="empty-state">{t('common.loading')}</div></div>
    </div>
  )
}

function ConfigMissing() {
  const { t } = useI18n()
  return (
    <div className="app-shell">
      <div className="app">
        <div className="card" style={{ marginTop: 24 }}>
          <p className="question">{t('config.title')}</p>
          <p className="modal-hint">{t('config.body')}</p>
        </div>
      </div>
    </div>
  )
}

function RequireAuth({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <Splash />
  if (!session) return <Navigate to="/login" replace />
  return children
}

// Mesa, elenco e estatísticas são do grupo: sem grupo não há o que mostrar, e a
// pessoa é levada a criar o dela ou entrar num com o código de convite.
function RequireGroup({ children }) {
  const { hasGroup, loading } = useGroups()
  if (loading) return <Splash />
  if (!hasGroup) return <Navigate to="/grupos" replace />
  return children
}

function LoginRoute() {
  const { session, loading } = useAuth()
  if (loading) return <Splash />
  if (session) return <Navigate to="/" replace />
  return <LoginScreen />
}

function RankingRoute() {
  const navigate = useNavigate()
  return (
    <div className="app-shell">
      <div className="app">
        <HandRankingScreen onBack={() => navigate(-1)} />
      </div>
    </div>
  )
}

export default function App() {
  // Tema é global (roda antes mesmo do login).
  useTheme()

  useEffect(() => startQueueFlusher(), [])

  if (!isSupabaseConfigured) return <ConfigMissing />

  return (
    <AuthProvider>
      <GroupProvider>
        <BrowserRouter>
          <Routes>
            {/* Pública: quem recebe o link do acerto não precisa de conta. */}
            <Route path="/acerto/:token" element={<SharedSettlementScreen />} />
            <Route path="/ao-vivo/:token" element={<SharedTableScreen />} />
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/grupos" element={<RequireAuth><GroupsScreen /></RequireAuth>} />
            {/* Convite do grupo: mesma tela, com o código já preenchido. */}
            <Route path="/entrar/:code" element={<RequireAuth><GroupsScreen /></RequireAuth>} />
            {/* Perfil não exige grupo: é onde a pessoa se apresenta antes de
                entrar em qualquer um. O de outra conta só abre se vocês
                dividem um grupo — quem garante isso é o RLS. */}
            <Route path="/perfil" element={<RequireAuth><ProfileScreen /></RequireAuth>} />
            <Route path="/perfil/:userId" element={<RequireAuth><ProfileScreen /></RequireAuth>} />
            {/* Mesma tela pelo lado do elenco: o jogador sem conta (visitante)
                também tem página e números. */}
            <Route path="/jogador/:playerId" element={<RequireAuth><RequireGroup><ProfileScreen /></RequireGroup></RequireAuth>} />
            <Route path="/" element={<RequireAuth><RequireGroup><TablesScreen /></RequireGroup></RequireAuth>} />
            <Route path="/nova" element={<RequireAuth><RequireGroup><CreateTableScreen /></RequireGroup></RequireAuth>} />
            <Route path="/estatisticas" element={<RequireAuth><RequireGroup><StatsScreen /></RequireGroup></RequireAuth>} />
            <Route path="/mesa/:id" element={<RequireAuth><RequireGroup><TableScreen /></RequireGroup></RequireAuth>} />
            <Route path="/mesa/:id/acerto" element={<RequireAuth><RequireGroup><SettlementScreen /></RequireGroup></RequireAuth>} />
            {/* Referência estática, sem dado de ninguém: aberta para o convidado
                que chega pelo link do acerto poder consultar também. */}
            <Route path="/ranking" element={<RankingRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </GroupProvider>
    </AuthProvider>
  )
}
