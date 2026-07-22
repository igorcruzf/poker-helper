export default function BuyInRow({ buyIn, onChange }) {
  return (
    <div className="buyin-row">
      <span className="buyin-label">Valor do cacife</span>
      <div className="buyin-input-wrap">
        <span>R$</span>
        <input
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          value={buyIn}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}
