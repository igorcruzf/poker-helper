import { fmt } from '../utils.js'

export default function TotalRow({ total }) {
  const balanced = Math.abs(total) < 0.005

  return (
    <div className="total-row">
      <span className="total-label">Total da mesa</span>
      <div className="total-right">
        <span className={`total-status ${balanced ? 'balanced' : 'unbalanced'}`}>
          {balanced ? 'Mesa fechada' : 'Confira os valores'}
        </span>
        <span className={`total-value ${balanced ? 'balanced' : 'unbalanced'}`}>{fmt(total)}</span>
      </div>
    </div>
  )
}
