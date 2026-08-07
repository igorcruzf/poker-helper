import Avatar from './Avatar.jsx'
import { profileName } from '../utils.js'
import { useI18n } from '../hooks/useI18n.js'

const ROLE_KEY = { owner: 'groups.roleOwner', host: 'groups.roleHost', member: 'groups.roleMember' }

export default function GroupMembersModal({
  open,
  members,
  loading,
  isOwner,
  isHost,
  myMembershipId,
  admin,
  onPickPlayerFor,
  onOpenProfile,
  onClose,
}) {
  const { t } = useI18n()
  if (!open) return null

  return (
    <div className="overlay">
      <div className="modal modal-wide">
        <p className="question">{t('groups.members')}</p>

        {loading && <div className="empty-state">{t('common.loading')}</div>}

        {members.map((m) => {
          const name = profileName(m.profile)
          return (
            <div className="request-item" key={m.id}>
              <button className="person-row bare" onClick={() => onOpenProfile(m.user_id)}>
                <Avatar photo={m.profile?.photo} name={name || m.name} size="sm" />
                <span className="person-text">
                  <strong>
                    {name || m.name || t('profile.noName')}
                    {m.id === myMembershipId && ` · ${t('groups.you')}`}
                  </strong>
                  <small>
                    {t(ROLE_KEY[m.role])}
                    {m.name ? ` · ${m.name}` : ` · ${t('groups.noPlayerYet')}`}
                  </small>
                </span>
              </button>

              <div className="request-actions">
                {/* Host arruma quem entrou representando a pessoa errada. */}
                {isHost && (
                  <button
                    className="roster-add-btn"
                    onClick={() => onPickPlayerFor(m)}
                    title={t('groups.setPlayer')}
                  >
                    ✎
                  </button>
                )}
                {isOwner && m.role !== 'owner' && (
                  <>
                    <button
                      className="roster-add-btn"
                      onClick={() => admin.setRole(m.id, m.role === 'host' ? 'member' : 'host')}
                    >
                      {m.role === 'host' ? t('groups.demote') : t('groups.promote')}
                    </button>
                    <button
                      className="roster-del"
                      title={t('groups.remove')}
                      onClick={() => admin.removeMember(m.id)}
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}

        <div className="modal-actions">
          <div className="round-action cancel" onClick={onClose}>✕</div>
        </div>
      </div>
    </div>
  )
}
