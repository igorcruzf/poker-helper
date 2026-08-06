import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import { isSupabaseConfigured } from './lib/supabase.js'
import { startQueueFlusher } from './lib/syncQueue.js'
import { useTheme } from './hooks/useTheme.js'

import LoginScreen from './screens/LoginScreen.jsx'
import TablesScreen from './screens/TablesScreen.jsx'
import CreateTableScreen from './screens/CreateTableScreen.jsx'
import TableScreen from './screens/TableScreen.jsx'
import SettlementScreen from './screens/SettlementScreen.jsx'
import StatsScreen from './screens/StatsScreen.jsx'
import SharedSettlementScreen from './screens/SharedSettlementScreen.jsx'
import SharedTableScreen from './screens/SharedTableScreen.jsx'
import HandRankingScreen from './components/HandRankingScreen.jsx'

function Splash({ children }) {
  return (
    <div className="app-shell">
      <div className="app"><div className="empty-state">{children}</div></div>
    </div>
  )
}

function ConfigMissing() {
  return (
    <div className="app-shell">
      <div className="app">
        <div className="card" style={{ marginTop: 24 }}>
          <p className="question">Falta configurar o Supabase</p>
          <p className="modal-hint">
            Crie um arquivo <code>.env</code> na raiz do projeto (veja <code>.env.example</code>) com
            <code> VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> (ou
            <code> VITE_SUPABASE_ANON_KEY</code>), e <strong>reinicie</strong> o <code>npm run dev</code> —
            o Vite só lê o <code>.env</code> ao subir. Na Vercel, as mesmas variáveis vão em
            Settings → Environment Variables, seguidas de um novo deploy.
          </p>
        </div>
      </div>
    </div>
  )
}

function RequireAuth({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <Splash>Carregando…</Splash>
  if (!session) return <Navigate to="/login" replace />
  return children
}

function LoginRoute() {
  const { session, loading } = useAuth()
  if (loading) return <Splash>Carregando…</Splash>
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
      <BrowserRouter>
        <Routes>
          {/* Pública: quem recebe o link do acerto não precisa de conta. */}
          <Route path="/acerto/:token" element={<SharedSettlementScreen />} />
          <Route path="/ao-vivo/:token" element={<SharedTableScreen />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/" element={<RequireAuth><TablesScreen /></RequireAuth>} />
          <Route path="/nova" element={<RequireAuth><CreateTableScreen /></RequireAuth>} />
          <Route path="/estatisticas" element={<RequireAuth><StatsScreen /></RequireAuth>} />
          <Route path="/mesa/:id" element={<RequireAuth><TableScreen /></RequireAuth>} />
          <Route path="/mesa/:id/acerto" element={<RequireAuth><SettlementScreen /></RequireAuth>} />
          {/* Referência estática, sem dado de ninguém: aberta para o convidado
              que chega pelo link do acerto poder consultar também. */}
          <Route path="/ranking" element={<RankingRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
