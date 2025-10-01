'use client'

import { useState, useEffect, useCallback } from 'react'
import { getTasks, completeTask as apiCompleteTask, undoTask as apiUndoTask, suggestTasks, getSuggestJobStatus } from '@/lib/api'
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
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(-1)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showUndo, setShowUndo] = useState(false)
  const [lastCompletedTask, setLastCompletedTask] = useState<Task | null>(null)
  const [suggestionState, setSuggestionState] = useState<'idle' | 'loading' | 'polling' | 'error'>('idle')
  const [suggestionJobId, setSuggestionJobId] = useState<string | null>(null)

  // Get all visible tasks in order for keyboard navigation
  const allTasks = tasks.today

  const loadTasks = useCallback(async () => {
    // No need for cancelled flag logic with useCallback if dependencies are correct
    setLoading(true)
    try {
      const res = await getTasks()
      if (res?.tasks) {
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
      setLoading(false)
    }
  }, [])

  // Initial load from backend
  useEffect(() => {
    loadTasks()
  }, [loadTasks])

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
        case 'ArrowLeft':
          setSelectedTaskIndex(prev => {
            if (prev === -1) return 0
            return Math.max(0, prev - 1)
          })
          event.preventDefault()
          break
        case 'ArrowRight':
          setSelectedTaskIndex(prev => {
            if (prev === -1) return 0
            return Math.min(allTasks.length - 1, prev + 1)
          })
          event.preventDefault()
          break
        case 'Enter':
          if (selectedTaskIndex !== -1 && allTasks[selectedTaskIndex]) {
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

  // Polling for suggestion job
  useEffect(() => {
    if (suggestionState !== 'polling' || !suggestionJobId) return

    const interval = setInterval(async () => {
      try {
        const job = await getSuggestJobStatus(suggestionJobId)
        if (job.status === 'completed') {
          setSuggestionState('idle')
          setSuggestionJobId(null)
          clearInterval(interval)
          // Refresh tasks now that the job is done
          loadTasks()
        } else if (job.status === 'failed') {
          console.error('Suggestion job failed:', job)
          setSuggestionState('error')
          setSuggestionJobId(null)
          clearInterval(interval)
        }
        // If 'running', continue polling
      } catch (error) {
        console.error('Failed to poll for suggestion job status:', error)
        setSuggestionState('error')
        setSuggestionJobId(null)
        clearInterval(interval)
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(interval)
  }, [suggestionState, suggestionJobId, loadTasks])

  const handleGenerateSuggestions = async () => {
    setSuggestionState('loading')
    try {
      const { job_id } = await suggestTasks()
      setSuggestionJobId(job_id)
      setSuggestionState('polling')
    } catch (error) {
      console.error("Failed to start suggestion job:", error)
      setSuggestionState('error')
    }
  }

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
    <div className="flex justify-center min-h-screen px-4 pt-32">
      <div className="w-full max-w-6xl">
        {/* Today Section */}
        <section>
          <h1 className="text-3xl font-semibold mb-8 text-center">Today</h1>
          <div className="flex justify-center">
            <div className="flex gap-4 flex-wrap justify-center">
              {tasks.today.length > 0 ? (
                tasks.today.map((task, index) => (
                  <div key={task.id} className="w-80">
                    <TaskCard 
                      title={task.title}
                      description={task.description}
                      externalRef={task.external?.ref}
                      selected={selectedTaskIndex === index}
                      onClick={() => handleTaskSelect(task)}
                    />
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nothing urgent today</p>
                  <button 
                    onClick={handleGenerateSuggestions}
                    disabled={suggestionState === 'loading' || suggestionState === 'polling'}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                  >
                    {suggestionState === 'loading' || suggestionState === 'polling' ? 'Generating...' : 'Generate suggestions'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

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
