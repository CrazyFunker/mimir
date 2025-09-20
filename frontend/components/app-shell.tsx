'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CircularNavButton } from '@/components/circular-nav-button'
import { HealthBadge } from '@/components/health-badge'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Skip AppShell for onboarding
  if (pathname === '/onboarding') {
    return <>{children}</>
  }
  
  const getActiveVariant = () => {
    if (pathname === '/') return 'focus'
    if (pathname === '/graph') return 'graph'
    if (pathname === '/settings') return 'settings'
    return 'focus'
  }
  
  const activeVariant = getActiveVariant()
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-foreground hover:text-muted-foreground transition-colors">
            Mimir
          </Link>
          
          {/* Circular Navigation Buttons */}
          <nav className="flex items-center gap-4">
            <Link href="/">
              <CircularNavButton 
                variant="focus" 
                active={activeVariant === 'focus'} 
              />
            </Link>
            <Link href="/graph">
              <CircularNavButton 
                variant="graph" 
                active={activeVariant === 'graph'} 
              />
            </Link>
            <Link href="/settings">
              <CircularNavButton 
                variant="settings" 
                active={activeVariant === 'settings'} 
              />
            </Link>
          </nav>
          
          {/* Profile Menu */}
          <div className="flex items-center gap-2">
            <HealthBadge />
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-400 transition-colors">
              <span className="text-xs font-medium">U</span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}