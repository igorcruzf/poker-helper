import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroups } from '../hooks/useGroups.jsx'
import { useGroupAdmin } from '../hooks/useGroupAdmin.js'
import { useRoster } from '../hooks/useRoster.js'
import { useProfile } from '../hooks/useProfile.js'
import { markSetupOffered, useMyProfile } from '../hooks/useMyProfile.jsx'
import { useTables, tablesToHistory } from '../hooks/useTables.js'
import { PERIODS, computeHeadToHead, computePlayerStats, filterHistory } from '../lib/stats.js'
import { fmt, fmtDate, profileName, saldoClass } from '../utils.js'
import AppChrome from '../components/AppChrome.jsx'
import BackBar from '../components/BackBar.jsx'
import ScreenStatus from '../components/ScreenStatus.jsx'
import { useGoBack } from '../hooks/useGoBack.js'
import Avatar from '../components/Avatar.jsx'
import ProfileFormModal from '../components/ProfileFormModal.jsx'
import NicknameConflictModal from '../components/NicknameConflictModal.jsx'
import { useI18n } from '../hooks/useI18n.js'

function Tile({ label, value, detail, tone }) {
  return (
    <div className="stat-tile">
      <span className="stat-tile-label">{label}</span>
      <span className={`stat-tile-value${tone ? ` ${tone}` : ''}`}>{value}</span>
      {detail && <span className="stat-tile-detail">{detail}</span>}
    </div>
  )
}

