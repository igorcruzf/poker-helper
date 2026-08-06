import { useState } from 'react'
import { copyText } from '../lib/summary.js'
import { useI18n } from '../hooks/useI18n.js'

export default function ShareTableModal({ open, url, onClose }) {
  const { t } = useI18n()
  const [label, setLabel] = useState(null)

  if (!open) return null

  async function handleCopy() {
    const ok = await copyText(url)
    setLabel(ok ? t('common.copied') : t('common.copyFailed'))
    setTimeout(() => setLabel(null), 1600)
  }

  async function handleShare() {
    try {
      await navigator.share({ title: 'Cacifes — ' + t('eyebrow.live'), url })
    } catch {
      /* usuário cancelou */
    }
  }

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <button className="close-x" onClick={onClose}>✕</button>
        <p className="question">{t('live.title')}</p>
        <p className="modal-hint" style={{ textAlign: 'center' }}>{t('live.hint')}</p>

        <div className="share-url">{url}</div>

        <div className="share-actions">
          <button className="timer-btn" onClick={handleCopy}>{label || t('live.copyLink')}</button>
          {typeof navigator !== 'undefined' && navigator.share && (
            <button className="timer-btn secondary" onClick={handleShare}>
              {t('live.shareNative')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
