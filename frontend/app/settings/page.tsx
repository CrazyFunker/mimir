"use client"

import React, { useState, useEffect } from 'react'
import { ConnectorCard } from '@/components/connector-card'
import { Button } from '@/components/ui/button'
import { Connector } from '@/lib/types'
import { getConnectors, connectConnector, testConnector } from '@/lib/api'
import { USE_MOCKS } from '@/lib/config'

export default function SettingsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [testingAll, setTestingAll] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await getConnectors()
        if (!cancelled) setConnectors(res.connectors || [])
      } catch (e: any) {
        if (!cancelled) setError('Failed to load connectors')
        console.warn('Connector load failed', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const refresh = async () => {
    try {
      const res = await getConnectors()
      setConnectors(res.connectors || [])
    } catch (e) { /* ignore */ }
  }

  const handleConnect = async (kind: string) => {
    setBusy(kind)
    try {
      const res = await connectConnector(kind)
      if (res?.authUrl) {
        window.location.href = res.authUrl
        return
      }
      await refresh()
    } catch (e) {
      console.warn('Connect failed', e)
    } finally { setBusy(null) }
  }

  const handleDisconnect = (kind: string) => {
    console.log('Disconnecting from', kind)
    setConnectors(prev => prev.map(conn => 
      conn.kind === kind ? { 
        ...conn, 
        status: 'disconnected' as const,
        lastSyncAt: undefined
      } : conn
    ))
  }

  const handleTestConnection = async (kind: string) => {
    setBusy(kind)
    try {
      await testConnector(kind)
      await refresh()
    } catch (e) {
      console.warn('Test failed', e)
    } finally { setBusy(null) }
  }

  const handleTestAllConnections = async () => {
    setTestingAll(true)
    try {
      for (const c of connectors) {
        await testConnector(c.kind)
      }
      await refresh()
    } catch (e) {
      console.warn('Bulk test failed', e)
    } finally { setTestingAll(false) }
  }

  const connectedCount = connectors.filter(c => c.status === 'connected').length
  const totalCount = connectors.length

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2 text-center">Configuration</h1>
        <p className="text-muted-foreground text-center">
          Manage your connected services to pull tasks and information from multiple sources.
        </p>
      </div>

  {loading && <div className="mb-4 text-sm text-muted-foreground">Loading connectors...</div>}
  {error && <div className="mb-4 text-sm text-red-600">{error} {USE_MOCKS && '(mock mode)'}</div>}
  {/* Connection Status Summary */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium mb-1">Your Connectors</h2>
            <p className="text-sm text-muted-foreground">
              {connectedCount} of {totalCount} services connected
            </p>
          </div>
          <Button
            onClick={handleTestAllConnections}
            disabled={testingAll}
            variant="outline"
            className="flex items-center gap-2"
          >
            {testingAll ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                Testing connections...
              </>
            ) : (
              'Test MCP connections'
            )}
          </Button>
        </div>
      </div>

      {/* Connector Cards */}
      <div className="grid gap-6">
        {connectors.map((connector) => (
          <ConnectorCard
            key={connector.id}
            connector={connector}
            onConnect={() => handleConnect(connector.kind)}
            onDisconnect={() => handleDisconnect(connector.kind)}
            onTestConnection={() => handleTestConnection(connector.kind)}
          />
        ))}
      </div>

      {/* Add New Connector */}
      <div className="mt-8 p-6 border-2 border-dashed border-gray-300 rounded-lg text-center">
        <h3 className="text-lg font-medium mb-2">Need another connector?</h3>
        <p className="text-muted-foreground mb-4">
          We can add support for additional services like Slack, Notion, or Linear.
        </p>
        <Button variant="outline" onClick={refresh} disabled={loading}>
          Refresh
        </Button>
      </div>
    </div>
  )
}