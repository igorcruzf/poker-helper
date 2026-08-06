import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { computeSaldo, fmt, saldoClass } from '../utils.js'
import Header from '../components/Header.jsx'
import ThemeModal from '../components/ThemeModal.jsx'
import { useTheme } from '../hooks/useTheme.js'
import { useInstallPrompt } from '../hooks/useInstallPrompt.js'

const POLL_MS = 10000

// Quanto falta do nível: com o timer rodando o servidor guardou o instante em
// que ele acaba, então cada aparelho conta sozinho e fica no mesmo segundo.
function remainingSeconds(timer) {
  if (!timer) return 0
  if (timer.running && timer.endsAt) {
    return Math.max(0, Math.round((timer.endsAt - Date.now()) / 1000))
  }
  return Math.max(0, timer.secondsLeft || 0)
}

export default function SharedTableScreen() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [theme, setTheme] = useTheme()
  const { canInstall, promptInstall } = useInstallPrompt()
  const [themeOpen, setThemeOpen] = useState(false)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [, forceTick] = useState(0)
  const firstLoad = useRef(true)

  const load = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase.rpc('get_shared_settlement', { p_token: token })
    if (error || !data) {
      if (firstLoad.current) setFailed(true)
    } else {
      setData(data)
      setFailed(false)
    }
    firstLoad.current = false
    setLoading(false)
  }, [token])

  useEffect(() => {
    load()
    const id = setInterval(load, POLL_MS)
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  // Faz o relógio andar entre uma sincronização e outra.
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  if (loading) {
    return (
      <div className="app-shell">
        <div className="app"><div className="empty-state">Carregando mesa…</div></div>
      </div>
    )
  }

  if (failed || !data) {
    return (
      <div className="app-shell">
        <div className="app">
          <div className="header-titles auth-titles">
            <div className="eyebrow">Mesa de Poker</div>
            <h1><span className="suit gold">♠</span>Cacifes<span className="suit red">♥</span></h1>
          </div>
          <div className="card">
            <div className="empty-state">
              Link inválido ou expirado.<br />Peça um novo para quem organizou a mesa.
            </div>
          </div>
        </div>
      </div>
    )
  }

  const table = data.table
  const buyIn = Number(table.buy_in)
  const players = (data.players || []).map((p) => ({
    ...p,
    cacifes: Number(p.cacifes),
    adjustment: Number(p.adjustment),
  }))
  const total = players.reduce((acc, p) => acc + computeSaldo(p, buyIn), 0)
  const timer = table.timer_state
  const secondsLeft = remainingSeconds(timer)
  const smallBlind = timer ? timer.baseBlind * Math.pow(2, timer.level) : 0

  return (
    <div className="app-shell">
      <div className="app">
        <Header
          onOpenHome={() => navigate('/')}
          onOpenRanking={() => navigate('/ranking')}
          onOpenThemes={() => setThemeOpen(true)}
          canInstall={canInstall}
          onInstall={promptInstall}
          subtitle={table.name || 'Mesa ao vivo'}
        />

        {table.status === 'finished' ? (
          <button className="active-table-card" onClick={() => navigate(`/acerto/${token}`)}>
            <span className="active-table-flag">Mesa encerrada</span>
            <span className="active-table-name">O acerto já saiu</span>
            <span className="active-table-cta">Ver quem paga quem →</span>
          </button>
        ) : (
          <div className="live-flag">
            <span className="live-dot" /> Ao vivo · atualiza sozinho
          </div>
        )}

        {timer?.active && (
          <div className={`timer-bar${timer.awaitingConfirm ? ' alert' : ''}`}>
            <span className="timer-bar-time">
              {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
              {String(secondsLeft % 60).padStart(2, '0')}
            </span>
            <span className="timer-bar-info">
              Nível {timer.level + 1} · {smallBlind}/{smallBlind * 2}
              {!timer.running && !timer.awaitingConfirm && ' · pausado'}
            </span>
            {timer.awaitingConfirm && <span className="timer-bar-flag">⏰ Subiu o blind</span>}
          </div>
        )}

        <div className="rail">
          <div className="card">
            <div className="buyin-row">
              <span className="buyin-label">Valor do cacife</span>
              <div className="buyin-input-wrap">
                <span>R$</span>
                <span className="buyin-static">{buyIn.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <div className="col-labels">
              <span>Nome</span>
              <span>Cacifes</span>
              <span>Saldo</span>
            </div>

            <div className="players">
              {players.map((p) => {
                const saldo = computeSaldo(p, buyIn)
                return (
                  <div className="live-row" key={p.id}>
                    <span className="live-name">{p.name}</span>
                    <span className="live-cacifes">{p.cacifes}</span>
                    <span className={`live-saldo ${saldoClass(saldo)}`}>{fmt(saldo)}</span>
                  </div>
                )
              })}
            </div>

            {players.length === 0 && <div className="empty-state">Mesa ainda sem jogadores.</div>}

            {players.length > 0 && (
              <div className="total-row">
                <span>Total da mesa</span>
                <span className={saldoClass(total)}>{fmt(total)}</span>
              </div>
            )}

            <p className="settle-note">
              Você está vendo a mesa por um link — dá para acompanhar, não para alterar.
            </p>
          </div>
        </div>
      </div>

      <ThemeModal open={themeOpen} theme={theme} onSelect={setTheme} onClose={() => setThemeOpen(false)} />
    </div>
  )
}
