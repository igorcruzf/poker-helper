import { useState, useRef, useEffect } from 'react'

export default function Header({
  onOpenRanking,
  onOpenTables,
  onOpenHome,
  onOpenStats,
  onOpenThemes,
  onLogout,
  userEmail,
  canInstall,
  onInstall,
  subtitle,
  onShare,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  function pick(action) {
    setMenuOpen(false)
    action && action()
  }

  // Menu declarativo: itens indisponíveis viram `false` e a seção some junto se
  // ficar vazia. É o que mantém o mesmo menu coerente nas telas logadas, no
  // acerto aberto por link (sem conta) e com o "Instalar app" no lugar certo.
  const sections = [
    {
      label: 'mesa',
      items: [
        onOpenTables && { icon: '🃏', label: 'Minhas mesas', action: onOpenTables },
        onOpenHome && { icon: '🏠', label: 'Início do app', action: onOpenHome },
      ],
    },
    {
      label: 'referência',
      items: [onOpenRanking && { icon: '🂡', label: 'Ranking das mãos', action: onOpenRanking }],
    },
    {
      label: 'dados',
      items: [onOpenStats && { icon: '📊', label: 'Estatísticas', action: onOpenStats }],
    },
    {
      label: 'app',
      items: [
        onOpenThemes && { icon: '🎨', label: 'Temas', action: onOpenThemes },
        canInstall && { icon: '📲', label: 'Instalar app', action: onInstall },
      ],
    },
    {
      label: 'conta',
      caption: userEmail,
      items: [onLogout && { icon: '🚪', label: 'Sair', action: onLogout, danger: true }],
    },
  ]
    .map((s) => ({ ...s, items: s.items.filter(Boolean) }))
    .filter((s) => s.items.length > 0)

  return (
    <>
      <div className="top-bar">
        <button className="hamburger-btn" onClick={() => setMenuOpen(true)} title="Menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="header-titles">
          <div className="eyebrow">{subtitle || 'Mesa de Poker'}</div>
          <h1><span className="suit gold">♠</span>Cacifes<span className="suit red">♥</span></h1>
        </div>
        {onShare ? (
          <button className="hamburger-btn" onClick={onShare} title="Compartilhar a mesa">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.6" y1="10.5" x2="15.4" y2="6.5" />
              <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
            </svg>
          </button>
        ) : (
          <div className="top-bar-spacer" />
        )}
      </div>

      {menuOpen && (
        <div className="menu-overlay">
          <div className="menu-panel" ref={panelRef}>
            {sections.map((section) => (
              <div className="menu-section" key={section.label}>
                <div className="menu-section-label">{section.label}</div>
                {section.items.map((item) => (
                  <button
                    key={item.label}
                    className={`menu-item${item.danger ? ' danger' : ''}`}
                    onClick={() => pick(item.action)}
                  >
                    <span className="icon">{item.icon}</span> {item.label}
                  </button>
                ))}
                {section.caption && <div className="menu-user">{section.caption}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
