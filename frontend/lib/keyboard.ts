// Keyboard shortcuts and event handlers
export function setupKeyboardShortcuts() {
  // Global shortcuts: g f (Focus), g w (Graph), g c (Settings)
  // Focus detail: ↑/↓, Enter, Esc, Cmd/Ctrl+Enter, U
  
  let sequence = ''
  
  const handleKeyDown = (event: KeyboardEvent) => {
    // Handle global shortcuts with 'g' prefix
    if (event.key === 'g') {
      sequence = 'g'
      return
    }
    
    if (sequence === 'g') {
      sequence = '' // Reset sequence
      switch (event.key) {
        case 'f':
          window.location.href = '/'
          break
        case 'w':
          window.location.href = '/graph'
          break
        case 'c':
          window.location.href = '/settings'
          break
      }
      event.preventDefault()
      return
    }
    
    // Reset sequence if any other key is pressed
    if (sequence) {
      sequence = ''
    }
    
    // Handle other shortcuts based on context
    // These will be implemented per-page as needed
  }
  
  document.addEventListener('keydown', handleKeyDown)
  
  return () => {
    document.removeEventListener('keydown', handleKeyDown)
  }
}

export function setupFocusPageKeyboard(callbacks: {
  onArrowUp?: () => void
  onArrowDown?: () => void
  onEnter?: () => void
  onEscape?: () => void
  onComplete?: () => void
  onUndo?: () => void
}) {
  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
        callbacks.onArrowUp?.()
        event.preventDefault()
        break
      case 'ArrowDown':
        callbacks.onArrowDown?.()
        event.preventDefault()
        break
      case 'Enter':
        if (event.metaKey || event.ctrlKey) {
          callbacks.onComplete?.()
        } else {
          callbacks.onEnter?.()
        }
        event.preventDefault()
        break
      case 'Escape':
        callbacks.onEscape?.()
        event.preventDefault()
        break
      case 'u':
      case 'U':
        if (!event.metaKey && !event.ctrlKey && !event.altKey) {
          callbacks.onUndo?.()
          event.preventDefault()
        }
        break
    }
  }
  
  document.addEventListener('keydown', handleKeyDown)
  
  return () => {
    document.removeEventListener('keydown', handleKeyDown)
  }
}