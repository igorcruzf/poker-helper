import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTables, tablesToHistory } from '../hooks/useTables.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroups } from '../hooks/useGroups.jsx'
import { useGroupAdmin } from '../hooks/useGroupAdmin.js'
import { useRoster } from '../hooks/useRoster.js'
import { PERIODS, computeOverview, computePlayerStats, filterHistory } from '../lib/stats.js'
import { fmt, fmtDate, saldoClass } from '../utils.js'
import AppChrome from '../components/AppChrome.jsx'
import BackBar from '../components/BackBar.jsx'
import ScreenStatus from '../components/ScreenStatus.jsx'
import { useI18n } from '../hooks/useI18n.js'

const MEDALS = ['🥇', '🥈', '🥉']

function Tile({ label, value, detail, tone }) {
  return (
    <div className="stat-tile">
      <span className="stat-tile-label">{label}</span>
      <span className={`stat-tile-value${tone ? ` ${tone}` : ''}`}>{value}</span>
      {detail && <span className="stat-tile-detail">{detail}</span>}
    </div>
  )
}

// Barra divergente: o lado em que ela cresce já diz ganhou/perdeu, e o valor
// com sinal vem escrito ao lado. Isso é de propósito — o par verde/vermelho
// fica no limite de separação para daltonismo (deutan), então a cor nunca é a
// única pista.
function SaldoBar({ saldo, max }) {
  const width = max > 0 ? (Math.abs(saldo) / max) * 50 : 0
  const positive = saldo > 0.005
  const negative = saldo < -0.005
  return (
    <div className="saldo-track">
      <span className="saldo-axis" />
      {negative && <span className="saldo-fill neg" style={{ width: `${width}%` }} />}
      {positive && <span className="saldo-fill pos" style={{ width: `${width}%` }} />}
    </div>
  )
}

