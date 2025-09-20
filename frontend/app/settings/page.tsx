'use client'

import React, { useState } from 'react'
import { ConnectorCard } from '@/components/connector-card'

export default function SettingsPage() {
  const [connectors, setConnectors] = useState([
    { kind: 'Jira/Confluence', status: 'disconnected' as const },
    { kind: 'GMail', status: 'ok' as const },
    { kind: 'GitHub', status: 'error' as const },
  ])

  const [testingAll, setTestingAll] = useState(false)

  const handleConnect = (kind: string) => {
    console.log('Connect:', kind)
  }

  const handleTest = (kind: string) => {
    console.log('Test:', kind)
  }

  const handleRetry = (kind: string) => {
    console.log('Retry:', kind)
  }

  const handleTestAll = () => {
    setTestingAll(true)
    console.log('Testing all MCP connections...')
    
    // Simulate testing
    setTimeout(() => {
      setTestingAll(false)
    }, 3000)
  }

  return (
    'use client'

import React, { useState } from 'react'
import { ConnectorCard } from '@/components/connector-card'
import { Button } from '@/components/ui/button'
import { Connector } from '@/lib/types'

// Mock connector data
const mockConnectors: Connector[] = [
  {
    id: '1',
    kind: 'jira',
    status: 'connected',
    baseUrl: 'https://company.atlassian.net',
    config: { 
      projectKeys: ['PROJ', 'DEV'] 
    },
    lastSyncAt: '2025-01-20T08:30:00Z',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-20T08:30:00Z'
  },
  {
    id: '2',
    kind: 'gmail',
    status: 'connected',
    config: { 
      email: 'user@company.com',
      labels: ['INBOX', 'TODO'] 
    },
    lastSyncAt: '2025-01-20T09:00:00Z',
    createdAt: '2025-01-16T14:00:00Z',
    updatedAt: '2025-01-20T09:00:00Z'
  },
  {
    id: '3',
    kind: 'github',
    status: 'error',
    config: { 
      organization: 'company',
      repositories: ['frontend', 'backend'] 
    },
    error: 'API rate limit exceeded. Please try again in 1 hour.',
    createdAt: '2025-01-18T12:00:00Z',
    updatedAt: '2025-01-20T07:00:00Z'
  }
]

export default function SettingsPage() {
  const [connectors, setConnectors] = useState(mockConnectors)
  const [testingAll, setTestingAll] = useState(false)

  const handleConnect = (kind: string) => {
    console.log('Connecting to', kind)
    // In a real app, this would trigger OAuth flow
    // For now, just simulate connection
    setConnectors(prev => prev.map(conn => 
      conn.kind === kind ? { ...conn, status: 'connecting' as const } : conn
    ))
    
    setTimeout(() => {
      setConnectors(prev => prev.map(conn => 
        conn.kind === kind ? { 
          ...conn, 
          status: 'connected' as const,
          lastSyncAt: new Date().toISOString(),
          error: undefined
        } : conn
      ))
    }, 2000)
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

  const handleTestConnection = (kind: string) => {
    console.log('Testing connection to', kind)
    // Simulate test
    setConnectors(prev => prev.map(conn => 
      conn.kind === kind ? { 
        ...conn, 
        lastChecked: new Date().toISOString()
      } : conn
    ))
  }

  const handleTestAllConnections = () => {
    setTestingAll(true)
    console.log('Testing all MCP connections...')
    
    // Simulate testing all connections
    setTimeout(() => {
      setConnectors(prev => prev.map(conn => ({
        ...conn,
        lastChecked: new Date().toISOString()
      })))
      setTestingAll(false)
    }, 3000)
  }

  const connectedCount = connectors.filter(c => c.status === 'connected').length
  const totalCount = connectors.length

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Configuration</h1>
        <p className="text-muted-foreground">
          Manage your connected services to pull tasks and information from multiple sources.
        </p>
      </div>

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
        <Button variant="outline">
          Request a connector
        </Button>
      </div>
    </div>
  )
}
  )
}