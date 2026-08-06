import { useState, useRef, useEffect } from 'react'

export default function Header({ onOpenRanking, onOpenReset, onOpenTimer, onOpenTimeBank, onOpenHistory, onOpenStats, onOpenThemes, onEndNight, canInstall, onInstall }) {
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
          <div className="eyebrow">Mesa de Poker</div>
          <h1><span className="suit gold">♠</span>Cacifes<span className="suit red">♥</span></h1>
        </div>
        <div className="top-bar-spacer" />
      </div>

      {menuOpen && (
        <div className="menu-overlay">
          <div className="menu-panel" ref={panelRef}>
            <button
              className="menu-item"
              onClick={() => { setMenuOpen(false); onOpenRanking() }}
            >
              <span className="icon">🂡</span> Ranking das mãos
            </button>
            <button
              className="menu-item"
              onClick={() => { setMenuOpen(false); onOpenTimer() }}
            >
              <span className="icon">⏱️</span> Timer de blinds
            </button>
            <button
              className="menu-item"
              onClick={() => { setMenuOpen(false); onOpenTimeBank() }}
            >
              <span className="icon">⏳</span> Time bank
            </button>
            <button
              className="menu-item"
              onClick={() => { setMenuOpen(false); onOpenHistory() }}
            >
              <span className="icon">📜</span> Histórico de jogos
            </button>
            <button
              className="menu-item"
              onClick={() => { setMenuOpen(false); onOpenStats() }}
            >
              <span className="icon">📊</span> Estatísticas
            </button>
            <button
              className="menu-item"
              onClick={() => { setMenuOpen(false); onOpenThemes() }}
            >
              <span className="icon">🎨</span> Temas
            </button>
            {canInstall && (
              <button
                className="menu-item"
                onClick={() => { setMenuOpen(false); onInstall() }}
              >
                <span className="icon">📲</span> Instalar app
              </button>
            )}
            <button
              className="menu-item"
              onClick={() => { setMenuOpen(false); onEndNight() }}
            >
              <span className="icon">✅</span> Encerrar jogo
            </button>
            <button
              className="menu-item danger"
              onClick={() => { setMenuOpen(false); onOpenReset() }}
            >
              <span className="icon">♻️</span> Resetar cacifes
            </button>
          </div>
        </div>
      )}
    </>
  )
}
