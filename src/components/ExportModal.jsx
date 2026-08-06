import { useState } from 'react'
import { fmt, computeSaldo } from '../utils.js'

const EPS = 0.005

export default function ExportModal({ open, onClose, buyIn, players, copyEndsGame, setCopyEndsGame, onEndGame }) {
  const [copyLabel, setCopyLabel] = useState('Copiar resumo')
  const [mode, setMode] = useState(null) // null | 'even' | 'top' | 'ignore'

  if (!open) return null

  const total = players.reduce((acc, p) => acc + computeSaldo(p, buyIn), 0)
  const needsBalance = Math.abs(total) > EPS && players.length > 0

  // Calcula os saldos exibidos no resumo conforme o modo escolhido
  function adjustedSaldos(selectedMode) {
    const base = players.map((p) => ({
      name: p.name,
      cacifes: p.cacifes,
      saldo: computeSaldo(p, buyIn),
    }))

    if (!needsBalance || !selectedMode || selectedMode === 'ignore') {
      return base
    }

    if (selectedMode === 'even') {
      const share = total / players.length
      return base.map((p) => ({ ...p, saldo: p.saldo - share }))
    }

    // 'top': desconta do(s) jogador(es) com maior saldo (dividindo entre empatados)
    const maxSaldo = Math.max(...base.map((p) => p.saldo))
    const topPlayers = base.filter((p) => Math.abs(p.saldo - maxSaldo) < EPS)
    const share = total / topPlayers.length
    return base.map((p) =>
      Math.abs(p.saldo - maxSaldo) < EPS ? { ...p, saldo: p.saldo - share } : p
    )
  }

  function buildText(selectedMode) {
    const lines = [
      `Cacifes — R$ ${buyIn.toFixed(2).replace('.', ',')} por cacife`,
      '',
    ]
    if (players.length === 0) {
      lines.push('(sem jogadores)')
    } else {
      adjustedSaldos(selectedMode).forEach((p) => {
        lines.push(`${p.name}: ${fmt(p.saldo)}  (${p.cacifes}x cacife)`)
      })
    }
    return lines.join('\n')
  }

  const previewMode = needsBalance ? mode : null
  const text = buildText(previewMode)

  async function doCopy(selectedMode) {
    try {
      await navigator.clipboard.writeText(buildText(selectedMode))
      setCopyLabel('Copiado!')
      setTimeout(() => setCopyLabel('Copiar resumo'), 1500)
    } catch {
      setCopyLabel('Selecione e copie manualmente')
    }
    if (copyEndsGame && players.length > 0) {
      onEndGame && onEndGame()
      setTimeout(() => handleClose(), 600)
    }
  }

  function chooseMode(selectedMode) {
    setMode(selectedMode)
    doCopy(selectedMode)
  }

  function handleClose() {
    setMode(null)
    onClose()
  }

  // Mostra as opções assim que o modal abre, se o saldo total não for zero
  if (needsBalance && !mode) {
    return (
      <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}>
        <div className="modal">
          <button className="close-x" onClick={handleClose}>✕</button>
          <p className="question">O saldo total não é zero</p>
          <div className="share-text" style={{ textAlign: 'center' }}>
            Total atual: {fmt(total)}.{'\n'}Como deseja copiar o resumo?
          </div>
          <button className="reset-choice-btn keep" onClick={() => chooseMode('even')}>
            Distribuir igualmente
            <small>Aplica a diferença dividida por igual entre todos os jogadores.</small>
          </button>
          <button className="reset-choice-btn keep" onClick={() => chooseMode('top')}>
            Ajustar no maior saldo
            <small>Desconta a diferença do maior saldo (dividida por igual se houver empate).</small>
          </button>
          <button className="reset-choice-btn full" onClick={() => chooseMode('ignore')}>
            Copiar mesmo assim
            <small>Ignora a diferença e copia os saldos como estão.</small>
          </button>
          <button className="reset-cancel-link" onClick={handleClose}>Cancelar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="modal">
        <button className="close-x" onClick={handleClose}>✕</button>
        <p className="question">Resumo do jogo</p>
        <div className="share-text">{text}</div>
        <label className="copy-toggle">
          <input
            type="checkbox"
            checked={!!copyEndsGame}
            onChange={(e) => setCopyEndsGame(e.target.checked)}
          />
          Encerrar o jogo ao copiar
        </label>
        <button className="copy-btn" onClick={() => doCopy(previewMode)}>{copyLabel}</button>
      </div>
    </div>
  )
}
