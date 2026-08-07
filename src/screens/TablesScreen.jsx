import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTables } from '../hooks/useTables.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroups } from '../hooks/useGroups.jsx'
import { settlementProgress } from '../lib/settlement.js'
import { fmt, fmtDate } from '../utils.js'
import AppChrome from '../components/AppChrome.jsx'
import DeleteTableModal from '../components/DeleteTableModal.jsx'
import { useI18n } from '../hooks/useI18n.js'

export default function TablesScreen() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { activeGroup, isHost, groups } = useGroups()
  const { activeTables, finishedTables, loading, error, deleteTable } = useTables()
  const { t } = useI18n()
  const [deleting, setDeleting] = useState(null)
  const [onlyPending, setOnlyPending] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const isPending = (table) => settlementProgress(table.settlements || []).pending > 0
  const pendingCount = finishedTables.filter(isPending).length
  const visibleTables = onlyPending ? finishedTables.filter(isPending) : finishedTables

  // Quem não conduz o grupo acompanha pela mesma tela pública do link: dá para
  // ver tudo e marcar o próprio pagamento, sem poder mexer nos cacifes.
  const openTable = (table) =>
    isHost ? navigate(`/mesa/${table.id}`) : navigate(`/ao-vivo/${table.share_token}`)
  const openSettlement = (table) =>
    isHost ? navigate(`/mesa/${table.id}/acerto`) : navigate(`/acerto/${table.share_token}`)

  async function confirmDelete() {
    const table = deleting
    setDeleting(null)
    const { error } = await deleteTable(table.id)
    setDeleteError(error ? t('tables.deleteFailed') : '')
  }

  return (
    <div className="app-shell">
      <div className="app">
        <AppChrome
          onOpenRanking={() => navigate('/ranking')}
          onOpenStats={() => navigate('/estatisticas')}
          onLogout={signOut}
          userEmail={user?.email}
          subtitle={activeGroup?.name}
        />

        {error && <div className="auth-error">{error}</div>}
        {deleteError && <div className="auth-error">{deleteError}</div>}

        {groups.length > 1 && (
          <button className="group-switch" onClick={() => navigate('/grupos')}>
            {t('tables.groupSwitch', { group: activeGroup?.name || '' })}
          </button>
        )}

        {/* Mais de uma mesa pode ficar aberta ao mesmo tempo — todas aparecem,
            senão as antigas viravam fantasmas impossíveis de achar ou apagar. */}
        {activeTables.map((table) => (
          <div className="active-table-wrap" key={table.id}>
            <button className="active-table-card" onClick={() => openTable(table)}>
              <span className="active-table-flag">{t('tables.activeFlag')}</span>
              <span className="active-table-name">
                {table.name || t('tables.defaultName', { date: fmtDate(table.created_at) })}
              </span>
              <span className="active-table-meta">
                {t('tables.playersAndBuyIn', {
                  count: table.table_players?.length || 0,
                  buyIn: fmt(table.buy_in),
                })}
              </span>
              <span className="active-table-cta">
                {isHost ? t('tables.continue') : t('tables.follow')}
              </span>
            </button>
            {isHost && (
              <button
                className="history-del"
                title={t('tables.deleteTable')}
                onClick={() => setDeleting(table)}
              >✕</button>
            )}
          </div>
        ))}

        {isHost && (
          <div className="footer-actions">
            <button className="add-player-btn" onClick={() => navigate('/nova')}>
              {activeTables.length > 0 ? t('tables.createAnother') : t('tables.create')}
            </button>
          </div>
        )}

        <div className="rail">
          <div className="card">
            <div className="section-title">{t('tables.previous')}</div>

            {loading && <div className="empty-state">{t('common.loading')}</div>}

            {!loading && finishedTables.length > 0 && (
              <div className="filter-row">
                <button
                  className={`filter-chip${onlyPending ? '' : ' active'}`}
                  onClick={() => setOnlyPending(false)}
                >
                  {t('tables.all', { count: finishedTables.length })}
                </button>
                <button
                  className={`filter-chip${onlyPending ? ' active' : ''}`}
                  onClick={() => setOnlyPending(true)}
                  disabled={pendingCount === 0}
                >
                  {t('tables.pending', { count: pendingCount })}
                </button>
              </div>
            )}

            {!loading && finishedTables.length === 0 && (
              <div className="empty-state">
                {t('tables.empty')}<br />{t('tables.emptyHint')}
              </div>
            )}

            {!loading && finishedTables.length > 0 && visibleTables.length === 0 && (
              <div className="empty-state">{t('tables.noPending')}</div>
            )}

            <div className="history-list">
              {visibleTables.map((table) => {
                const progress = settlementProgress(table.settlements || [])
                const settled = progress.total > 0 && progress.pending === 0
                return (
                  <div className="history-item" key={table.id}>
                    <div className="history-head">
                      <span className="history-date">{fmtDate(table.finished_at || table.created_at)}</span>
                      <span className="history-buyin">
                        {table.name ? `${table.name} · ` : ''}{fmt(table.buy_in)}
                      </span>
                      {isHost && (
                        <button
                          className="history-del"
                          title={t('tables.deleteTable')}
                          onClick={() => setDeleting(table)}
                        >✕</button>
                      )}
                    </div>

                    <button className="history-open" onClick={() => openSettlement(table)}>
                      <span className={`pay-pill${settled ? ' done' : ''}`}>
                        {progress.total === 0
                          ? t('tables.noSettlement')
                          : settled
                            ? t('tables.allPaid')
                            : t(progress.pending > 1 ? 'tables.pendingAmountPlural' : 'tables.pendingAmount', {
                                count: progress.pending,
                                amount: fmt(progress.pendingAmount),
                              })}
                      </span>
                      <span className="history-open-cta">{t('tables.seeSettlement')}</span>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <DeleteTableModal
        table={deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