// Uma tela para dois assuntos, porque para quem lê é a mesma coisa: a página de
// alguém do grupo. `/perfil[/:userId]` parte de uma conta; `/jogador/:playerId`
// parte de um nome do elenco, que pode não ter conta nenhuma por trás — esse é
// o visitante. O que manda nos números é sempre o jogador, não a conta.
export default function ProfileScreen() {
  const { userId, playerId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const goBack = useGoBack()
  // Conta nova chega aqui pela porta do App, com o modal já aberto.
  const onboarding = params.get('novo') === '1'
  const { user, signOut } = useAuth()
  const { t } = useI18n()
  const { activeGroup, activeGroupId } = useGroups()
  const admin = useGroupAdmin(activeGroupId)
  const { roster, loading: rosterLoading } = useRoster()
  const { finishedTables, loading: tablesLoading } = useTables()

  // Quem representa esse jogador, se alguém representa.
  const claimingMember = playerId
    ? admin.members.find((m) => m.player_id === playerId) || null
    : null
  const targetUserId = playerId ? claimingMember?.user_id || null : userId || user?.id || null

  // O próprio perfil vem do provider (o mesmo que a porta do App consulta);
  // o dos outros é buscado sob demanda.
  const mine = useMyProfile()
  const isMine = !!targetUserId && targetUserId === user?.id
  const other = useProfile(isMine ? null : targetUserId)
  const profile = isMine ? mine.profile : other.profile
  const profileLoading = isMine ? mine.loading : other.loading
  const save = mine.save
  const membership = targetUserId
    ? admin.members.find((m) => m.user_id === targetUserId) || null
    : null

  const player = playerId
    ? roster.find((p) => p.id === playerId) || null
    : membership?.player_id
      ? { id: membership.player_id, name: membership.name }
      : null

  const [editOpen, setEditOpen] = useState(onboarding)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState('all')
  // Grupos em que o nome novo bate num homônimo; a troca fica represada até a
  // pessoa dar um apelido para cada um.
  const [conflicts, setConflicts] = useState([])
  const [pendingName, setPendingName] = useState('')

  // Marca que o convite já foi feito assim que ele aparece — a porta do App não
  // insiste de novo, mesmo que a pessoa saia sem preencher.
  useEffect(() => {
    if (onboarding && user?.id) markSetupOffered(user.id)
  }, [onboarding, user])

  const resolving = admin.loading || rosterLoading || profileLoading
  // Visitante: joga nas mesas do grupo, mas ninguém no app é essa pessoa ainda.
  const isVisitor = !!player && !claimingMember && !membership
  const playerName = player?.name || null
  const displayName = profileName(profile) || playerName || t('profile.noName')

  const history = filterHistory(tablesToHistory(finishedTables), period)
  const stats = playerName
    ? computePlayerStats(history).find(
        (s) => s.name.trim().toLowerCase() === playerName.trim().toLowerCase()
      )
    : null

  const nights = playerName
    ? history
        .map((night) => ({
          id: night.id,
          date: night.date,
          entry: night.players.find(
            (p) => p.name.trim().toLowerCase() === playerName.trim().toLowerCase()
          ),
        }))
        .filter((n) => n.entry)
    : []
  const best = nights.reduce((acc, n) => (!acc || n.entry.saldo > acc.entry.saldo ? n : acc), null)
  const worst = nights.reduce((acc, n) => (!acc || n.entry.saldo < acc.entry.saldo ? n : acc), null)
  const headToHead = playerName ? computeHeadToHead(history, playerName) : []

  async function handleSave(values) {
    setBusy(true)
    setError('')
    const { error } = await save(values)
    if (error) {
      setBusy(false)
      setError(error.message)
      return
    }

    // O nome na mesa acompanha o do perfil — senão o placar continuaria somando
    // pelo nome antigo.
    const nextName = values.firstName.trim()
    const changedName = nextName.toLowerCase() !== String(profile?.first_name || '').trim().toLowerCase()
    if (changedName) {
      const result = await mine.syncPlayerName(nextName, {})
      if (result.conflicts.length > 0) {
        setBusy(false)
        setEditOpen(false)
        setPendingName(nextName)
        setConflicts(result.conflicts)
        return
      }
      if (result.error) setError(result.error.message)
      admin.reload()
    }

    setBusy(false)
    setEditOpen(false)
    // Terminou o cadastro: segue para onde ia antes de ser desviada para cá.
    if (onboarding) goBack()
  }

  async function handleResolveConflicts(nicknames) {
    setBusy(true)
    setError('')
    const result = await mine.syncPlayerName(pendingName, nicknames)
    setBusy(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    if (result.conflicts.length > 0) {
      setConflicts(result.conflicts)
      return
    }
    setConflicts([])
    admin.reload()
    if (onboarding) goBack()
  }

  const hasSubject = !!profile || !!player

  return (
    <div className="app-shell">
      <div className="app">
        <AppChrome
          onOpenTables={() => navigate('/')}
          onOpenStats={() => navigate('/estatisticas')}
          onOpenRanking={() => navigate('/ranking')}
          onLogout={signOut}
          userEmail={user?.email}
          subtitle={t('profile.eyebrow')}
        />

        <BackBar title={t('profile.eyebrow')} />

        {onboarding && <div className="sync-flag">{t('profile.welcome')}</div>}

        {error && <div className="auth-error">{error}</div>}

        {(resolving || admin.error) && (
          <ScreenStatus loading={resolving} error={admin.error} onRetry={admin.reload} />
        )}

        {!resolving && !hasSubject && (
          <div className="rail">
            <div className="card">
              <div className="empty-state">{t('profile.notFound')}</div>
            </div>
          </div>
        )}

        {!resolving && hasSubject && (
          <>
            <div className="rail">
              <div className="card profile-card">
                <Avatar photo={profile?.photo} name={displayName} size="xl" />
                <div className="profile-head">
                  <span className="profile-name">{displayName}</span>

                  {isVisitor && <span className="visitor-badge">{t('profile.visitor')}</span>}

                  {!isVisitor && playerName && playerName !== displayName && (
                    <span className="profile-alias">{t('profile.playsAs', { name: playerName })}</span>
                  )}
                  {!isVisitor && !playerName && activeGroup && (
                    <span className="profile-alias">{t('profile.noPlayerInGroup')}</span>
                  )}
                  {isMine && <span className="profile-email">{user?.email}</span>}
                </div>

                {isVisitor && <p className="modal-hint">{t('profile.visitorHint')}</p>}

                {isMine && (
                  <button className="roster-add-btn" onClick={() => setEditOpen(true)}>
                    {t('profile.edit')}
                  </button>
                )}
              </div>
            </div>

            <div className="rail">
              <div className="card">
                <div className="section-title">
                  {t('profile.statsIn', { group: activeGroup?.name || '' })}
                </div>

                <div className="filter-row period-row">
                  {PERIODS.map((id) => (
                    <button
                      key={id}
                      className={`filter-chip${period === id ? ' active' : ''}`}
                      onClick={() => setPeriod(id)}
                    >
                      {t(`stats.period.${id}`)}
                    </button>
                  ))}
                </div>

                {tablesLoading && <div className="empty-state">{t('common.loading')}</div>}

                {!tablesLoading && !stats && (
                  <div className="empty-state">
                    {playerName ? t('profile.noNights') : t('profile.noPlayerHint')}
                  </div>
                )}

                {!tablesLoading && stats && (
                  <>
                    <div className="stat-tiles">
                      <Tile label={t('stats.nights')} value={stats.nights} />
                      <Tile
                        label={t('profile.total')}
                        value={fmt(stats.totalSaldo)}
                        tone={saldoClass(stats.totalSaldo)}
                      />
                      <Tile label={t('stats.cacifes')} value={stats.cacifes} />
                    </div>

                    <div className="stat-tiles two">
                      <Tile
                        label={t('profile.average')}
                        value={fmt(stats.avgSaldo)}
                        tone={saldoClass(stats.avgSaldo)}
                      />
                      <Tile label={t('profile.winRate')} value={`${stats.winRate}%`} />
                      {best && (
                        <Tile
                          label={t('stats.bestNight')}
                          value={fmt(best.entry.saldo)}
                          detail={fmtDate(best.date)}
                          tone="pos"
                        />
                      )}
                      {worst && (
                        <Tile
                          label={t('stats.worstNight')}
                          value={fmt(worst.entry.saldo)}
                          detail={fmtDate(worst.date)}
                          tone="neg"
                        />
                      )}
                    </div>

                    {headToHead.length > 0 && (
                      <>
                        <div className="section-title">{t('profile.headToHead')}</div>
                        <p className="modal-hint">{t('profile.headToHeadHint')}</p>
                        <div className="h2h-list">
                          {headToHead.map((h) => (
                            <div className="h2h-row" key={h.name}>
                              <span className="h2h-name">{h.name}</span>
                              <span className="h2h-record">
                                <strong>{h.ahead}</strong>
                                <span className="h2h-sep">×</span>
                                <strong>{h.behind}</strong>
                                <small>{t('profile.inNights', { count: h.nights })}</small>
                              </span>
                              <span className={`h2h-saldo ${saldoClass(h.mySaldo)}`}>
                                {fmt(h.mySaldo)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    <div className="section-title">{t('profile.byNight')}</div>
                    <div className="history-players">
                      {[...nights].sort((a, b) => b.date - a.date).map((n) => (
                        <div className="history-player" key={n.id}>
                          <span className="hp-name">
                            {fmtDate(n.date)} <small>({n.entry.cacifes}x)</small>
                          </span>
                          <span className={`hp-saldo ${saldoClass(n.entry.saldo)}`}>
                            {fmt(n.entry.saldo)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <NicknameConflictModal
        open={conflicts.length > 0}
        name={pendingName}
        conflicts={conflicts}
        busy={busy}
        onCancel={() => setConflicts([])}
        onConfirm={handleResolveConflicts}
      />

      <ProfileFormModal
        open={editOpen}
        profile={profile}
        busy={busy}
        onCancel={() => setEditOpen(false)}
        onConfirm={handleSave}
      />
    </div>
  )
}
