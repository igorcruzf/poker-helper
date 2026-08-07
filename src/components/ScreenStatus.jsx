import { useEffect, useState } from 'react'
import { useSyncStatus } from '../hooks/useSyncStatus.js'
import { useI18n } from '../hooks/useI18n.js'

// Depois disso, "carregando" deixa de ser tranquilizador e passa a parecer
// travado; então a tela oferece recarregar mesmo sem ter dado erro ainda.
const SLOW_MS = 6000

// O estado de uma tela que depende do banco. Antes cada uma resolvia isso do
// seu jeito — algumas só escreviam "Carregando…" para sempre quando a resposta
// não vinha, sem nada para a pessoa fazer.
export default function ScreenStatus({ loading, error, onRetry, message }) {
  const { t } = useI18n()
  const { online } = useSyncStatus()
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (!loading) {
      setSlow(false)
      return
    }
    const id = setTimeout(() => setSlow(true), SLOW_MS)
    return () => clearTimeout(id)
  }, [loading])

  if (!loading && !error) return null

  const failed = !!error && !loading

  return (
    <div className="rail">
      <div className="card screen-status">
        {loading && <span className="screen-spinner" aria-hidden="true" />}

        <p className="screen-status-text">
          {failed
            ? (online ? t('status.failed') : t('status.failedOffline'))
            : slow ? t('status.slow') : (message || t('common.loading'))}
        </p>

        {failed && error !== true && <p className="screen-status-detail">{String(error)}</p>}

        {(failed || slow) && onRetry && (
          <button className="roster-add-btn" onClick={onRetry}>{t('status.retry')}</button>
        )}
      </div>
    </div>
  )
}
