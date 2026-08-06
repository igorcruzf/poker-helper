import { fmt } from '../utils.js'
import { useI18n } from '../hooks/useI18n.js'

// Os valores são definidos na criação da mesa e não mudam mais durante o jogo —
// mexer neles com a noite em andamento reescreveria o saldo de todo mundo.
export default function BuyInRow({ buyIn, rebuy }) {
  const { t } = useI18n()
  const differentRebuy = Math.abs((rebuy ?? buyIn) - buyIn) > 0.005

  // Com rebuy próprio são dois valores de mesmo peso: entram lado a lado, cada
  // um com sua legenda, em vez de um número grande e outro pendurado nele.
  if (differentRebuy) {
    return (
      <div className="buyin-split">
        <div className="buyin-cell">
          <span className="buyin-cell-label">{t('table.buyInFirst')}</span>
          <span className="buyin-cell-value">{fmt(buyIn)}</span>
        </div>
        <div className="buyin-cell">
          <span className="buyin-cell-label">{t('table.rebuyShort')}</span>
          <span className="buyin-cell-value">{fmt(rebuy)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="buyin-row">
      <span className="buyin-label">{t('table.buyIn')}</span>
      <span className="buyin-static">{fmt(buyIn)}</span>
    </div>
  )
}
