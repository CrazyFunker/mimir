interface ConnectorCardProps {
  kind: string
  status: 'disconnected' | 'connecting' | 'ok' | 'error'
  onConnect?: () => void
  onTest?: () => void
  onRetry?: () => void
}

export function ConnectorCard({ kind, status, onConnect, onTest, onRetry }: ConnectorCardProps) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full ${
            status === 'ok' ? 'bg-green-500' :
            status === 'error' ? 'bg-red-500' :
            status === 'connecting' ? 'bg-yellow-500' :
            'bg-gray-300'
          }`} />
          <h3 className="font-semibold">{kind}</h3>
        </div>
        <div>
          {status === 'disconnected' && onConnect && (
            <button onClick={onConnect} className="px-3 py-1 bg-blue-600 text-white rounded">
              Connect
            </button>
          )}
          {status === 'ok' && onTest && (
            <button onClick={onTest} className="px-3 py-1 border border-gray-300 rounded">
              Test
            </button>
          )}
          {status === 'error' && onRetry && (
            <button onClick={onRetry} className="px-3 py-1 bg-red-600 text-white rounded">
              Press to retry
            </button>
          )}
        </div>
      </div>
      {status === 'ok' && <p className="text-sm text-green-600 mt-2">🍾 Connected successfully</p>}
    </div>
  )
}