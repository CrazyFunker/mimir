"use client"

import React, { useEffect, useRef, useState } from 'react'
import { getHealth, isUsingMocks } from '@/lib/api'
import { USE_MOCKS } from '@/lib/config'

interface HealthState {
  status: string
  version?: string
  lastChecked?: number
}

// Base polling intervals (ms)
const FAST_POLL = 5000    // while unhealthy / unreachable
const SLOW_POLL = 30000   // normal healthy cadence

export function HealthBadge() {
  const [health, setHealth] = useState<HealthState>({ status: 'loading' })
  const [hover, setHover] = useState(false)
  const timeoutRef = useRef<number | null>(null)
  const unmountedRef = useRef(false)

  // Centralized fetch + schedule logic
  const scheduleNext = (delay: number) => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(runFetch, delay)
  }

  const runFetch = async () => {
    try {
      const data = await getHealth()
      if (unmountedRef.current) return
      setHealth({ ...data, lastChecked: Date.now() })
      const nextDelay = data.status === 'ok' || data.status === 'degraded' ? SLOW_POLL : FAST_POLL
      scheduleNext(nextDelay)
    } catch (e) {
      // getHealth currently never throws (it returns { status: 'unreachable' })
      // but guard anyway in case of future changes
      if (unmountedRef.current) return
      console.warn('[HealthBadge] fetch failed', e)
      setHealth({ status: 'unreachable', lastChecked: Date.now() })
      scheduleNext(FAST_POLL)
    }
  }

  useEffect(() => {
    unmountedRef.current = false
    runFetch()

    const handleVisibility = () => {
      if (!document.hidden) {
        // Trigger immediate refresh when tab becomes active
        runFetch()
      }
    }
    const handleFocus = () => runFetch()
    const handleOnline = () => runFetch()

    window.addEventListener('focus', handleFocus)
    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      unmountedRef.current = true
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  const { status, version } = health

  const runtimeMocks = isUsingMocks()
  const display = (() => {
    if (USE_MOCKS) return { label: 'Mock Mode', color: 'bg-slate-500', pulse: false }
    if (runtimeMocks) return { label: 'Auto Fallback', color: 'bg-amber-500', pulse: false }
    if (status === 'loading') return { label: 'Checking…', color: 'bg-gray-300 animate-pulse', pulse: true }
    if (status === 'ok') return { label: version ? `API ${version}` : 'API OK', color: 'bg-emerald-500', pulse: false }
    if (status === 'degraded') return { label: 'API Degraded', color: 'bg-amber-500', pulse: false }
    if (status === 'unreachable') return { label: 'API Down', color: 'bg-red-500', pulse: false }
    return { label: status, color: 'bg-red-500', pulse: false }
  })()

  return (
    <div
      className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium select-none cursor-default transition-colors ${runtimeMocks ? 'border-slate-400/50 text-slate-600 bg-slate-50' : 'border-gray-300 text-gray-600 bg-white'}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={`Backend health: ${display.label}`}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${display.color}`}></span>
      <span>{display.label}</span>
      {hover && !USE_MOCKS && health.lastChecked && (
        <span className="text-[10px] text-gray-400 ml-1">{new Date(health.lastChecked).toLocaleTimeString()}</span>
      )}
    </div>
  )
}
