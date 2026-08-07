import { useI18n } from '../hooks/useI18n.js'

export default function GroupRequestsModal({ open, requests, loading, isOwner, admin, onClose }) {
  const { t } = useI18n()
  if (!open) return null

  return (
    <div className="overlay">
      <div className="modal modal-wide">
        <p className="question">{t('groups.requests')}</p>

        {loading && <div className="empty-state">{t('common.loading')}</div>}

        {!loading && requests.length === 0 && (
          <div className="empty-state">{t('groups.noRequests')}</div>
        )}

        {/* Nome, e-mail e botões em linhas próprias. Lado a lado, o e-mail —
            que é longo — espremia os botões e quebrava no meio. */}
        {requests.map((r) => (
          <div className="request-card" key={r.id}>
            <div className="request-head">
              <strong>{r.claimedName || t('groups.unnamed')}</strong>
              <span className={`request-tag${r.isNewPlayer ? ' new' : ''}`}>
                {r.isNewPlayer ? t('groups.newPlayer') : t('groups.existingPlayer')}
              </span>
            </div>

            <span className="request-email">{r.email}</span>

            <div className="request-buttons">
              <button className="roster-add-btn" onClick={() => admin.approve(r.id, 'member')}>
                {t('groups.approve')}
              </button>
              {/* Só o dono entrega o crachá de host — a função no banco recusa
                  o pedido de qualquer outro, então o botão só aparece para ele. */}
              {isOwner && (
                <button className="roster-add-btn" onClick={() => admin.approve(r.id, 'host')}>
                  {t('groups.approveHost')}
                </button>
              )}
              <button className="request-reject" onClick={() => admin.reject(r.id)}>
                {t('groups.reject')}
              </button>
            </div>
          </div>
        ))}

        <div className="modal-actions">
          <div className="round-action cancel" onClick={onClose}>✕</div>
        </div>
      </div>
    </div>
  )
}
