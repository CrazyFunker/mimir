'use client'

import React from 'react'

interface CircularNavButtonProps {
  variant: 'focus' | 'graph' | 'settings'
  active?: boolean
  onClick?: () => void
}

export function CircularNavButton({ variant, active, onClick }: CircularNavButtonProps) {
  const baseClasses = "w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all duration-300 hover:shadow-lg hover:border-4 focus:outline-none focus:ring-2 focus:ring-ring"
  const activeClasses = active ? "border-foreground bg-accent" : "border-muted hover:border-foreground"
  
  const renderIcon = () => {
    switch (variant) {
      case 'focus':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
        )
      case 'graph':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {/* Tree structure with three terminals */}
            <line x1="12" y1="6" x2="12" y2="18" />
            <circle cx="12" cy="6" r="2" fill="currentColor" />
            <circle cx="8" cy="18" r="2" fill="currentColor" />
            <circle cx="16" cy="18" r="2" fill="currentColor" />
            <line x1="12" y1="14" x2="8" y2="18" />
            <line x1="12" y1="14" x2="16" y2="18" />
          </svg>
        )
      case 'settings':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" />
            <path d="m19.07 4.93-4.24 4.24m0 5.66 4.24 4.24M4.93 4.93l4.24 4.24m0 5.66-4.24 4.24" />
          </svg>
        )
    }
  }

  return (
    <button 
      className={`${baseClasses} ${activeClasses}`}
      onClick={onClick}
      aria-label={`Navigate to ${variant}`}
      type="button"
    >
      {renderIcon()}
    </button>
  )
}