import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { settlementProgress } from '../lib/settlement.js'
import { computeSaldo, fmt, fmtDate, saldoClass } from '../utils.js'
import Header from '../components/Header.jsx'
import ThemeModal from '../components/ThemeModal.jsx'
import { useTheme } from '../hooks/useTheme.js'
import { useInstallPrompt } from '../hooks/useInstallPrompt.js'

// Tela aberta por link, sem login. Todo o acesso passa pelas funções
// get_shared_settlement / set_shared_payment, que validam o token no banco.
export default function SharedSettlementScreen() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [theme, setTheme] = useTheme()
  const { canInstall, promptInstall } = useInstallPrompt()
  const [themeOpen, setThemeOpen] = useState(false)
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
        <div className="app"><div className="empty-state">Carregando acerto…</div></div>
      </div>
    )
  }

  if (error || !data) {
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
  const players = data.players || []
  const settlements = data.settlements || []
  const buyIn = Number(table.buy_in)
  const canPay = table.allow_guest_payments && table.status === 'finished'

  const nameOf = (id) => players.find((p) => p.id === id)?.name || '(removido)'
  const progress = settlementProgress(settlements)
  const ordered = [...settlements].sort((a, b) => Number(a.paid) - Number(b.paid))
  const balances = players
    .map((p) => ({ ...p, cacifes: Number(p.cacifes), saldo: computeSaldo({ ...p, cacifes: Number(p.cacifes), adjustment: Number(p.adjustment) }, buyIn) }))
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
      setError('Não foi possível registrar. Recarregue e tente de novo.')
      load()
    }
  }

  return (
    <div className="app-shell">
      <div className="app">
        <Header
          onOpenHome={() => navigate('/')}
          onOpenRanking={() => navigate('/ranking')}
          onOpenThemes={() => setThemeOpen(true)}
          canInstall={canInstall}
          onInstall={promptInstall}
          subtitle={table.name || 'Acerto de contas'}
        />

        <div className="rail">
          <div className="card">
            <div className="settle-head">
              <span className="history-date">{fmtDate(table.finished_at || table.created_at)}</span>
              <span className="history-buyin">cacife {fmt(buyIn)}</span>
            </div>

            {table.status !== 'finished' ? (
              <div className="settle-summary">
                A mesa foi reaberta — o acerto está sendo refeito. Volte daqui a pouco.
              </div>
            ) : (
              <>
                <div className={`settle-summary${progress.pending === 0 ? ' done' : ''}`}>
                  {settlements.length === 0
                    ? 'Nada a acertar nesta mesa.'
                    : progress.pending === 0
                      ? '✓ Todo mundo acertou'
                      : `${progress.pending} de ${progress.total} pagamentos pendentes · ${fmt(progress.pendingAmount)}`}
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
                        <span className="settle-arrow">paga para</span>
                        <strong>{nameOf(s.to_table_player_id)}</strong>
                      </span>
                      <span className="settle-amount">{fmt(s.amount)}</span>
                    </div>
                  ))}
                </div>

                <p className="settle-note">
                  {canPay
                    ? 'Marque quando pagar — todo mundo com o link vê a atualização.'
                    : 'Só quem organizou a mesa pode marcar os pagamentos.'}
                </p>
              </>
            )}

            <div className="section-title">Saldos finais</div>
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

      <ThemeModal open={themeOpen} theme={theme} onSelect={setTheme} onClose={() => setThemeOpen(false)} />
    </div>
  )
}
