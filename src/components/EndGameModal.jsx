import { useState } from 'react'
import { fmt } from '../utils.js'
import { EPS } from '../lib/settlement.js'

// `previewFor(balanceMode)` recalcula o acerto conforme a escolha de fechamento.
export default function EndGameModal({ open, players, total, previewFor, guestPayments, onCancel, onConfirm }) {
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
          <p className="question">O saldo total não é zero</p>
          <div className="share-text" style={{ textAlign: 'center' }}>
            Total atual: {fmt(total)}.{'\n'}Como deseja encerrar o jogo?
          </div>
          <button className="reset-choice-btn keep" onClick={() => setBalanceMode('even')}>
            Distribuir igualmente
            <small>Aplica a diferença dividida por igual entre todos os jogadores.</small>
          </button>
          <button className="reset-choice-btn keep" onClick={() => setBalanceMode('top')}>
            Ajustar no maior saldo
            <small>Desconta a diferença do maior saldo (dividida por igual se houver empate).</small>
          </button>
          <button className="reset-choice-btn full" onClick={() => setBalanceMode('ignore')}>
            Encerrar mesmo assim
            <small>Ignora a diferença; ela fica toda com quem centraliza o acerto.</small>
          </button>
          <button className="reset-cancel-link" onClick={handleCancel}>Cancelar</button>
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
        <p className="question">Encerrar jogo?</p>
        <p className="modal-hint" style={{ textAlign: 'center' }}>
          A mesa vai para o histórico e o resumo é copiado. Você marca quem pagou depois.
        </p>

        {preview?.collectorId && (
          <div className="settle-collector">
            Centraliza o acerto: <strong>{nameOf(preview.collectorId)}</strong>
          </div>
        )}

        {Math.abs(imbalance) > EPS && (
          <div className="auth-error">
            Conta aberta em {fmt(imbalance)} — essa diferença fica com quem centraliza.
          </div>
        )}

        <div className="settle-list">
          {transfers.length === 0 && (
            <div className="empty-state">Ninguém deve nada a ninguém.</div>
          )}
          {transfers.map((t, i) => (
            <div className="settle-row" key={i}>
              <span className="settle-flow">
                <strong>{nameOf(t.fromId)}</strong>
                <span className="settle-arrow">paga para</span>
                <strong>{nameOf(t.toId)}</strong>
              </span>
              <span className="settle-amount">{fmt(t.amount)}</span>
            </div>
          ))}
        </div>

        <label className="switch-row">
          <input type="checkbox" checked={withLink} onChange={(e) => setWithLink(e.target.checked)} />
          <span>
            Incluir o link do acerto no resumo
            <small>
              {guestPayments
                ? 'Quem abrir não precisa de conta e pode marcar o próprio pagamento.'
                : 'Quem abrir vê o acerto sem precisar de conta; marcar pagamento é só seu.'}
            </small>
          </span>
        </label>

        {needsBalance && (
          <button className="reset-cancel-link" onClick={() => setBalanceMode(null)}>
            ← Trocar como fechar a conta
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
