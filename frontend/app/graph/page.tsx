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
          setTasks(res.nodes || [])
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
        <h1 className="text-3xl font-semibold mb-4">Work Tree</h1>
        
        {/* Toolbar */}
        <div className="flex items-center gap-4 mb-6">
          <button className="p-2 border rounded-lg hover:bg-accent transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3"/>
            </svg>
          </button>
          <button 
            onClick={() => setFilters(prev => ({ ...prev, showCompleted: !prev.showCompleted }))}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              filters.showCompleted 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            ✓ Completed ({tasks.filter(t => t.status === 'done').length})
          </button>
          <button 
            onClick={() => setFilters(prev => ({ ...prev, showTodo: !prev.showTodo }))}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              filters.showTodo 
                ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            ○ Future ({tasks.filter(t => t.status !== 'done').length})
          </button>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 7h18"/>
              <path d="M3 12h18"/>
              <path d="M3 17h18"/>
            </svg>
            <span className="text-sm text-muted-foreground">This month ({filteredTasks.length} tasks)</span>
          </div>
        </div>
      </div>

      {/* Lane Labels */}
      <div className="mb-4">
        <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground">
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={filters.horizons.past7d}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                horizons: { ...prev.horizons, past7d: e.target.checked }
              }))}
              className="rounded"
            />
            Last 7 days
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={filters.horizons.today}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                horizons: { ...prev.horizons, today: e.target.checked }
              }))}
              className="rounded"
            />
            Today
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={filters.horizons.week}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                horizons: { ...prev.horizons, week: e.target.checked }
              }))}
              className="rounded"
            />
            This week
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={filters.horizons.month}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                horizons: { ...prev.horizons, month: e.target.checked }
              }))}
              className="rounded"
            />
            This month
          </div>
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