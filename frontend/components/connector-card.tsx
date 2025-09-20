'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { ExternalLink, CheckCircle, Circle, AlertCircle } from 'lucide-react'
import { Connector } from '@/lib/types'

interface ConnectorCardProps {
  connector: Connector
  onConnect?: () => void
  onDisconnect?: () => void
  onTestConnection?: () => void
}

export function ConnectorCard({ 
  connector, 
  onConnect, 
  onDisconnect, 
  onTestConnection 
}: ConnectorCardProps) {
  const isConnected = connector.status === 'connected'
  const isError = connector.status === 'error'

  const getIcon = () => {
    switch (connector.kind) {
      case 'jira':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" className="text-blue-600">
            <path fill="currentColor" d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.97 4.35 4.35 4.35V2H11.53zM6.77 6.8c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.97 4.35 4.35 4.35V6.8H6.77zM2 11.6c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.97 4.35 4.35 4.35V11.6H2z"/>
          </svg>
        )
      case 'gmail':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" className="text-red-600">
            <path fill="currentColor" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
          </svg>
        )
      case 'github':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" className="text-gray-900">
            <path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        )
      default:
        return <Circle className="w-6 h-6 text-gray-400" />
    }
  }

  const getStatusIcon = () => {
    if (isError) {
      return <AlertCircle className="w-5 h-5 text-red-500" />
    }
    if (isConnected) {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    }
    return <Circle className="w-5 h-5 text-gray-400" />
  }

  const getStatusText = () => {
    switch (connector.status) {
      case 'connected':
        return `Connected${connector.lastSyncAt ? ` • Last sync ${new Date(connector.lastSyncAt).toLocaleDateString()}` : ''}`
      case 'disconnected':
        return 'Not connected'
      case 'error':
        return connector.error || 'Connection error'
      default:
        return 'Unknown status'
    }
  }

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {getIcon()}
          <div>
            <h3 className="text-lg font-semibold capitalize">{connector.kind}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {getStatusIcon()}
              <span>{getStatusText()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connector.baseUrl && (
            <a 
              href={connector.baseUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Configuration details */}
      {isConnected && (
        <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
          {connector.kind === 'jira' && connector.baseUrl && (
            <div>
              <span className="font-medium">Instance:</span> {connector.baseUrl}
            </div>
          )}
          {connector.kind === 'gmail' && (
            <div>
              <span className="font-medium">Account:</span> {connector.config?.email || 'Connected'}
            </div>
          )}
          {connector.kind === 'github' && (
            <div>
              <span className="font-medium">Organization:</span> {connector.config?.organization || 'Personal'}
            </div>
          )}
        </div>
      )}

      {/* Error details */}
      {isError && connector.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {connector.error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {isConnected ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onTestConnection}
              className="flex items-center gap-2"
            >
              Test Connection
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDisconnect}
            >
              Disconnect
            </Button>
          </>
        ) : (
          <Button
            onClick={onConnect}
            size="sm"
            className="flex items-center gap-2"
          >
            <span>Connect {connector.kind}</span>
            <ExternalLink className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}