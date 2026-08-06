import { THEMES } from '../hooks/useTheme.js'
import { useI18n } from '../hooks/useI18n.js'

export default function ThemeModal({ open, theme, onSelect, onClose }) {
  const { t } = useI18n()
  if (!open) return null

  return (
	<div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
	  <div className="modal">
		<button className="close-x" onClick={onClose}>✕</button>
		<p className="question">{t('themes.title')}</p>
		<div className="theme-list">
		  {THEMES.map((option) => (
			<button
			  key={option.id}
			  className={`theme-option${theme === option.id ? ' active' : ''}`}
			  onClick={() => onSelect(option.id)}
			>
			  <span className={`theme-swatch theme-swatch-${option.id}`} />
			  <span className="theme-name">{t('themes.' + option.id)}</span>
			  {theme === option.id && <span className="theme-check">✓</span>}
			</button>
		  ))}
		</div>
	  </div>
	</div>
  )
}
