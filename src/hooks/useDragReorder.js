import { useState } from 'react'

// Native drag-and-drop plumbing for player-row reordering. Doesn't know
// about player shape or storage — just tracks the dragged id and hands
// (fromId, toId) off to the caller's reorder function.
export function useDragReorder(onReorder) {
  const [dragId, setDragId] = useState(null)

  function handleDragStart(e, id) {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e, targetId) {
    e.preventDefault()
    if (dragId && dragId !== targetId) onReorder(dragId, targetId)
    setDragId(null)
  }

  function handleDragEnd() {
    setDragId(null)
  }

  return { dragId, handleDragStart, handleDragOver, handleDrop, handleDragEnd }
}
