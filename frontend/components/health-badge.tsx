"use client"

import React, { useEffect, useState } from 'react'
import { getHealth } from '@/lib/api'
import { USE_MOCKS } from '@/lib/config'

interface HealthState {
  status: string
  version?: string
  lastChecked?: number
}

const POLL_INTERVAL = 30000 // 30s

export function HealthBadge() {
  const [health, setHealth] = useState<HealthState>({ status: 'loading' })
  const [hover, setHover] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function fetchHealth() {
      try {
        const data = await getHealth()
        if (!cancelled) {
          setHealth({ ...data, lastChecked: Date.now() })
        }
      } catch {
        if (!cancelled) setHealth({ status: 'unreachable', lastChecked: Date.now() })
      }
    }
    fetchHealth()
    const id = setInterval(fetchHealth, POLL_INTERVAL)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const { status, version } = health

  const display = (() => {
    if (USE_MOCKS) return { label: 'Mock Mode', color: 'bg-slate-500', pulse: false }
    if (status === 'loading') return { label: 'Checking…', color: 'bg-gray-300 animate-pulse', pulse: true }
    if (status === 'ok') return { label: version ? `API ${version}` : 'API OK', color: 'bg-emerald-500', pulse: false }
    if (status === 'degraded') return { label: 'API Degraded', color: 'bg-amber-500', pulse: false }
    return { label: 'API Down', color: 'bg-red-500', pulse: false }
  })()

  return (
    <div
      className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium select-none cursor-default transition-colors ${USE_MOCKS ? 'border-slate-400/50 text-slate-600 bg-slate-50' : 'border-gray-300 text-gray-600 bg-white'}`}
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
