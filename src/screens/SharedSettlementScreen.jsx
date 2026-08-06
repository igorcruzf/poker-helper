import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { settlementProgress } from '../lib/settlement.js'
import { computeSaldo, fmt, fmtDate, saldoClass } from '../utils.js'
import AppChrome from '../components/AppChrome.jsx'
import { useI18n } from '../hooks/useI18n.js'

// Tela aberta por link, sem login. Todo o acesso passa pelas funções
// get_shared_settlement / set_shared_payment, que validam o token no banco.
export default function SharedSettlementScreen() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { t } = useI18n()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(null)

  const load = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase.rpc('get_shared_settlement', { p_token: token })
    if (error) setError(error.message)
    else if (!data) setError('notfound')
    else setData(data)
    setLoading(false)
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="app-shell">
        <div className="app"><div className="empty-state">{t('settle.loading')}</div></div>
      </div>
    )
  }

  if (error || !data) {
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
  const players = data.players || []
  const settlements = data.settlements || []
  const buyIn = Number(table.buy_in)
  const rebuy = table.rebuy_value === null || table.rebuy_value === undefined
    ? buyIn
    : Number(table.rebuy_value)
  const canPay = table.allow_guest_payments && table.status === 'finished'

  const nameOf = (id) => players.find((p) => p.id === id)?.name || t('settle.removed')
  const progress = settlementProgress(settlements)
  const ordered = [...settlements].sort((a, b) => Number(a.paid) - Number(b.paid))
  const balances = players
    .map((p) => {
      const player = { ...p, cacifes: Number(p.cacifes), adjustment: Number(p.adjustment) }
      return { ...player, saldo: computeSaldo(player, buyIn, rebuy) }
    })
    .sort((a, b) => b.saldo - a.saldo)

  async function togglePaid(settlement, paid) {
    setSaving(settlement.id)
    // Otimista: a lista responde na hora e o recarregamento confirma.
    setData((d) => ({
      ...d,
      settlements: d.settlements.map((s) => (s.id === settlement.id ? { ...s, paid } : s)),
    }))
    const { data: ok, error } = await supabase.rpc('set_shared_payment', {
      p_token: token,
      p_settlement_id: settlement.id,
      p_paid: paid,
    })
    setSaving(null)
    if (error || ok === false) {
      setError(t('settle.saveFailed'))
      load()
    }
  }

  return (
    <div className="app-shell">
      <div className="app">
        <AppChrome
          onOpenHome={() => navigate('/')}
          onOpenRanking={() => navigate('/ranking')}
          subtitle={table.name || t('eyebrow.settlement')}
        />

        <div className="rail">
          <div className="card">
            <div className="settle-head">
              <span className="history-date">{fmtDate(table.finished_at || table.created_at)}</span>
              <span className="history-buyin">{fmt(buyIn)}</span>
            </div>

            {table.status !== 'finished' ? (
              <div className="settle-summary">
                {t('settle.reopened')}
              </div>
            ) : (
              <>
                <div className={`settle-summary${progress.pending === 0 ? ' done' : ''}`}>
                  {settlements.length === 0
                    ? t('settle.nothing')
                    : progress.pending === 0
                      ? t('settle.allDone')
                      : t('settle.pending', {
                          pending: progress.pending,
                          total: progress.total,
                          amount: fmt(progress.pendingAmount),
                        })}
                </div>

                {error && <div className="auth-error">{error}</div>}

                <div className="settle-list">
                  {ordered.map((s) => (
                    <div className={`settle-row${s.paid ? ' paid' : ''}`} key={s.id}>
                      {canPay ? (
                        <label className="settle-check">
                          <input
                            type="checkbox"
                            checked={!!s.paid}
                            disabled={saving === s.id}
                            onChange={(e) => togglePaid(s, e.target.checked)}
                          />
                        </label>
                      ) : (
                        <span className="settle-check-static">{s.paid ? '✓' : '•'}</span>
                      )}
                      <span className="settle-flow">
                        <strong>{nameOf(s.from_table_player_id)}</strong>
                        <span className="settle-arrow">{t('settle.paysTo')}</span>
                        <strong>{nameOf(s.to_table_player_id)}</strong>
                      </span>
                      <span className="settle-amount">{fmt(s.amount)}</span>
                    </div>
                  ))}
                </div>

                <p className="settle-note">
                  {canPay ? t('settle.guestCanPay') : t('settle.guestReadOnly')}
                </p>
              </>
            )}

            <div className="section-title">{t('settle.finalBalances')}</div>
            <div className="history-players">
              {balances.map((p) => (
                <div className="history-player" key={p.id}>
                  <span className="hp-name">{p.name} <small>({p.cacifes}x)</small></span>
                  <span className={`hp-saldo ${saldoClass(p.saldo)}`}>{fmt(p.saldo)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
