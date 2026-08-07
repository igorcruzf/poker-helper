import { useEffect, useRef, useState } from 'react'
import { useSyncStatus } from '../hooks/useSyncStatus.js'
import { useI18n } from '../hooks/useI18n.js'

const BACK_ONLINE_MS = 6000

// A noite não pode parar porque a internet caiu: o aviso diz que dá para
// continuar jogando e, quando a conexão volta e a fila esvazia, confirma que a
// mesa subiu. Sem isso a pessoa não tinha como saber se o placar estava salvo.
export default function SyncStatusBar() {
  const { online, pending } = useSyncStatus()
  const { t } = useI18n()
  const [showBack, setShowBack] = useState(false)
  const wasOffline = useRef(false)

  useEffect(() => {
    if (!online) {
      wasOffline.current = true
      setShowBack(false)
      return
    }
    // Só comemora depois que o que estava represado realmente subiu.
    if (!wasOffline.current || pending > 0) return
    wasOffline.current = false
    setShowBack(true)
    const id = setTimeout(() => setShowBack(false), BACK_ONLINE_MS)
    return () => clearTimeout(id)
  }, [online, pending])

  if (!online) {
    return (
      <div className="sync-flag offline">
        {t('sync.offline')}
        {pending > 0 && ` ${t('sync.pending', { count: pending })}`}
      </div>
    )
  }

  if (pending > 0) {
    return <div className="sync-flag">{t('sync.sending', { count: pending })}</div>
  }

  if (showBack) return <div className="sync-flag online">{t('sync.back')}</div>

  return null
}
