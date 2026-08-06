import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTable } from '../hooks/useTable.js'
import { settlementProgress } from '../lib/settlement.js'
import { buildSummaryText, copyText, shareUrlFor } from '../lib/summary.js'
import { computeSaldo, fmt, fmtDate, saldoClass } from '../utils.js'
import ReopenTableModal from '../components/ReopenTableModal.jsx'
import AppChrome from '../components/AppChrome.jsx'
import { useAuth } from '../hooks/useAuth.jsx'
import { useI18n } from '../hooks/useI18n.js'

export default function SettlementScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { table, players, settlements, buyIn, rebuy, loading, error, markPaid, reopenTable } = useTable(id)
  const { signOut, user } = useAuth()
  const { t } = useI18n()
  const [copyLabel, setCopyLabel] = useState(null)
  const [linkLabel, setLinkLabel] = useState(null)
  const [reopenOpen, setReopenOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  if (loading) {
    return (
      <div className="app-shell">
        <div className="app"><div className="empty-state">{t('settle.loading')}</div></div>
      </div>
    )
  }

  if (error || !table) {
    return (
      <div className="app-shell">
        <div className="app">
          <div className="empty-state">{t('settle.loadFailed')}<br />{error}</div>
          <div className="footer-actions">
            <button className="add-player-btn" onClick={() => navigate('/')}>{t('settle.myTables')}</button>
          </div>
        </div>
      </div>
    )
  }

  const nameOf = (tablePlayerId) =>
    players.find((p) => p.id === tablePlayerId)?.name || t('settle.removed')

  const progress = settlementProgress(settlements)
  const ordered = [...settlements].sort((a, b) => Number(a.paid) - Number(b.paid))
  const balances = players
    .map((p) => ({ ...p, saldo: computeSaldo(p, buyIn, rebuy) }))
    .sort((a, b) => b.saldo - a.saldo)

  async function handleCopy() {
    const ok = await copyText(
      buildSummaryText(players, buyIn, {
        withSettlement: true,
        settlementMode: table.settlement_mode,
        rebuy,
        shareUrl: shareUrlFor(table.share_token),
      })
    )
    setCopyLabel(ok ? t('common.copied') : t('common.copyFailed'))
    setTimeout(() => setCopyLabel(null), 1600)
  }

  async function handleCopyLink() {
    const ok = await copyText(shareUrlFor(table.share_token))
    setLinkLabel(ok ? t('common.copied') : t('common.copyFailed'))
    setTimeout(() => setLinkLabel(null), 1600)
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
        <AppChrome
          onOpenRanking={() => navigate('/ranking')}
          onOpenTables={() => navigate('/')}
          onLogout={signOut}
          userEmail={user?.email}
          subtitle={t('eyebrow.settlement')}
        />

        <div className="rail">
          <div className="card">
            <div className="settle-head">
              <span className="history-date">{fmtDate(table.finished_at || table.created_at)}</span>
              <span className="history-buyin">
                {table.name ? `${table.name} · ` : ''}{fmt(table.buy_in)}
              </span>
            </div>

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
                    <span className="settle-arrow">{t('settle.paysTo')}</span>
                    <strong>{nameOf(s.to_table_player_id)}</strong>
                  </span>
                  <span className="settle-amount">{fmt(s.amount)}</span>
                </div>
              ))}
            </div>

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

        <div className="footer-actions">
          <button className="export-btn" title={t('common.copy')} onClick={handleCopy}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            {copyLabel || t('common.copy')}
          </button>
          <button className="export-btn" title={t('settle.copyLink')} onClick={handleCopyLink}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
              <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
            </svg>
            {linkLabel || t('settle.copyLink')}
          </button>
          <button className="export-btn" onClick={() => setReopenOpen(true)} disabled={busy}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <polyline points="21 3 21 9 15 9" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              <polyline points="3 21 3 15 9 15" />
            </svg>
            {t('settle.reopen')}
          </button>
          <button className="add-player-btn" onClick={() => navigate('/nova')}>{t('settle.newTable')}</button>
        </div>
      </div>

      <ReopenTableModal
        open={reopenOpen}
        hasPayments={progress.paid > 0}
        onCancel={() => setReopenOpen(false)}
        onConfirm={handleReopen}
      />
    </div>
  )
}
