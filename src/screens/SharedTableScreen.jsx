import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { computeSaldo, fmt, saldoClass } from '../utils.js'
import AppChrome from '../components/AppChrome.jsx'
import BuyInRow from '../components/BuyInRow.jsx'
import { useI18n } from '../hooks/useI18n.js'

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
  const { t } = useI18n()
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
    const id = setInterval(() => forceTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  if (loading) {
    return (
      <div className="app-shell">
        <div className="app"><div className="empty-state">{t('live.loading')}</div></div>
      </div>
    )
  }

  if (failed || !data) {
    return (
      <div className="app-shell">
        <div className="app">
          <div className="header-titles auth-titles">
            <div className="eyebrow">{t('eyebrow.table')}</div>
            <h1><span className="suit gold">♠</span>Cacifes<span className="suit red">♥</span></h1>
          </div>
          <div className="card">
            <div className="empty-state">
              {t('settle.invalidLink')}<br />{t('settle.invalidLinkHint')}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const table = data.table
  const buyIn = Number(table.buy_in)
  const rebuy = table.rebuy_value === null || table.rebuy_value === undefined
    ? buyIn
    : Number(table.rebuy_value)
  const players = (data.players || []).map((p) => ({
    ...p,
    cacifes: Number(p.cacifes),
    adjustment: Number(p.adjustment),
  }))
  const total = players.reduce((acc, p) => acc + computeSaldo(p, buyIn, rebuy), 0)
  const timer = table.timer_state
  const secondsLeft = remainingSeconds(timer)
  const smallBlind = timer ? timer.baseBlind * Math.pow(2, timer.level) : 0

  return (
    <div className="app-shell">
      <div className="app">
        <AppChrome
          onOpenHome={() => navigate('/')}
          onOpenRanking={() => navigate('/ranking')}
          subtitle={table.name || t('eyebrow.live')}
        />

        {table.status === 'finished' ? (
          <button className="active-table-card" onClick={() => navigate(`/acerto/${token}`)}>
            <span className="active-table-flag">{t('live.finished')}</span>
            <span className="active-table-name">{t('live.finishedName')}</span>
            <span className="active-table-cta">{t('live.finishedCta')}</span>
          </button>
        ) : (
          <div className="live-flag">
            <span className="live-dot" /> {t('live.flag')}
          </div>
        )}

        {timer?.active && (
          <div className={`timer-bar${timer.awaitingConfirm ? ' alert' : ''}`}>
            <span className="timer-bar-time">
              {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
              {String(secondsLeft % 60).padStart(2, '0')}
            </span>
            <span className="timer-bar-info">
              {t('table.level', { level: timer.level + 1, small: smallBlind, big: smallBlind * 2 })}
              {!timer.running && !timer.awaitingConfirm && t('live.paused')}
            </span>
            {timer.awaitingConfirm && <span className="timer-bar-flag">{t('live.blindUp')}</span>}
          </div>
        )}

        <div className="rail">
          <div className="card">
            <BuyInRow buyIn={buyIn} rebuy={rebuy} />

            <div className="col-labels live-labels">
              <span>{t('table.name')}</span>
              <span>{t('table.cacifes')}</span>
              <span>{t('table.saldo')}</span>
            </div>

            <div className="players">
              {players.map((p) => {
                const saldo = computeSaldo(p, buyIn, rebuy)
                return (
                  <div className="live-row" key={p.id}>
                    <span className="live-name">{p.name}</span>
                    <span className="live-cacifes">{p.cacifes}</span>
                    <span className={`live-saldo ${saldoClass(saldo)}`}>{fmt(saldo)}</span>
                  </div>
                )
              })}
            </div>

            {players.length === 0 && <div className="empty-state">{t('live.noPlayers')}</div>}

            {players.length > 0 && (
              <div className="total-row">
                <span>{t('table.total')}</span>
                <span className={saldoClass(total)}>{fmt(total)}</span>
              </div>
            )}

            <p className="settle-note">{t('live.readOnly')}</p>
          </div>
        </div>
      </div>

    </div>
  )
}
