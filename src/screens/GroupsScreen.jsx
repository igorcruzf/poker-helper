import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGroups } from '../hooks/useGroups.jsx'
import { useGroupAdmin } from '../hooks/useGroupAdmin.js'
import { useRoster } from '../hooks/useRoster.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { copyText, groupInviteUrlFor } from '../lib/summary.js'
import AppChrome from '../components/AppChrome.jsx'
import BackBar from '../components/BackBar.jsx'
import ScreenStatus from '../components/ScreenStatus.jsx'
import GroupImage from '../components/GroupImage.jsx'
import GroupFormModal from '../components/GroupFormModal.jsx'
import JoinGroupModal from '../components/JoinGroupModal.jsx'
import GroupMembersModal from '../components/GroupMembersModal.jsx'
import GroupRosterModal from '../components/GroupRosterModal.jsx'
import EditRosterPlayerModal from '../components/EditRosterPlayerModal.jsx'
import GroupRequestsModal from '../components/GroupRequestsModal.jsx'
import PickPlayerModal from '../components/PickPlayerModal.jsx'
import { useI18n } from '../hooks/useI18n.js'

const ROLE_KEY = { owner: 'groups.roleOwner', host: 'groups.roleHost', member: 'groups.roleMember' }

export default function GroupsScreen() {
  const navigate = useNavigate()
  const { code: codeFromLink } = useParams()
  const { user, signOut } = useAuth()
  const { t } = useI18n()
  const {
    groups, activeGroup, activeGroupId, isHost, isOwner, hasGroup, loading,
    myMembershipId, myPlayerId, myRequests, dropRequest,
    selectGroup, createGroup, updateGroup, setMyPlayer, findGroupByCode, requestJoin, leaveGroup,
    error: groupsError, reload: reloadGroups,
  } = useGroups()
  // Membro comum também precisa da lista: é ela que diz quais jogadores já
  // têm dono na hora de se identificar. O RLS esconde dele só os pedidos.
  const admin = useGroupAdmin(activeGroupId)
  const { roster, renameInRoster } = useRoster()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [joinOpen, setJoinOpen] = useState(!!codeFromLink)
  const [membersOpen, setMembersOpen] = useState(false)
  const [rosterOpen, setRosterOpen] = useState(false)
  const [requestsOpen, setRequestsOpen] = useState(false)
  const [pickFor, setPickFor] = useState(null)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [editError, setEditError] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [copyLabel, setCopyLabel] = useState(null)

  useEffect(() => {
    if (codeFromLink) setJoinOpen(true)
  }, [codeFromLink])

  // O aviso de sucesso é passageiro; deixá-lo fixo faria a tela parecer travada
  // no que já aconteceu.
  useEffect(() => {
    if (!message) return
    const id = setTimeout(() => setMessage(''), 5000)
    return () => clearTimeout(id)
  }, [message])

  // player_id -> nome de quem já representa aquele jogador.
  const takenBy = useMemo(() => {
    const map = {}
    admin.members.forEach((m) => {
      if (m.player_id) map[m.player_id] = m.name || t('groups.unnamed')
    })
    return map
  }, [admin.members, t])

  const myPlayerName = roster.find((p) => p.id === myPlayerId)?.label || null

  async function handleSubmitGroup({ name, photo }) {
    setBusy(true)
    setError('')

    let failure = null
    if (editing) {
      const { error } = await updateGroup(editing.id, { name, image_url: photo || null })
      failure = error
    } else {
      const { data, error } = await createGroup(name)
      failure = error
      // create_group não recebe a foto; se veio uma, grava logo em seguida no
      // id que ele devolveu — o do provider ainda é o do grupo anterior aqui.
      if (!failure && photo && data?.id) {
        const { error: imageError } = await updateGroup(data.id, { image_url: photo })
        failure = imageError
      }
    }

    setBusy(false)
    if (failure) {
      setError(failure.message)
      return
    }
    setMessage(editing ? t('groups.saved') : t('groups.created'))
    setFormOpen(false)
    setEditing(null)
  }

  async function handleRequestJoin({ code, playerId, playerName }) {
    const { data, error } = await requestJoin({ code, playerId, playerName })
    if (error) return error.message
    if (data && data.ok === false) return t(`groups.joinError.${data.reason}`)
    setJoinOpen(false)
    setMessage(t('groups.requested', { group: data?.group_name || '' }))
    return null
  }

  async function handlePickPlayer(playerId) {
    const target = pickFor
    setPickFor(null)
    setError('')
    const { error } = target.id === myMembershipId
      ? await setMyPlayer(playerId)
      : await admin.setMemberPlayer(target.id, playerId)
    if (!error) {
      admin.reload()
      return
    }
    // A função devolve um motivo conhecido; qualquer outra coisa é erro de rede
    // ou do banco, e aí o texto cru diz mais do que uma chave sem tradução.
    const known = ['bad_player', 'taken', 'not_found']
    setError(known.includes(error.message) ? t(`groups.pickError.${error.message}`) : error.message)
  }

  async function handleRenamePlayer(values) {
    setEditError('')
    const { error } = await renameInRoster(editingPlayer.id, values)
    if (error) {
      setEditError(error.message)
      return
    }
    setEditingPlayer(null)
    admin.reload()
  }

  async function handleCopyInvite() {
    const ok = await copyText(groupInviteUrlFor(activeGroup.invite_code))
    setCopyLabel(ok ? t('common.copied') : t('common.copyFailed'))
    setTimeout(() => setCopyLabel(null), 1600)
  }

  async function handleLeave() {
    setBusy(true)
    const { error } = await leaveGroup(myMembershipId)
    setBusy(false)
    if (error) setError(error.message)
  }

  const myMember = admin.members.find((m) => m.id === myMembershipId)

  return (
    <div className="app-shell">
      <div className="app">
        <AppChrome
          onOpenTables={hasGroup ? () => navigate('/') : undefined}
          onOpenRanking={() => navigate('/ranking')}
          onLogout={signOut}
          userEmail={user?.email}
          subtitle={t('groups.eyebrow')}
        />

        {hasGroup && <BackBar to="/" title={t('groups.eyebrow')} />}

        {message && <div className="sync-flag online">{message}</div>}
        {error && <div className="auth-error">{error}</div>}

        {(loading || groupsError) && (
          <ScreenStatus loading={loading} error={groupsError} onRetry={reloadGroups} />
        )}

        {/* --- o que houve com o meu pedido ---
            Quem pediu entrada não é membro, então não enxerga nem o nome do
            grupo pelo RLS: sem este bloco a pessoa ficava sem retorno nenhum
            entre pedir e ser aprovada. */}
        {!loading && myRequests.length > 0 && (
          <div className="rail">
            <div className="card">
              <div className="section-title">{t('groups.myRequests')}</div>
              {myRequests.map((r) => (
                <div className="request-item" key={r.id}>
                  <div className="request-who">
                    <strong>{r.group_name || t('groups.unnamedGroup')}</strong>
                    <small>
                      {r.status === 'pending'
                        ? t('groups.requestPending')
                        : t('groups.requestRejected')}
                      {r.player_name ? ` · ${r.player_name}` : ''}
                    </small>
                  </div>
                  <div className="request-actions">
                    <button
                      className="roster-del"
                      title={r.status === 'pending' ? t('groups.requestCancel') : t('groups.requestDismiss')}
                      onClick={() => dropRequest(r.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- meus grupos --- */}
        {!loading && (
          <div className="rail">
            <div className="card">
              <div className="section-title">{t('groups.mine')}</div>

              {!hasGroup && (
                <div className="empty-state">
                  {t('groups.noneTitle')}<br />{t('groups.noneHint')}
                </div>
              )}

              <div className="group-list">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    className={`group-card${g.id === activeGroupId ? ' active' : ''}`}
                    onClick={() => selectGroup(g.id)}
                  >
                    <GroupImage className="group-avatar" group={g} />
                    <span className="group-card-text">
                      <strong>{g.name}</strong>
                      <small>{t(ROLE_KEY[g.role])}</small>
                    </span>
                    {g.id === activeGroupId && <span className="theme-check">✓</span>}
                  </button>
                ))}
              </div>

              <div className="group-buttons">
                <button className="roster-add-btn" onClick={() => { setEditing(null); setFormOpen(true) }}>
                  ＋ {t('groups.create')}
                </button>
                <button className="roster-add-btn" onClick={() => setJoinOpen(true)}>
                  ⌨ {t('groups.joinShort')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Atalho para as mesas logo abaixo da lista, que é onde a pessoa
            termina de escolher o grupo. */}
        {!loading && hasGroup && (
          <div className="footer-actions">
            <button className="add-player-btn" onClick={() => navigate('/')}>
              {t('groups.toTables', { group: activeGroup?.name || '' })}
            </button>
          </div>
        )}

        {/* --- o grupo aberto --- */}
        {!loading && activeGroup && (
          <div className="rail">
            <div className="card">
              <GroupImage className="group-cover" group={activeGroup} />

              <div className="group-head">
                <span className="group-head-name">{activeGroup.name}</span>
                {isHost && (
                  <button
                    className="group-edit"
                    title={t('groups.edit')}
                    onClick={() => { setEditing(activeGroup); setFormOpen(true) }}
                  >✎</button>
                )}
              </div>

              {/* Quem sou eu aqui: sem isso o dono do grupo ficava sem jogador
                  vinculado e não dava para saber qual do elenco é ele. */}
              <button
                className="my-player"
                onClick={() => setPickFor(myMember || { id: myMembershipId })}
              >
                <span className="my-player-label">{t('groups.iPlayAs')}</span>
                <span className="my-player-value">
                  {myPlayerName || t('groups.notPlaying')}
                </span>
                <span className="my-player-cta">{t('groups.change')}</span>
              </button>

              <div className="section-title">{t('groups.invite')}</div>
              {isHost ? (
                <>
                  <div className="invite-code">{activeGroup.invite_code}</div>
                  <p className="modal-hint">{t('groups.inviteHint')}</p>
                  <button className="timer-btn invite-copy" onClick={handleCopyInvite}>
                    {copyLabel || t('groups.copyInvite')}
                  </button>
                </>
              ) : (
                <p className="modal-hint">{t('groups.inviteHostOnly')}</p>
              )}

              <div className="group-buttons">
                <button className="roster-add-btn" onClick={() => setMembersOpen(true)}>
                  {t('groups.members')} ({admin.members.length})
                </button>
                <button className="roster-add-btn" onClick={() => setRosterOpen(true)}>
                  {t('groups.roster')} ({roster.length})
                </button>
                {isHost && (
                  <button className="roster-add-btn" onClick={() => setRequestsOpen(true)}>
                    {t('groups.requests')}
                    {admin.requests.length > 0 && ` (${admin.requests.length})`}
                  </button>
                )}
              </div>

              {!isOwner && (
                <button className="history-del leave-group" onClick={handleLeave} disabled={busy}>
                  {t('groups.leave')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <GroupFormModal
        open={formOpen}
        group={editing}
        busy={busy}
        onCancel={() => { setFormOpen(false); setEditing(null) }}
        onConfirm={handleSubmitGroup}
      />

      <JoinGroupModal
        open={joinOpen}
        initialCode={codeFromLink}
        onCancel={() => setJoinOpen(false)}
        onFind={async (code) => (await findGroupByCode(code)).data}
        onRequest={handleRequestJoin}
      />

      <GroupMembersModal
        open={membersOpen}
        members={admin.members}
        loading={admin.loading}
        isOwner={isOwner}
        isHost={isHost}
        myMembershipId={myMembershipId}
        admin={admin}
        onPickPlayerFor={setPickFor}
        onOpenProfile={(id) => navigate(`/perfil/${id}`)}
        onClose={() => setMembersOpen(false)}
      />

      <GroupRosterModal
        open={rosterOpen}
        roster={roster}
        members={admin.members}
        isHost={isHost}
        onEdit={(p) => { setEditError(''); setEditingPlayer(p) }}
        // Com conta, a página é a da conta; sem conta, a do jogador visitante.
        onOpenPerson={(uid, pid) => navigate(uid ? `/perfil/${uid}` : `/jogador/${pid}`)}
        onClose={() => setRosterOpen(false)}
      />

      <EditRosterPlayerModal
        player={editingPlayer}
        error={editError}
        onCancel={() => setEditingPlayer(null)}
        onConfirm={handleRenamePlayer}
      />

      <GroupRequestsModal
        open={requestsOpen}
        requests={admin.requests}
        loading={admin.loading}
        isOwner={isOwner}
        admin={admin}
        onClose={() => setRequestsOpen(false)}
      />

      <PickPlayerModal
        open={!!pickFor}
        title={pickFor?.id === myMembershipId
          ? t('groups.iPlayAs')
          : t('groups.setPlayerFor', { name: pickFor?.name || t('groups.unnamed') })}
        roster={roster}
        takenBy={takenBy}
        currentPlayerId={pickFor?.id === myMembershipId ? myPlayerId : pickFor?.player_id}
        onCancel={() => setPickFor(null)}
        onConfirm={handlePickPlayer}
      />
    </div>
  )
}
