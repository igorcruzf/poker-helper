import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTables } from '../hooks/useTables.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { useTheme } from '../hooks/useTheme.js'
import { useInstallPrompt } from '../hooks/useInstallPrompt.js'
import { settlementProgress } from '../lib/settlement.js'
import { fmt, fmtDate } from '../utils.js'
import Header from '../components/Header.jsx'
import ThemeModal from '../components/ThemeModal.jsx'
import DeleteTableModal from '../components/DeleteTableModal.jsx'

export default function TablesScreen() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { activeTable, finishedTables, loading, error, deleteTable } = useTables()
  const [theme, setTheme] = useTheme()
  const { canInstall, promptInstall } = useInstallPrompt()
  const [themeOpen, setThemeOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [onlyPending, setOnlyPending] = useState(false)

  const pendingCount = finishedTables.filter(
    (t) => settlementProgress(t.settlements || []).pending > 0
  ).length
  const visibleTables = onlyPending
    ? finishedTables.filter((t) => settlementProgress(t.settlements || []).pending > 0)
    : finishedTables

  return (
    <div className="app-shell">
      <div className="app">
        <Header
          onOpenRanking={() => navigate('/ranking')}
          onOpenStats={() => navigate('/estatisticas')}
          onOpenThemes={() => setThemeOpen(true)}
          onLogout={signOut}
          userEmail={user?.email}
          canInstall={canInstall}
          onInstall={promptInstall}
        />

        {error && <div className="auth-error">{error}</div>}

        {activeTable && (
          <button className="active-table-card" onClick={() => navigate(`/mesa/${activeTable.id}`)}>
            <span className="active-table-flag">Mesa em andamento</span>
            <span className="active-table-name">
              {activeTable.name || `Mesa de ${fmtDate(activeTable.created_at)}`}
            </span>
            <span className="active-table-meta">
              {activeTable.table_players?.length || 0} jogadores · cacife {fmt(activeTable.buy_in)}
            </span>
            <span className="active-table-cta">Continuar →</span>
          </button>
        )}

        <div className="footer-actions">
          <button className="add-player-btn" onClick={() => navigate('/nova')}>
            {activeTable ? 'Criar outra mesa' : 'Criar mesa'}
          </button>
        </div>

        <div className="rail">
          <div className="card">
            <div className="section-title">Mesas anteriores</div>

            {loading && <div className="empty-state">Carregando…</div>}

            {!loading && finishedTables.length > 0 && (
              <div className="filter-row">
                <button
                  className={`filter-chip${onlyPending ? '' : ' active'}`}
                  onClick={() => setOnlyPending(false)}
                >
                  Todas ({finishedTables.length})
                </button>
                <button
                  className={`filter-chip${onlyPending ? ' active' : ''}`}
                  onClick={() => setOnlyPending(true)}
                  disabled={pendingCount === 0}
                >
                  Acerto pendente ({pendingCount})
                </button>
              </div>
            )}

            {!loading && finishedTables.length === 0 && (
              <div className="empty-state">
                Nenhuma mesa encerrada ainda.<br />Encerre um jogo para ver o acerto aqui.
              </div>
            )}

            {!loading && finishedTables.length > 0 && visibleTables.length === 0 && (
              <div className="empty-state">Nenhuma mesa com acerto pendente. 🎉</div>
            )}

            <div className="history-list">
              {visibleTables.map((t) => {
                const progress = settlementProgress(t.settlements || [])
                const settled = progress.total > 0 && progress.pending === 0
                return (
                  <div className="history-item" key={t.id}>
                    <div className="history-head">
                      <span className="history-date">{fmtDate(t.finished_at || t.created_at)}</span>
                      <span className="history-buyin">
                        {t.name ? `${t.name} · ` : ''}cacife {fmt(t.buy_in)}
                      </span>
                      <button className="history-del" title="Apagar mesa" onClick={() => setDeleting(t)}>✕</button>
                    </div>

                    <button className="history-open" onClick={() => navigate(`/mesa/${t.id}/acerto`)}>
                      <span className={`pay-pill${settled ? ' done' : ''}`}>
                        {progress.total === 0
                          ? 'Sem acerto'
                          : settled
                            ? 'Tudo pago'
                            : `${progress.pending} pendente${progress.pending > 1 ? 's' : ''} · ${fmt(progress.pendingAmount)}`}
                      </span>
                      <span className="history-open-cta">Ver acerto →</span>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <ThemeModal open={themeOpen} theme={theme} onSelect={setTheme} onClose={() => setThemeOpen(false)} />

      <DeleteTableModal
        table={deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={() => { deleteTable(deleting.id); setDeleting(null) }}
      />
    </div>
  )
}
