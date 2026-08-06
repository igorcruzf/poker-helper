import { useState } from 'react'
import { fmt } from '../utils.js'
import { EPS } from '../lib/settlement.js'
import { useI18n } from '../hooks/useI18n.js'

// `previewFor(balanceMode)` recalcula o acerto conforme a escolha de fechamento.
export default function EndGameModal({ open, players, total, previewFor, guestPayments, onCancel, onConfirm }) {
  const { t } = useI18n()
  // null = ainda não escolheu como fechar a conta.
  const [balanceMode, setBalanceMode] = useState(null)
  const [withLink, setWithLink] = useState(true)

  if (!open) return null

  const needsBalance = Math.abs(total) > EPS && players.length > 0

  function handleCancel() {
    setBalanceMode(null)
    onCancel()
  }

  // Enquanto a soma dos saldos não fecha em zero, pergunta o que fazer com a
  // diferença — o acerto montado por cima de uma conta aberta aponta pagamento
  // que não existe.
  if (needsBalance && !balanceMode) {
    return (
      <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) handleCancel() }}>
        <div className="modal">
          <button className="close-x" onClick={handleCancel}>✕</button>
          <p className="question">{t('endGame.unbalancedTitle')}</p>
          <div className="share-text" style={{ textAlign: 'center' }}>
            {t('endGame.unbalancedBody', { total: fmt(total) })}
          </div>
          <button className="reset-choice-btn keep" onClick={() => setBalanceMode('even')}>
            {t('endGame.even')}
            <small>{t('endGame.evenHint')}</small>
          </button>
          <button className="reset-choice-btn keep" onClick={() => setBalanceMode('top')}>
            {t('endGame.top')}
            <small>{t('endGame.topHint')}</small>
          </button>
          <button className="reset-choice-btn full" onClick={() => setBalanceMode('ignore')}>
            {t('endGame.ignore')}
            <small>{t('endGame.ignoreHint')}</small>
          </button>
          <button className="reset-cancel-link" onClick={handleCancel}>{t('common.cancel')}</button>
        </div>
      </div>
    )
  }

  const preview = previewFor(balanceMode)
  const nameOf = (id) => players.find((p) => p.id === id)?.name || '—'
  const transfers = preview?.transfers || []
  const imbalance = preview?.imbalance || 0

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) handleCancel() }}>
      <div className="modal modal-wide">
        <p className="question">{t('endGame.title')}</p>
        <p className="modal-hint" style={{ textAlign: 'center' }}>
          {t('endGame.hint')}
        </p>

        {preview?.collectorId && (
          <div className="settle-collector">
            {t('endGame.collector')} <strong>{nameOf(preview.collectorId)}</strong>
          </div>
        )}

        {Math.abs(imbalance) > EPS && (
          <div className="auth-error">
            {t('endGame.openAccount', { amount: fmt(imbalance) })}
          </div>
        )}

        <div className="settle-list">
          {transfers.length === 0 && (
            <div className="empty-state">{t('endGame.nobodyOwes')}</div>
          )}
          {transfers.map((transfer, i) => (
            <div className="settle-row" key={i}>
              <span className="settle-flow">
                <strong>{nameOf(transfer.fromId)}</strong>
                <span className="settle-arrow">{t('settle.paysTo')}</span>
                <strong>{nameOf(transfer.toId)}</strong>
              </span>
              <span className="settle-amount">{fmt(transfer.amount)}</span>
            </div>
          ))}
        </div>

        <label className="switch-row">
          <input type="checkbox" checked={withLink} onChange={(e) => setWithLink(e.target.checked)} />
          <span>
            {t('endGame.withLink')}
            <small>
              {guestPayments ? t('endGame.withLinkGuest') : t('endGame.withLinkReadOnly')}
            </small>
          </span>
        </label>

        {needsBalance && (
          <button className="reset-cancel-link" onClick={() => setBalanceMode(null)}>
            {t('endGame.changeMode')}
          </button>
        )}

        <div className="modal-actions">
          <div className="round-action cancel" onClick={handleCancel}>✕</div>
          <div className="round-action confirm" onClick={() => onConfirm(balanceMode, withLink)}>✓</div>
        </div>
      </div>
    </div>
  )
}
