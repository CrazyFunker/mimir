'use client'

import React, { useState } from 'react'
import { GraphCanvas } from '@/components/graph-canvas'
import { TaskOverlay } from '@/components/task-overlay'
import { Task } from '@/lib/types'
import { getGraph } from '@/lib/api'
import { USE_MOCKS } from '@/lib/config'

// Local fallback mock (retain for design) – primary source now api.ts (which itself honors USE_MOCKS)
const fallbackTasks: Task[] = [
  {
    id: '1',
    title: 'Email CTO',
    description: 'Follow up on Q4 planning discussion from yesterday\'s leadership meeting',
    horizon: 'today',
    status: 'done',
    external: {
      kind: 'jira',
      ref: 'JIRA-1415',
      url: 'https://company.atlassian.net/browse/JIRA-1415'
    },
    createdAt: '2025-01-20T10:00:00Z',
    updatedAt: '2025-01-20T10:00:00Z'
  },
  {
    id: '2',
    title: 'Review API Documentation', 
    description: 'Check the new authentication endpoints before the client integration',
    horizon: 'today',
    status: 'todo',
    external: {
      kind: 'github',
      ref: 'PR-342',
      url: 'https://github.com/company/api/pull/342'
    },
    createdAt: '2025-01-20T09:00:00Z',
    updatedAt: '2025-01-20T09:00:00Z'
  },
  {
    id: '3',
    title: 'Plan team retrospective',
    description: 'Prepare agenda and book meeting room for next Friday\'s retro session',
    horizon: 'week',
    status: 'todo',
    createdAt: '2025-01-20T08:00:00Z',
    updatedAt: '2025-01-20T08:00:00Z'
  },
  {
    id: '4',
    title: 'Amazon food delivery',
    description: 'Order lunch for the team meeting tomorrow',
    horizon: 'past7d',
    status: 'done',
    external: {
      kind: 'jira',
      ref: 'JIRA-3678',
      url: 'https://company.atlassian.net/browse/JIRA-3678'
    },
    createdAt: '2025-01-19T14:00:00Z',
    updatedAt: '2025-01-19T16:00:00Z'
  },
  {
    id: '5',
    title: 'Quarterly review preparation',
    description: 'Compile team metrics and individual performance summaries for Q1 review',
    horizon: 'month',
    status: 'todo',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z'
  }
]

const fallbackEdges: [string, string][] = [
  ['4', '1'], // Amazon food delivery led to Email CTO
  ['2', '3'], // API review connects to retrospective
]

export default function GraphPage() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [filters, setFilters] = useState({
    showCompleted: true,
    showTodo: true,
    horizons: {
      past7d: true,
      today: true,
      week: true,
      month: true
    }
  })
  const [tasks, setTasks] = useState<Task[]>(fallbackTasks)
  const [edges, setEdges] = useState<[string,string][]>(fallbackEdges)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await getGraph()
        if (!cancelled && res) {
          const nodes = (res.nodes || []).map(n => ({ ...n, horizon: n.horizon as Task['horizon'] })) as Task[]
          setTasks(nodes)
          setEdges(res.edges || [])
        }
      } catch (e: any) {
        if (!cancelled) {
          console.warn('Graph load failed, keeping fallback', e)
          setError('Failed to load graph')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleNodeSelect = (task: Task) => {
    setSelectedTask(task)
  }

  const handleCloseOverlay = () => {
    setSelectedTask(null)
  }

  const filteredTasks = tasks.filter(task => {
    // Filter by status
    if (!filters.showCompleted && task.status === 'done') return false
    if (!filters.showTodo && task.status !== 'done') return false
    
    // Filter by horizon
    if (!filters.horizons[task.horizon as keyof typeof filters.horizons]) return false
    
    return true
  })

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-4 text-center">Work Tree</h1>
        
        {/* Toolbar */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => setFilters(prev => ({ ...prev, showCompleted: !prev.showCompleted }))}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              filters.showCompleted 
                ? 'bg-green-100 text-green-800 border border-green-400' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            ✅ Completed ({tasks.filter(t => t.status === 'done').length})
          </button>
          <button 
            onClick={() => setFilters(prev => ({ ...prev, showTodo: !prev.showTodo }))}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              filters.showTodo 
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-400' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            📋 TODO ({tasks.filter(t => t.status !== 'done').length})
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">({filteredTasks.length} tasks)</span>
          </div>
        </div>
      </div>

      {/* Lane Labels */}
      <div className="mb-4">
        <div className="flex flex-col gap-2 w-fit">
          <button
            onClick={() => setFilters(prev => ({
              ...prev,
              horizons: { ...prev.horizons, past7d: !prev.horizons.past7d }
            }))}
            className={`px-3 py-1 text-sm rounded transition-colors text-left ${
              filters.horizons.past7d
                ? 'bg-green-100 text-green-800 border border-green-400'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            Last 7 days
          </button>
          <button
            onClick={() => setFilters(prev => ({
              ...prev,
              horizons: { ...prev.horizons, today: !prev.horizons.today }
            }))}
            className={`px-3 py-1 text-sm rounded transition-colors text-left ${
              filters.horizons.today
                ? 'bg-green-100 text-green-800 border border-green-400'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setFilters(prev => ({
              ...prev,
              horizons: { ...prev.horizons, week: !prev.horizons.week }
            }))}
            className={`px-3 py-1 text-sm rounded transition-colors text-left ${
              filters.horizons.week
                ? 'bg-green-100 text-green-800 border border-green-400'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            This week
          </button>
          <button
            onClick={() => setFilters(prev => ({
              ...prev,
              horizons: { ...prev.horizons, month: !prev.horizons.month }
            }))}
            className={`px-3 py-1 text-sm rounded transition-colors text-left ${
              filters.horizons.month
                ? 'bg-green-100 text-green-800 border border-green-400'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            This month
          </button>
        </div>
      </div>

      {/* Graph Canvas */}
      {loading && <div className="text-sm text-muted-foreground mb-2">Loading graph...</div>}
      {error && <div className="text-sm text-red-600 mb-2">{error} {USE_MOCKS && '(mock mode)'}</div>}
      <GraphCanvas 
        nodes={filteredTasks} 
        edges={edges} 
        onNodeSelect={handleNodeSelect}
      />

      {/* Task Overlay */}
      {selectedTask && (
        <TaskOverlay
          task={selectedTask}
          onClose={handleCloseOverlay}
        />
      )}
    </div>
  )
}
