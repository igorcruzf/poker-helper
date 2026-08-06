import { useState, useEffect, useRef, useCallback } from 'react'
import { playBeep } from '../utils.js'

export function useBlindsTimer() {
  const [minutes, setMinutes] = useState(10)
  const [baseBlind, setBaseBlind] = useState(10)
  const [level, setLevel] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(10 * 60)
  const [running, setRunning] = useState(false)
  const [awaitingConfirm, setAwaitingConfirm] = useState(false)
  const [active, setActive] = useState(false)
  const beepRef = useRef(null)

  // Mantém o relógio sincronizado com os minutos enquanto não iniciado
  useEffect(() => {
	if (!active) setSecondsLeft(minutes * 60)
  }, [minutes, active])

  function stopBeep() {
	if (beepRef.current) {
	  clearInterval(beepRef.current)
	  beepRef.current = null
	}
  }

  // Contagem regressiva
  useEffect(() => {
	if (!running || awaitingConfirm) return
	const id = setInterval(() => {
	  setSecondsLeft((s) => (s <= 1 ? 0 : s - 1))
	}, 1000)
	return () => clearInterval(id)
  }, [running, awaitingConfirm])

  // Ao zerar: pausa, alerta sonoro e aguarda confirmação
  useEffect(() => {
	if (running && !awaitingConfirm && secondsLeft === 0) {
	  setRunning(false)
	  setAwaitingConfirm(true)
	  playBeep()
	  beepRef.current = setInterval(playBeep, 1200)
	}
  }, [secondsLeft, running, awaitingConfirm])

  useEffect(() => () => stopBeep(), [])

  const smallBlind = baseBlind * Math.pow(2, level)
  const bigBlind = smallBlind * 2
  const nextSmall = smallBlind * 2

  const start = useCallback(() => {
	stopBeep()
	setActive(true)
	setAwaitingConfirm(false)
	setSecondsLeft((s) => (s > 0 ? s : minutes * 60))
	setRunning(true)
  }, [minutes])

  const pause = useCallback(() => setRunning(false), [])

  const confirmNext = useCallback(() => {
	stopBeep()
	setLevel((l) => l + 1)
	setSecondsLeft(minutes * 60)
	setAwaitingConfirm(false)
	setRunning(true)
  }, [minutes])

  const reset = useCallback(() => {
	stopBeep()
	setRunning(false)
	setAwaitingConfirm(false)
	setActive(false)
	setLevel(0)
	setSecondsLeft(minutes * 60)
  }, [minutes])

  return {
	minutes, setMinutes,
	baseBlind, setBaseBlind,
	level, secondsLeft, running, awaitingConfirm, active,
	smallBlind, bigBlind, nextSmall,
	start, pause, reset, confirmNext,
  }
}
