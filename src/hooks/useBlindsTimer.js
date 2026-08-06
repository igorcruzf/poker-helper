import { useState, useEffect, useRef, useCallback } from 'react'
import { fireAlert, stopAlertFeedback } from '../lib/alerts.js'

// `onSync` recebe um retrato do timer a cada transição (iniciar, pausar,
// zerar, próximo nível). Guardamos `endsAt` em vez do contador para que quem
// abrir a mesa por link calcule os segundos sozinho — sem escrever a cada
// segundo no banco.
export function useBlindsTimer(onSync) {
  const [minutes, setMinutes] = useState(10)
  const [baseBlind, setBaseBlind] = useState(10)
  const [level, setLevel] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(10 * 60)
  const [running, setRunning] = useState(false)
  const [awaitingConfirm, setAwaitingConfirm] = useState(false)
  const [active, setActive] = useState(false)
  const beepRef = useRef(null)
  const syncRef = useRef(onSync)
  syncRef.current = onSync

  const sync = useCallback((snapshot) => {
	if (syncRef.current) syncRef.current(snapshot)
  }, [])

  // Mantém o relógio sincronizado com os minutos enquanto não iniciado
  useEffect(() => {
	if (!active) setSecondsLeft(minutes * 60)
  }, [minutes, active])

  function stopBeep() {
	if (beepRef.current) {
	  clearInterval(beepRef.current)
	  beepRef.current = null
	}
	stopAlertFeedback()
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
	  fireAlert()
	  beepRef.current = setInterval(() => fireAlert(), 1200)
	  sync({ active: true, running: false, awaitingConfirm: true, level, minutes, baseBlind, secondsLeft: 0, endsAt: null })
	}
  }, [secondsLeft, running, awaitingConfirm, sync, level, minutes, baseBlind])

  useEffect(() => () => stopBeep(), [])

  const smallBlind = baseBlind * Math.pow(2, level)
  const bigBlind = smallBlind * 2
  const nextSmall = smallBlind * 2

  const start = useCallback(() => {
	stopBeep()
	const next = secondsLeft > 0 ? secondsLeft : minutes * 60
	setActive(true)
	setAwaitingConfirm(false)
	setSecondsLeft(next)
	setRunning(true)
	sync({ active: true, running: true, awaitingConfirm: false, level, minutes, baseBlind, secondsLeft: next, endsAt: Date.now() + next * 1000 })
  }, [minutes, secondsLeft, sync, level, baseBlind])

  const pause = useCallback(() => {
	setRunning(false)
	sync({ active: true, running: false, awaitingConfirm: false, level, minutes, baseBlind, secondsLeft, endsAt: null })
  }, [sync, level, minutes, baseBlind, secondsLeft])

  const confirmNext = useCallback(() => {
	stopBeep()
	const full = minutes * 60
	setLevel((l) => l + 1)
	setSecondsLeft(full)
	setAwaitingConfirm(false)
	setRunning(true)
	sync({ active: true, running: true, awaitingConfirm: false, level: level + 1, minutes, baseBlind, secondsLeft: full, endsAt: Date.now() + full * 1000 })
  }, [minutes, sync, level, baseBlind])

  const reset = useCallback(() => {
	stopBeep()
	setRunning(false)
	setAwaitingConfirm(false)
	setActive(false)
	setLevel(0)
	setSecondsLeft(minutes * 60)
	sync({ active: false, running: false, awaitingConfirm: false, level: 0, minutes, baseBlind, secondsLeft: minutes * 60, endsAt: null })
  }, [minutes, sync, baseBlind])

  return {
	minutes, setMinutes,
	baseBlind, setBaseBlind,
	level, secondsLeft, running, awaitingConfirm, active,
	smallBlind, bigBlind, nextSmall,
	start, pause, reset, confirmNext,
  }
}
