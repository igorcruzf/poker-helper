import { useState } from 'react'

// Groups every modal/panel toggle App.jsx owns so the component body
// isn't 9 separate useState calls for the same kind of concern.
export function useModals() {
  const [deletingPlayer, setDeletingPlayer] = useState(null)
  const [adjustingPlayer, setAdjustingPlayer] = useState(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [timerOpen, setTimerOpen] = useState(false)
  const [timeBankOpen, setTimeBankOpen] = useState(false)
  const [endGameOpen, setEndGameOpen] = useState(false)

  return {
    deletingPlayer, setDeletingPlayer,
    adjustingPlayer, setAdjustingPlayer,
    exportOpen, setExportOpen,
    resetOpen, setResetOpen,
    themeOpen, setThemeOpen,
    historyOpen, setHistoryOpen,
    statsOpen, setStatsOpen,
    timerOpen, setTimerOpen,
    timeBankOpen, setTimeBankOpen,
    endGameOpen, setEndGameOpen,
  }
}
