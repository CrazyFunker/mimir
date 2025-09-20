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
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <h1 className="text-3xl font-semibold mb-8">Configuration</h1>
      
      {/* Test All Button */}
      <div className="mb-8">
        <button 
          onClick={handleTestAll}
          disabled={testingAll}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {testingAll ? 'Testing MCP connections...' : 'Test MCP connections'}
        </button>
      </div>
      
      {/* Connector Cards */}
      <div className="space-y-4">
        {connectors.map((connector, index) => (
          <ConnectorCard
            key={index}
            kind={connector.kind}
            status={connector.status}
            onConnect={() => handleConnect(connector.kind)}
            onTest={() => handleTest(connector.kind)}
            onRetry={() => handleRetry(connector.kind)}
          />
        ))}
      </div>
    </div>
  )
}