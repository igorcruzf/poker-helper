import { LOCALE_OPTIONS } from '../lib/i18n.js'
import { useI18n } from '../hooks/useI18n.js'

export default function LanguageModal({ open, onClose }) {
  const { t, pref, setLocale } = useI18n()

  if (!open) return null

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <button className="close-x" onClick={onClose}>✕</button>
        <p className="question">{t('language.title')}</p>
        <div className="theme-list">
          {LOCALE_OPTIONS.map((option) => (
            <button
              key={option.id}
              className={`theme-option${pref === option.id ? ' active' : ''}`}
              onClick={() => setLocale(option.id)}
            >
              <span className="lang-flag">{option.flag}</span>
              <span className="theme-name">
                {option.label || t('language.auto')}
                {option.id === 'auto' && <small>{t('language.autoHint')}</small>}
              </span>
              {pref === option.id && <span className="theme-check">✓</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
