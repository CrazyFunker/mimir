'use client'

import React from 'react'
import { Task } from '@/lib/types'
import { ExternalLink, X } from 'lucide-react'

interface TaskOverlayProps {
  task: Task
  onClose: () => void
}

export function TaskOverlay({ task, onClose }: TaskOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-foreground">
              {task.title}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                task.status === 'done' ? 'bg-green-100 text-green-800' :
                task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {task.status.replace('_', ' ')}
              </span>
              <span className="text-xs text-muted-foreground capitalize">
                {task.horizon}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        {task.description && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              {task.description}
            </p>
          </div>
        )}

        {/* External Reference */}
        {task.external && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{task.external.ref}</span>
            </div>
            {task.external.url && (
              <a
                href={task.external.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline mt-1 block"
              >
                Open in {task.external.kind}
              </a>
            )}
          </div>
        )}

        {/* Dates */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Created: {new Date(task.createdAt).toLocaleDateString()}</div>
          {task.updatedAt !== task.createdAt && (
            <div>Updated: {new Date(task.updatedAt).toLocaleDateString()}</div>
          )}
          {task.due && (
            <div>Due: {new Date(task.due).toLocaleDateString()}</div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          {task.external?.url && (
            <button
              onClick={() => window.open(task.external!.url, '_blank')}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              Open <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}