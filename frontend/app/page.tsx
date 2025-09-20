'use client'

import { useState, useEffect, useCallback } from 'react'
import { getTasks, completeTask as apiCompleteTask, undoTask as apiUndoTask } from '@/lib/api'
import { Loader } from '@/components/loader'
import { TaskCard } from '@/components/task-card'
import { TaskDetail } from '@/components/task-detail'
import { SuccessRing } from '@/components/success-ring'
import { Task, TasksByHorizon } from '@/lib/types'

// Mock data for development
const mockTasks: TasksByHorizon = {
  today: [
    {
      id: '1',
      title: 'Email CTO',
      description: 'Follow up on Q4 planning discussion from yesterday\'s leadership meeting',
      horizon: 'today',
      status: 'todo',
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
    }
  ],
  week: [
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
      title: 'Update dependencies',
      description: 'Security patches for React and Node.js packages in the main application',
      horizon: 'week', 
      status: 'todo',
      external: {
        kind: 'github',
        ref: 'DEP-UPDATE',
        url: 'https://github.com/company/frontend/issues/89'
      },
      createdAt: '2025-01-19T16:00:00Z',
      updatedAt: '2025-01-19T16:00:00Z'
    }
  ],
  month: [
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
}

export default function FocusPage() {
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<TasksByHorizon>(mockTasks)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showUndo, setShowUndo] = useState(false)
  const [lastCompletedTask, setLastCompletedTask] = useState<Task | null>(null)

  // Get all visible tasks in order for keyboard navigation
  const allTasks = [...tasks.today.slice(0, 3), ...tasks.week.slice(0, 3), ...tasks.month.slice(0, 3)]

  // Initial load from backend
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await getTasks()
        if (!cancelled && res?.tasks) {
          // Group tasks by horizon (fallback to existing structure keys)
            const grouped: TasksByHorizon = { today: [], week: [], month: [], past7d: [] as any } as any
            res.tasks.forEach(t => {
              if (t.horizon === 'today') grouped.today.push(t)
              else if (t.horizon === 'week') grouped.week.push(t)
              else if (t.horizon === 'month') grouped.month.push(t)
              else if (t.horizon === 'past7d') (grouped as any).past7d.push(t)
            })
            setTasks(grouped)
        }
      } catch (e) {
        // Silent fallback to mockTasks
        console.warn('Failed to load tasks from API, using mock', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle keyboard shortcuts if detail modal is open or loading
      if (selectedTask || loading) {
        // Handle keyboard shortcuts within the detail modal
        if (selectedTask) {
          switch (event.key) {
            case 'Escape':
              handleBack()
              event.preventDefault()
              break
            case 'Enter':
              if (event.metaKey || event.ctrlKey) {
                handleTaskComplete(selectedTask)
                event.preventDefault()
              }
              break
          }
        }
        return
      }

      switch (event.key) {
        case 'ArrowUp':
          setSelectedTaskIndex(prev => Math.max(0, prev - 1))
          event.preventDefault()
          break
        case 'ArrowDown':
          setSelectedTaskIndex(prev => Math.min(allTasks.length - 1, prev + 1))
          event.preventDefault()
          break
        case 'Enter':
          if (allTasks[selectedTaskIndex]) {
            if (event.metaKey || event.ctrlKey) {
              handleTaskComplete(allTasks[selectedTaskIndex])
            } else {
              handleTaskSelect(allTasks[selectedTaskIndex])
            }
            event.preventDefault()
          }
          break
        case 'u':
        case 'U':
          if (!event.metaKey && !event.ctrlKey && !event.altKey && showUndo) {
            handleUndo()
            event.preventDefault()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedTask, loading, selectedTaskIndex, allTasks, showUndo])

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task)
  }

  const handleTaskComplete = async (task: Task) => {
    // Optimistically remove task from UI
    const updatedTasks = { ...tasks }
    const horizon = task.horizon as keyof TasksByHorizon
    updatedTasks[horizon] = (updatedTasks[horizon] || []).filter(t => t.id !== task.id)
    setTasks(updatedTasks)
    setSelectedTask(null)
    setLastCompletedTask(task)

    // Show success animation
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      setShowUndo(true)
    }, 2000)

    // Auto-hide undo after 10 seconds
    setTimeout(() => {
      setShowUndo(false)
    }, 10000)

    try {
      await apiCompleteTask(task.id)
      // Refetch tasks to get the updated list
      const res = await getTasks()
      if (res?.tasks) {
        const grouped: TasksByHorizon = { today: [], week: [], month: [], past7d: [] }
        res.tasks.forEach(t => {
          if (t.horizon === 'today') grouped.today.push(t)
          else if (t.horizon === 'week') grouped.week.push(t)
          else if (t.horizon === 'month') grouped.month.push(t)
          else if (t.horizon === 'past7d') (grouped.past7d!).push(t)
        })
        setTasks(grouped)
      }
    } catch (error) {
      console.error("Failed to complete task:", error)
      // TODO: Revert optimistic update on failure
    }
  }

  const handleUndo = async () => {
    if (lastCompletedTask) {
      const updatedTasks = { ...tasks }
      const horizon = lastCompletedTask.horizon as keyof TasksByHorizon
      
      updatedTasks[horizon] = (updatedTasks[horizon] || []).map(t => 
        t.id === lastCompletedTask.id ? { ...t, status: 'todo' as const } : t
      )
      
      setTasks(updatedTasks)
      setShowUndo(false)
      setLastCompletedTask(null)
      apiUndoTask(lastCompletedTask.id).catch(err => {
        console.warn('Failed to persist undo', err)
      })
    }
  }

  const handleBack = () => {
    setSelectedTask(null)
  }

  if (loading) {
    return <Loader />
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-semibold mb-8">Focus</h1>
      
      {/* Today Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Today</h2>
        <div className="space-y-3">
          {tasks.today.length > 0 ? (
            tasks.today.slice(0, 3).map((task, index) => (
              <TaskCard 
                key={task.id}
                title={task.title}
                description={task.description}
                externalRef={task.external?.ref}
                selected={selectedTaskIndex === index}
                onClick={() => handleTaskSelect(task)}
              />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nothing urgent today</p>
              <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Generate suggestions
              </button>
            </div>
          )}
        </div>
      </section>

      {/* This Week Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">This week</h2>
        <div className="space-y-3">
          {tasks.week.length > 0 ? (
            tasks.week.slice(0, 3).map((task, index) => {
              const globalIndex = tasks.today.slice(0, 3).length + index
              return (
                <TaskCard 
                  key={task.id}
                  title={task.title}
                  description={task.description}
                  externalRef={task.external?.ref}
                  selected={selectedTaskIndex === globalIndex}
                  onClick={() => handleTaskSelect(task)}
                />
              )
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No tasks planned for this week</p>
              <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Generate suggestions
              </button>
            </div>
          )}
        </div>
      </section>

      {/* This Month Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">This month</h2>
        <div className="space-y-3">
          {tasks.month.length > 0 ? (
            tasks.month.slice(0, 3).map((task, index) => {
              const globalIndex = tasks.today.slice(0, 3).length + tasks.week.slice(0, 3).length + index
              return (
                <TaskCard 
                  key={task.id}
                  title={task.title}
                  description={task.description}
                  externalRef={task.external?.ref}
                  selected={selectedTaskIndex === globalIndex}
                  onClick={() => handleTaskSelect(task)}
                />
              )
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No long-term tasks set</p>
              <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Generate suggestions
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetail
          title={selectedTask.title}
          description={selectedTask.description}
          externalUrl={selectedTask.external?.url}
          onBack={handleBack}
          onComplete={() => handleTaskComplete(selectedTask)}
        />
      )}

      {/* Success Ring */}
      {showSuccess && <SuccessRing />}

      {/* Undo Button */}
      {showUndo && (
        <div className="fixed bottom-8 right-8">
          <button 
            onClick={handleUndo}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg shadow-lg hover:bg-gray-700 transition-colors"
          >
            UNDO
          </button>
        </div>
      )}
    </div>
  )
}