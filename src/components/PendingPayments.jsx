import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fmt, fmtDate } from '../utils.js'
import PixButton from './PixButton.jsx'
import { useI18n } from '../hooks/useI18n.js'

const STORAGE_KEY = 'poker-pending-dismissed'

// A assinatura do que está em aberto. Fechar o aviso guarda esta marca; se
// aparecer dívida nova ou um valor mudar, a assinatura muda e o aviso volta —
// dispensar uma vez não pode silenciar a próxima cobrança.
function signatureOf(pending) {
  const ids = [...pending.iOwe, ...pending.owedToMe].map((e) => e.id).sort()
  return `${ids.join(',')}|${pending.groupPending.toFixed(2)}`
}

function readDismissed(groupId) {
  try {
    return localStorage.getItem(`${STORAGE_KEY}:${groupId}`) || ''
  } catch {
    return ''
  }
}

// Cobrança sem depender de push: a dívida aparece na primeira tela do app, com
// a chave pix de quem recebe a um toque de distância.
export default function PendingPayments({ pending, pix, isHost, groupId }) {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [dismissed, setDismissed] = useState('')

  useEffect(() => {
    setDismissed(groupId ? readDismissed(groupId) : '')
  }, [groupId])

  const { iOwe, owedToMe, iOweTotal, owedToMeTotal, groupPending } = pending
  const nothingMine = iOwe.length === 0 && owedToMe.length === 0
  // Para host sem dívida própria ainda vale mostrar o que o grupo deve.
  if (nothingMine && (!isHost || groupPending <= 0)) return null

  const signature = signatureOf(pending)
  if (dismissed === signature) return null

  function hide() {
    setDismissed(signature)
    try {
      localStorage.setItem(`${STORAGE_KEY}:${groupId}`, signature)
    } catch {
      /* modo privado: vale só para esta sessão */
    }
  }

  return (
    <div className="rail pending-rail">
      <div className={`card pending-card${iOwe.length > 0 ? ' owing' : ''}`}>
        <button className="pending-close" onClick={hide} title={t('pending.dismiss')}>✕</button>

        {iOwe.length > 0 && (
          <>
            <div className="section-title">
              {t('pending.youOwe', { amount: fmt(iOweTotal) })}
            </div>
            {iOwe.map((e) => (
              <div className="pending-row" key={e.id}>
                <button className="pending-open" onClick={() => navigate(`/acerto/${e.shareToken}`)}>
                  <strong>{e.who}</strong>
                  <small>{e.tableName ? `${e.tableName} · ` : ''}{fmtDate(e.date)}</small>
                </button>
                <PixButton pixKey={pix[e.toSeatId]} name={e.who} />
                <span className="pending-amount">{fmt(e.amount)}</span>
              </div>
            ))}
          </>
        )}

        {owedToMe.length > 0 && (
          <>
            <div className="section-title">
              {t('pending.owedToYou', { amount: fmt(owedToMeTotal) })}
            </div>
            {owedToMe.map((e) => (
              <div className="pending-row" key={e.id}>
                <button className="pending-open" onClick={() => navigate(`/mesa/${e.tableId}/acerto`)}>
                  <strong>{e.who}</strong>
                  <small>{e.tableName ? `${e.tableName} · ` : ''}{fmtDate(e.date)}</small>
                </button>
                <span className="pending-amount">{fmt(e.amount)}</span>
              </div>
            ))}
          </>
        )}

        {nothingMine && (
          <div className="section-title only">
            {t('pending.groupOnly', { amount: fmt(groupPending) })}
          </div>
        )}
      </div>
    </div>
  )
}
