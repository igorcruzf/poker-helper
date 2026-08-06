import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTable } from '../hooks/useTable.js'
import { settlementProgress } from '../lib/settlement.js'
import { buildSummaryText, copyText, shareUrlFor } from '../lib/summary.js'
import { computeSaldo, fmt, fmtDate, saldoClass } from '../utils.js'
import ReopenTableModal from '../components/ReopenTableModal.jsx'
import Header from '../components/Header.jsx'
import ThemeModal from '../components/ThemeModal.jsx'
import { useAuth } from '../hooks/useAuth.jsx'
import { useTheme } from '../hooks/useTheme.js'
import { useInstallPrompt } from '../hooks/useInstallPrompt.js'

export default function SettlementScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { table, players, settlements, buyIn, loading, error, markPaid, reopenTable } = useTable(id)
  const { signOut, user } = useAuth()
  const [theme, setTheme] = useTheme()
  const { canInstall, promptInstall } = useInstallPrompt()
  const [themeOpen, setThemeOpen] = useState(false)
  const [copyLabel, setCopyLabel] = useState('Copiar resumo')
  const [linkLabel, setLinkLabel] = useState('Copiar link do acerto')
  const [reopenOpen, setReopenOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  if (loading) {
    return (
      <div className="app-shell">
        <div className="app"><div className="empty-state">Carregando acerto…</div></div>
      </div>
    )
  }

  if (error || !table) {
    return (
      <div className="app-shell">
        <div className="app">
          <div className="empty-state">Não foi possível abrir o acerto.<br />{error}</div>
          <div className="footer-actions">
            <button className="add-player-btn" onClick={() => navigate('/')}>Minhas mesas</button>
          </div>
        </div>
      </div>
    )
  }

  const nameOf = (tablePlayerId) =>
    players.find((p) => p.id === tablePlayerId)?.name || '(removido)'

  const progress = settlementProgress(settlements)
  const ordered = [...settlements].sort((a, b) => Number(a.paid) - Number(b.paid))
  const balances = players
    .map((p) => ({ ...p, saldo: computeSaldo(p, buyIn) }))
    .sort((a, b) => b.saldo - a.saldo)

  async function handleCopy() {
    const ok = await copyText(
      buildSummaryText(players, buyIn, {
        withSettlement: true,
        settlementMode: table.settlement_mode,
        shareUrl: shareUrlFor(table.share_token),
      })
    )
    setCopyLabel(ok ? 'Copiado!' : 'Não consegui copiar')
    setTimeout(() => setCopyLabel('Copiar resumo'), 1600)
  }

  async function handleCopyLink() {
    const ok = await copyText(shareUrlFor(table.share_token))
    setLinkLabel(ok ? 'Copiado!' : 'Não consegui copiar')
    setTimeout(() => setLinkLabel('Copiar link do acerto'), 1600)
  }

  async function handleReopen() {
    setBusy(true)
    const { error } = await reopenTable()
    setBusy(false)
    setReopenOpen(false)
    if (!error) navigate(`/mesa/${id}`, { replace: true })
  }

  return (
    <div className="app-shell">
      <div className="app">
        <Header
          onOpenRanking={() => navigate('/ranking')}
          onOpenTables={() => navigate('/')}
          onOpenThemes={() => setThemeOpen(true)}
          onLogout={signOut}
          userEmail={user?.email}
          canInstall={canInstall}
          onInstall={promptInstall}
          subtitle="Acerto de contas"
        />

        <div className="rail">
          <div className="card">
            <div className="settle-head">
              <span className="history-date">{fmtDate(table.finished_at || table.created_at)}</span>
              <span className="history-buyin">
                {table.name ? `${table.name} · ` : ''}cacife {fmt(table.buy_in)}
              </span>
            </div>

            <div className={`settle-summary${progress.pending === 0 ? ' done' : ''}`}>
              {settlements.length === 0
                ? 'Nada a acertar nesta mesa.'
                : progress.pending === 0
                  ? '✓ Todo mundo acertou'
                  : `${progress.pending} de ${progress.total} pagamentos pendentes · ${fmt(progress.pendingAmount)}`}
            </div>

            <div className="settle-list">
              {ordered.map((s) => (
                <div className={`settle-row${s.paid ? ' paid' : ''}`} key={s.id}>
                  <label className="settle-check">
                    <input
                      type="checkbox"
                      checked={!!s.paid}
                      onChange={(e) => markPaid(s.id, e.target.checked)}
                    />
                  </label>
                  <span className="settle-flow">
                    <strong>{nameOf(s.from_table_player_id)}</strong>
                    <span className="settle-arrow">paga para</span>
                    <strong>{nameOf(s.to_table_player_id)}</strong>
                  </span>
                  <span className="settle-amount">{fmt(s.amount)}</span>
                </div>
              ))}
            </div>

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

        <div className="footer-actions">
          <button className="export-btn" title="Copiar resumo da mesa" onClick={handleCopy}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            {copyLabel}
          </button>
          <button className="export-btn" title="Link público do acerto" onClick={handleCopyLink}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
              <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
            </svg>
            {linkLabel}
          </button>
          <button className="export-btn" onClick={() => setReopenOpen(true)} disabled={busy}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <polyline points="21 3 21 9 15 9" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              <polyline points="3 21 3 15 9 15" />
            </svg>
            Reabrir mesa
          </button>
          <button className="add-player-btn" onClick={() => navigate('/nova')}>Nova mesa</button>
        </div>
      </div>

      <ThemeModal open={themeOpen} theme={theme} onSelect={setTheme} onClose={() => setThemeOpen(false)} />

      <ReopenTableModal
        open={reopenOpen}
        hasPayments={progress.paid > 0}
        onCancel={() => setReopenOpen(false)}
        onConfirm={handleReopen}
      />
    </div>
  )
}
