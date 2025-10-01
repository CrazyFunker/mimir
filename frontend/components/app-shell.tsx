'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
      <header className="bg-white mt-2">
        <div className="py-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="pl-6 min-w-[220px]">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <Image 
                src="/logo.png" 
                alt="Mimir" 
                width={40} 
                height={40}
                priority
                className="object-contain"
              />
            </Link>
          </div>
          
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
          <div className="flex items-center justify-end gap-2 pr-6 min-w-[220px]">
            <HealthBadge />
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
