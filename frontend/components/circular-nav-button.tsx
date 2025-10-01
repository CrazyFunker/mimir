'use client'

import React from 'react'
import Image from 'next/image'

interface CircularNavButtonProps {
  variant: 'focus' | 'graph' | 'settings'
  active?: boolean
  onClick?: () => void
}

export function CircularNavButton({ variant, active, onClick }: CircularNavButtonProps) {
  const baseClasses = "w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all duration-300 hover:shadow-lg hover:border-4 focus:outline-none focus:ring-2 focus:ring-ring"
  const activeClasses = active ? "border-foreground bg-accent" : "border-muted hover:border-foreground"
  
  const getIconPath = () => {
    switch (variant) {
      case 'focus':
        return '/focus.png'
      case 'graph':
        return '/graph.png'
      case 'settings':
        return '/settings.png'
      default:
        return '/focus.png'
    }
  }

  const getIconSize = () => {
    switch (variant) {
      case 'focus':
        return { width: 32, height: 32 }
      case 'graph':
        return { width: 42, height: 42 }
      case 'settings':
        return { width: 30, height: 30 }
      default:
        return { width: 32, height: 32 }
    }
  }

  const iconSize = getIconSize()

  return (
    <button 
      className={`${baseClasses} ${activeClasses}`}
      onClick={onClick}
      aria-label={`Navigate to ${variant}`}
      type="button"
    >
      <Image 
        src={getIconPath()} 
        alt={`${variant} icon`}
        width={iconSize.width}
        height={iconSize.height}
        className="object-contain"
      />
    </button>
  )
}
