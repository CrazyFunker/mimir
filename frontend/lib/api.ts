import { API_BASE_URL, DEFAULT_RETRY, FetchOptions } from './config'
import { Task, Connector, TaskId } from './types'

interface ApiErrorShape {
  error?: string
  message?: string
  code?: string | number
}

class ApiError extends Error {
  status: number
  body?: ApiErrorShape | unknown
  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body as ApiErrorShape
  }
}

async function internalFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  const { retry = DEFAULT_RETRY, ...rest } = options
  let attempt = 0
  let lastError: unknown
  while (attempt <= retry) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(rest.headers || {}),
        },
        ...rest,
      })
      const text = await response.text()
      const json = text ? safeParseJSON(text) : undefined
      if (!response.ok) {
        throw new ApiError(`Request failed (${response.status})`, response.status, json)
      }
      return json as T
    } catch (err) {
      lastError = err
      if (attempt === retry) break
      attempt++
      await new Promise(r => setTimeout(r, 150 * attempt))
    }
  }
  throw lastError
}

function safeParseJSON(text: string) {
  try { return JSON.parse(text) } catch { return undefined }
}

// ---------------- Tasks ----------------
export interface TasksResponse { tasks: Task[] }
export async function getTasks(horizon?: string) {
  const params = horizon ? `?horizon=${encodeURIComponent(horizon)}` : ''
  return internalFetch<TasksResponse>(`/api/tasks${params}`)
}

export async function completeTask(taskId: TaskId) {
  return internalFetch<{ success: boolean; task?: Task }>(`/api/tasks/${taskId}/complete`, { method: 'POST' })
}

export async function undoTask(taskId: TaskId) {
  return internalFetch<{ success: boolean; task?: Task }>(`/api/tasks/${taskId}/undo`, { method: 'POST' })
}

// ---------------- Graph ----------------
export interface GraphResponse { nodes: Task[]; edges: [TaskId, TaskId][] }
export async function getGraph(window?: string) {
  const params = window ? `?window=${encodeURIComponent(window)}` : ''
  return internalFetch<GraphResponse>(`/api/graph${params}`)
}

// ---------------- Connectors ----------------
export interface ConnectorsResponse { connectors: Connector[] }
export async function getConnectors() {
  return internalFetch<ConnectorsResponse>('/api/connectors')
}

export async function connectConnector(kind: string) {
  return internalFetch<{ authUrl?: string; connector?: Connector }>(`/api/connectors/${kind}/connect`, { method: 'POST' })
}

export async function testConnector(kind: string) {
  return internalFetch<{ status: string; connector?: Connector }>(`/api/connectors/${kind}/test`, { method: 'POST' })
}

// ---------------- Health ----------------
export async function getHealth() {
  try {
    return await internalFetch<{ status: string; version?: string }>('/api/health', { retry: 0 })
  } catch (e) {
    return { status: 'unreachable' }
  }
}

export { ApiError }