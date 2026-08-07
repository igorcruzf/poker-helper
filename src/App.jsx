import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import { GroupProvider, useGroups } from './hooks/useGroups.jsx'
import { MyProfileProvider, useMyProfile } from './hooks/useMyProfile.jsx'
import { isSupabaseConfigured } from './lib/supabase.js'
import { startQueueFlusher } from './lib/syncQueue.js'
import { useTheme } from './hooks/useTheme.js'
import { useI18n } from './hooks/useI18n.js'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// O caminho de toda noite vai no pacote principal: login, lista de mesas, a
// mesa em si, o acerto e as duas telas públicas de link.
import LoginScreen from './screens/LoginScreen.jsx'
import TablesScreen from './screens/TablesScreen.jsx'
import TableScreen from './screens/TableScreen.jsx'
import SettlementScreen from './screens/SettlementScreen.jsx'
import SharedSettlementScreen from './screens/SharedSettlementScreen.jsx'
import SharedTableScreen from './screens/SharedTableScreen.jsx'

// O resto chega sob demanda — são telas grandes que ninguém abre no meio de
// uma mão, e juntas passavam de meio megabyte no primeiro carregamento.
const CreateTableScreen = lazy(() => import('./screens/CreateTableScreen.jsx'))
const StatsScreen = lazy(() => import('./screens/StatsScreen.jsx'))
const GroupsScreen = lazy(() => import('./screens/GroupsScreen.jsx'))
const ProfileScreen = lazy(() => import('./screens/ProfileScreen.jsx'))
const NewPasswordScreen = lazy(() => import('./screens/NewPasswordScreen.jsx'))
const HandRankingScreen = lazy(() => import('./components/HandRankingScreen.jsx'))

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
  const { session, loading, recovering } = useAuth()
  if (loading) return <Splash />
  if (!session) return <Navigate to="/login" replace />
  // Chegou pelo link de recuperação: trocar a senha vem antes de tudo, mesmo
  // que o Supabase tenha devolvido a pessoa na raiz em vez de /nova-senha.
  if (recovering) return <NewPasswordScreen />
  return children
}

// Conta recém-criada cai direto em terminar o perfil. É o nome dela que os
// outros vão ver no grupo — deixar para depois significa aparecer como e-mail
// na lista de todo mundo.
function RequireProfile({ children }) {
  const { loading, needsSetup } = useMyProfile()
  if (loading) return <Splash />
  if (needsSetup) return <Navigate to="/perfil?novo=1" replace />
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

// As portas em ordem: sessão → perfil preenchido → grupo aberto. Cada rota
// declara só até onde precisa, e `/perfil` fica de fora da porta do perfil
// porque é justamente para lá que ela manda a pessoa.
function Guarded({ profile = true, group = true, children }) {
  let node = children
  if (group) node = <RequireGroup>{node}</RequireGroup>
  if (profile) node = <RequireProfile>{node}</RequireProfile>
  return <RequireAuth>{node}</RequireAuth>
}

export default function App() {
  // Tema é global (roda antes mesmo do login).
  useTheme()

  useEffect(() => startQueueFlusher(), [])

  if (!isSupabaseConfigured) return <ConfigMissing />

  return (
    <AuthProvider>
      <MyProfileProvider>
        <GroupProvider>
          <BrowserRouter>
            {/* As telas carregadas sob demanda mostram o mesmo splash das
                portas enquanto o pedaço delas chega — e a barreira acima pega
                o caso de o pedaço não chegar nunca, que sem ela dava tela
                branca sem explicação. */}
            <ErrorBoundary>
             <Suspense fallback={<Splash />}>
              <Routes>
              {/* Pública: quem recebe o link do acerto não precisa de conta. */}
              <Route path="/acerto/:token" element={<SharedSettlementScreen />} />
              <Route path="/ao-vivo/:token" element={<SharedTableScreen />} />
              <Route path="/login" element={<LoginRoute />} />
              <Route path="/nova-senha" element={<RequireAuth><NewPasswordScreen /></RequireAuth>} />

              {/* Perfil é a tela do onboarding: sem porta de perfil, senão o
                  redirecionamento cairia em cima de si mesmo. */}
              <Route path="/perfil" element={<RequireAuth><ProfileScreen /></RequireAuth>} />
              <Route path="/perfil/:userId" element={<Guarded group={false}><ProfileScreen /></Guarded>} />

              <Route path="/grupos" element={<Guarded group={false}><GroupsScreen /></Guarded>} />
              {/* Convite do grupo: mesma tela, com o código já preenchido. */}
              <Route path="/entrar/:code" element={<Guarded group={false}><GroupsScreen /></Guarded>} />

              {/* Mesma tela do perfil pelo lado do elenco: o jogador sem conta
                  (visitante) também tem página e números. */}
              <Route path="/jogador/:playerId" element={<Guarded><ProfileScreen /></Guarded>} />
              <Route path="/" element={<Guarded><TablesScreen /></Guarded>} />
              <Route path="/nova" element={<Guarded><CreateTableScreen /></Guarded>} />
              <Route path="/estatisticas" element={<Guarded><StatsScreen /></Guarded>} />
              <Route path="/mesa/:id" element={<Guarded><TableScreen /></Guarded>} />
              <Route path="/mesa/:id/acerto" element={<Guarded><SettlementScreen /></Guarded>} />

              {/* Referência estática, sem dado de ninguém: aberta para o convidado
                  que chega pelo link do acerto poder consultar também. */}
              <Route path="/ranking" element={<RankingRoute />} />
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
             </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </GroupProvider>
      </MyProfileProvider>
    </AuthProvider>
  )
}
