import { useI18n } from '../hooks/useI18n.js'

// "Qual desses nomes é você?" — usado tanto por quem está se identificando
// quanto pelo host arrumando o vínculo de outra pessoa. Jogadores já
// representados por outro membro aparecem travados, para não haver dois donos
// do mesmo histórico.
export default function PickPlayerModal({
  open,
  title,
  roster,
  takenBy,
  currentPlayerId,
  onCancel,
  onConfirm,
}) {
  const { t } = useI18n()
  if (!open) return null

  return (
    <div className="overlay">
      <div className="modal">
        <p className="question">{title}</p>

        <div className="theme-list pick-list">
          {roster.map((p) => {
            const claimedBy = takenBy?.[p.id]
            const mine = p.id === currentPlayerId
            const blocked = !!claimedBy && !mine
            return (
              <button
                key={p.id}
                className={`theme-option${mine ? ' active' : ''}`}
                disabled={blocked}
                onClick={() => onConfirm(p.id)}
              >
                <span className="theme-name">
                  {p.label || p.name}
                  {blocked && <small>{t('groups.takenBy', { name: claimedBy })}</small>}
                </span>
                {mine && <span className="theme-check">✓</span>}
              </button>
            )
          })}

          <button
            className={`theme-option${!currentPlayerId ? ' active' : ''}`}
            onClick={() => onConfirm(null)}
          >
            <span className="theme-name">
              {t('groups.onlyOrganize')}
              <small>{t('groups.onlyOrganizeHint')}</small>
            </span>
            {!currentPlayerId && <span className="theme-check">✓</span>}
          </button>
        </div>

        {roster.length === 0 && <div className="empty-state">{t('groups.emptyRoster')}</div>}

        <div className="modal-actions">
          <div className="round-action cancel" onClick={onCancel}>✕</div>
        </div>
      </div>
    </div>
  )
}
