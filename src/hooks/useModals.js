import { useState } from 'react'

// Groups every modal/panel toggle the table screen owns so the component body
// isn't 8 separate useState calls for the same kind of concern.
export function useModals() {
  const [deletingPlayer, setDeletingPlayer] = useState(null)
  const [adjustingPlayer, setAdjustingPlayer] = useState(null)
  const [themeOpen, setThemeOpen] = useState(false)
  const [timerOpen, setTimerOpen] = useState(false)
  const [timeBankOpen, setTimeBankOpen] = useState(false)
  const [endGameOpen, setEndGameOpen] = useState(false)

  return {
    deletingPlayer, setDeletingPlayer,
    adjustingPlayer, setAdjustingPlayer,
    themeOpen, setThemeOpen,
    timerOpen, setTimerOpen,
    timeBankOpen, setTimeBankOpen,
    endGameOpen, setEndGameOpen,
  }
}
