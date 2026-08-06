import { THEMES } from '../hooks/useTheme.js'

export default function ThemeModal({ open, theme, onSelect, onClose }) {
  if (!open) return null

  return (
	<div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
	  <div className="modal">
		<button className="close-x" onClick={onClose}>✕</button>
		<p className="question">Temas</p>
		<div className="theme-list">
		  {THEMES.map((t) => (
			<button
			  key={t.id}
			  className={`theme-option${theme === t.id ? ' active' : ''}`}
			  onClick={() => onSelect(t.id)}
			>
			  <span className={`theme-swatch theme-swatch-${t.id}`} />
			  <span className="theme-name">{t.name}</span>
			  {theme === t.id && <span className="theme-check">✓</span>}
			</button>
		  ))}
		</div>
	  </div>
	</div>
  )
}
