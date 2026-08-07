import { useGoBack } from '../hooks/useGoBack.js'
import { useI18n } from '../hooks/useI18n.js'

export default function BackBar({ to, title }) {
  const { t } = useI18n()
  const goBack = useGoBack(to)

  return (
    <div className="screen-top">
      <button className="back-link" onClick={goBack}>{t('common.back')}</button>
      {title && <span className="screen-title">{title}</span>}
    </div>
  )
}
