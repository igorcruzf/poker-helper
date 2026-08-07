import { useEffect, useState } from 'react'
import { onSyncStatus, syncStatus } from '../lib/syncQueue.js'

// { online, pending } — se o banco respondeu da última vez e quantas alterações
// ainda estão guardadas no aparelho esperando a conexão.
export function useSyncStatus() {
  const [status, setStatus] = useState(syncStatus)
  useEffect(() => onSyncStatus(setStatus), [])
  return status
}