export default function StatsScreen() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { activeGroup, activeGroupId } = useGroups()
  const { finishedTables, loading, error, reload } = useTables()
  const { roster } = useRoster()
  const admin = useGroupAdmin(activeGroupId)
  const { t } = useI18n()
  const [tableView, setTableView] = useState(false)
  const [period, setPeriod] = useState('all')

  // O placar guarda o nome que estava na mesa naquela noite; daqui até a página
  // da pessoa o caminho é nome → jogador do elenco → conta (se houver). Sem
  // conta, abre a página do visitante.
  function personRoute(name) {
    const player = roster.find(
      (p) => p.name.trim().toLowerCase() === String(name || '').trim().toLowerCase()
    )
    if (!player) return null
    const member = admin.members.find((m) => m.player_id === player.id)
    return member ? `/perfil/${member.user_id}` : `/jogador/${player.id}`
  }

  // Função e não componente: um componente declarado aqui dentro seria um tipo
  // novo a cada render, e o React remontaria todos os nomes à toa.
  function personName(name) {
    const route = personRoute(name)
    if (!route) return name
    return <button className="name-link" onClick={() => navigate(route)}>{name}</button>
  }

  const history = filterHistory(tablesToHistory(finishedTables), period)
  const stats = computePlayerStats(history)
  const overview = computeOverview(history)
  const maxAbs = Math.max(0, ...stats.map((s) => Math.abs(s.totalSaldo)))
  const podium = stats.slice(0, 3)

  return (
    <div className="app-shell">
      <div className="app">
        <AppChrome
          onOpenTables={() => navigate('/')}
          onOpenRanking={() => navigate('/ranking')}
          onLogout={signOut}
          userEmail={user?.email}
          subtitle={activeGroup ? `${t('eyebrow.stats')} · ${activeGroup.name}` : t('eyebrow.stats')}
        />

        <BackBar to="/" title={t('stats.title')} />

        {(loading || error) && (
          <ScreenStatus loading={loading} error={error} onRetry={reload} />
        )}

        {!loading && !error && (
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
        )}

        {!loading && !error && stats.length === 0 && (
          <div className="rail">
            <div className="card">
              <div className="empty-state">
                {period === 'all'
                  ? <>{t('stats.empty')}<br />{t('stats.emptyHint')}</>
                  : t('stats.emptyPeriod')}
              </div>
            </div>
          </div>
        )}

        {!loading && !error && stats.length > 0 && (
          <>
            <div className="stat-tiles">
              <Tile label={t('stats.tables')} value={overview.tables} />
              <Tile label={t('stats.players')} value={overview.players} />
              <Tile label={t('stats.cacifes')} value={overview.cacifes} detail={fmt(overview.volume)} />
            </div>

            <div className="rail">
              <div className="card">
                <div className="section-title">{t('stats.podium')}</div>
                <div className="podium">
                  {podium.map((s, i) => (
                    <div className={`podium-slot p${i + 1}`} key={s.name}>
                      <span className="podium-medal">{MEDALS[i]}</span>
                      <span className="podium-name">{personName(s.name)}</span>
                      <span className={`podium-value ${saldoClass(s.totalSaldo)}`}>
                        {fmt(s.totalSaldo)}
                      </span>
                      <span className="podium-meta">
                        {s.nights} {t(s.nights === 1 ? 'common.night' : 'common.nights')}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="section-title">
                  {t('stats.accumulated')}
                  <span className="chart-legend">
                    <span className="legend-key pos" /> {t('stats.won')}
                    <span className="legend-key neg" /> {t('stats.lost')}
                  </span>
                </div>

                <div className="saldo-chart">
                  {stats.map((s) => (
                    <div
                      className="saldo-row"
                      key={s.name}
                      title={t('stats.barTitle', {
                        name: s.name, nights: s.nights, cacifes: s.cacifes, avg: fmt(s.avgSaldo),
                      })}
                    >
                      <span className="saldo-row-name">{personName(s.name)}</span>
                      <SaldoBar saldo={s.totalSaldo} max={maxAbs} />
                      <span className={`saldo-row-value ${saldoClass(s.totalSaldo)}`}>
                        {fmt(s.totalSaldo)}
                      </span>
                    </div>
                  ))}
                </div>

                <button className="table-view-toggle" onClick={() => setTableView((v) => !v)}>
                  {tableView ? t('stats.hideTable') : t('stats.showTable')}
                </button>

                {tableView && (
                  <div className="stats-list">
                    <div className="stats-row stats-head">
                      <span>{t('stats.player')}</span>
                      <span>{t('stats.nights')}</span>
                      <span>{t('stats.totalSaldo')}</span>
                    </div>
                    {stats.map((s) => (
                      <div className="stats-row" key={s.name}>
                        <span className="stats-name">
                          {personName(s.name)}
                          <small>
                            {t('stats.rowDetail', {
                              avg: fmt(s.avgSaldo), cacifes: s.cacifes, rate: s.winRate,
                            })}
                          </small>
                        </span>
                        <span>{s.nights}</span>
                        <span className={saldoClass(s.totalSaldo)}>{fmt(s.totalSaldo)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Todo destaque de um jogo só carrega a data — sem ela o número
                não diz nada além de existir. */}
            <div className="stat-tiles two">
              <Tile
                label={t('stats.bestNight')}
                value={fmt(overview.best.saldo)}
                detail={`${overview.best.name} · ${fmtDate(overview.best.date)}`}
                tone="pos"
              />
              <Tile
                label={t('stats.worstNight')}
                value={fmt(overview.worst.saldo)}
                detail={`${overview.worst.name} · ${fmtDate(overview.worst.date)}`}
                tone="neg"
              />
              <Tile
                label={t('stats.mostCacifes')}
                value={overview.mostCacifesGame.cacifes}
                detail={`${overview.mostCacifesGame.name} · ${fmtDate(overview.mostCacifesGame.date)}`}
              />
              <Tile
                label={t('stats.biggestGame')}
                value={overview.biggestGame.cacifes}
                detail={t('stats.biggestGameDetail', {
                  count: overview.biggestGame.players,
                  date: fmtDate(overview.biggestGame.date),
                })}
              />
              <Tile
                label={t('stats.mostPresent')}
                value={overview.mostNights.nights}
                detail={overview.mostNights.name}
              />
            </div>
          </>
        )}
      </div>

    </div>
  )
}
