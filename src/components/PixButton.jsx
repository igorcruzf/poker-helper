import { useState } from 'react'
import { copyText } from '../lib/summary.js'
import { useI18n } from '../hooks/useI18n.js'

// Um toque copia a chave de quem vai receber. É o passo que antes obrigava a
// sair do app e pedir a chave no grupo.
export default function PixButton({ pixKey, name }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  if (!pixKey) return null

  async function handleCopy(e) {
    // A linha inteira do acerto costuma ter um checkbox em volta.
    e.preventDefault()
    e.stopPropagation()
    const ok = await copyText(pixKey)
    setCopied(ok)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <button
      type="button"
      className={`pix-btn${copied ? ' copied' : ''}`}
      onClick={handleCopy}
      title={t('settle.pixTitle', { name })}
    >
      {copied ? t('settle.pixCopied') : t('settle.pix')}
    </button>
  )
}
