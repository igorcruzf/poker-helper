export default function ResetModal({ open, onCancel, onResetFull, onResetKeepPlayers }) {
  if (!open) return null

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal">
        <p className="question">Resetar cacifes</p>

        <button className="reset-choice-btn full" onClick={onResetFull}>
          Resetar 100%
          <small>Apaga todos os jogadores e volta o cacife ao valor padrão.</small>
        </button>

        <button className="reset-choice-btn keep" onClick={onResetKeepPlayers}>
          Resetar mantendo jogadores
          <small>Zera cacifes e saldos, mas mantém a lista de jogadores.</small>
        </button>

        <button className="reset-cancel-link" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  )
}
