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

        {requests.map((r) => (
          <div className="request-item" key={r.id}>
            <div className="request-who">
              <strong>{r.claimedName || t('groups.unnamed')}</strong>
              <small>
                {r.email}
                {r.isNewPlayer ? ` · ${t('groups.newPlayer')}` : ` · ${t('groups.existingPlayer')}`}
              </small>
            </div>
            <div className="request-actions">
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
              <button className="roster-del" title={t('groups.reject')} onClick={() => admin.reject(r.id)}>
                ✕
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
