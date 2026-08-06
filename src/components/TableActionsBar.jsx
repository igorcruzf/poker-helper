const ICONS = {
  player: (
    <>
      <path d="M15 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13" r="8" />
      <line x1="12" y1="13" x2="12" y2="9" />
      <line x1="9" y1="2" x2="15" y2="2" />
    </>
  ),
  bank: (
    <>
      <path d="M6 2h12" />
      <path d="M6 22h12" />
      <path d="M8 2v4a4 4 0 0 0 4 4 4 4 0 0 0 4-4V2" />
      <path d="M8 22v-4a4 4 0 0 1 4-4 4 4 0 0 1 4 4v4" />
    </>
  ),
  end: (
    <>
      <path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" />
      <polyline points="22 4 12 14.1 9 11.1" />
    </>
  ),
}

function BarButton({ icon, label, badge, highlight, onClick }) {
  return (
    <button className={`table-action${highlight ? ' primary' : ''}`} onClick={onClick} title={label}>
      <span className="table-action-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {ICONS[icon]}
        </svg>
        {badge && <span className="table-action-badge" />}
      </span>
      <span className="table-action-label">{label}</span>
    </button>
  )
}

// Ações do meio do jogo, sempre ao alcance do polegar. Encerrar fica por último,
// separado do resto para não ser clicado sem querer.
export default function TableActionsBar({ onAddPlayer, onOpenTimer, onOpenTimeBank, onEndGame, timerActive, timeBankActive }) {
  return (
    <div className="table-actions">
      <BarButton icon="player" label="Jogador" onClick={onAddPlayer} />
      <BarButton icon="timer" label="Timer" badge={timerActive} onClick={onOpenTimer} />
      <BarButton icon="bank" label="Time bank" badge={timeBankActive} onClick={onOpenTimeBank} />
      <BarButton icon="end" label="Encerrar" highlight onClick={onEndGame} />
    </div>
  )
}
