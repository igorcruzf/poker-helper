import { useState, useEffect, useRef, useCallback } from 'react'
import { fireAlert, stopAlertFeedback } from '../lib/alerts.js'

const DURATION = 30

// Standalone 30s shot-clock, independent of the blinds timer — start it
// whenever a player needs their time bank, same idea as a physical poker clock.
export function useTimeBank() {
  const [secondsLeft, setSecondsLeft] = useState(DURATION)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const alertRef = useRef(null)

  function stopAlert() {
    if (alertRef.current) {
      clearInterval(alertRef.current)
      alertRef.current = null
    }
    stopAlertFeedback()
  }

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    if (running && secondsLeft === 0) {
      setRunning(false)
      setDone(true)
      const alerta = () => fireAlert({ beep: { frequency: 880 } })
      alerta()
      alertRef.current = setInterval(alerta, 1200)
    }
  }, [secondsLeft, running])

  useEffect(() => () => stopAlert(), [])

  const start = useCallback(() => {
    stopAlert()
    setDone(false)
    setSecondsLeft(DURATION)
    setRunning(true)
  }, [])

  const stop = useCallback(() => {
    stopAlert()
    setRunning(false)
    setDone(false)
    setSecondsLeft(DURATION)
  }, [])

  const dismiss = useCallback(() => {
    stopAlert()
    setDone(false)
    setSecondsLeft(DURATION)
  }, [])

  return { secondsLeft, running, done, duration: DURATION, start, stop, dismiss }
}
