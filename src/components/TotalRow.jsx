import { fmt } from '../utils.js'
import { useI18n } from '../hooks/useI18n.js'

export default function TotalRow({ total }) {
  const { t } = useI18n()
  const balanced = Math.abs(total) < 0.005

  return (
    <div className="total-row">
      <span className="total-label">{t('table.total')}</span>
      <div className="total-right">
        <span className={`total-status ${balanced ? 'balanced' : 'unbalanced'}`}>
          {balanced ? t('table.balanced') : t('table.unbalanced')}
        </span>
        <span className={`total-value ${balanced ? 'balanced' : 'unbalanced'}`}>{fmt(total)}</span>
      </div>
    </div>
  )
}
