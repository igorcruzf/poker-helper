import Avatar from './Avatar.jsx'
import { profileName } from '../utils.js'
import { useI18n } from '../hooks/useI18n.js'

// O elenco do grupo com a conta por trás de cada nome. Todo mundo tem página e
// estatísticas — quem ainda não tem conta no app entra como "visitante", até
// alguém assumir aquele jogador.
export default function GroupRosterModal({ open, roster, members, onOpenPerson, onClose }) {
  const { t } = useI18n()
  if (!open) return null

  const memberByPlayer = {}
  members.forEach((m) => {
    if (m.player_id) memberByPlayer[m.player_id] = m
  })

  return (
    <div className="overlay">
      <div className="modal modal-wide">
        <p className="question">{t('groups.roster')}</p>

        {roster.length === 0 && <div className="empty-state">{t('groups.emptyRoster')}</div>}

        <div className="roster-people">
          {roster.map((p) => {
            const member = memberByPlayer[p.id]
            const name = profileName(member?.profile)
            return (
              <button
                key={p.id}
                className="person-row"
                onClick={() => onOpenPerson(member?.user_id || null, p.id)}
              >
                <Avatar photo={member?.profile?.photo} name={name || p.label} size="sm" />
                <span className="person-text">
                  <strong>{p.label}</strong>
                  {member
                    ? <small>{name || t('profile.noName')}</small>
                    : <small className="visitor-tag">{t('profile.visitor')}</small>}
                </span>
                <span className="person-cta">→</span>
              </button>
            )
          })}
        </div>

        <div className="modal-actions">
          <div className="round-action cancel" onClick={onClose}>✕</div>
        </div>
      </div>
    </div>
  )
}
