import { API_BASE_URL, DEFAULT_RETRY, FetchOptions, USE_MOCKS } from './config'
import { mockTasksByHorizon, mockGraph, mockConnectors } from './mocks'
import { Task, Connector, TaskId } from './types'

// Runtime automatic fallback flag: enabled when real backend becomes unreachable
let AUTO_MOCK_ACTIVE = false

export function isUsingMocks() {
  return USE_MOCKS || AUTO_MOCK_ACTIVE
}

function activateAutoMock(context: string, err: unknown) {
  if (!AUTO_MOCK_ACTIVE && !USE_MOCKS) {
    console.warn(`[api] Activating automatic mock fallback after failure in ${context}:`, err)
  }
  AUTO_MOCK_ACTIVE = true
}

function resetAutoMockIfNeeded() {
  if (AUTO_MOCK_ACTIVE) {
    console.info('[api] Backend reachable again – disabling automatic mock fallback')
    AUTO_MOCK_ACTIVE = false
  }
}

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
function mockTasksResponse(horizon?: string) {
  const all: Task[] = []
  Object.values(mockTasksByHorizon).forEach(arr => all.push(...arr))
  const tasks = horizon ? all.filter(t => t.horizon === horizon) : all
  return { tasks }
}

export async function getTasks(horizon?: string) {
  if (isUsingMocks()) return mockTasksResponse(horizon)
  const params = horizon ? `?horizon=${encodeURIComponent(horizon)}` : ''
  try {
    const res = await internalFetch<TasksResponse>(`/api/tasks${params}`)
    resetAutoMockIfNeeded()
    return res
  } catch (e) {
    activateAutoMock('getTasks', e)
    return mockTasksResponse(horizon)
  }
}

export async function completeTask(taskId: TaskId) {
  if (isUsingMocks()) {
    return { success: true }
  }
  try {
    const res = await internalFetch<{ success: boolean; task?: Task }>(`/api/tasks/${taskId}/complete`, { method: 'POST' })
    resetAutoMockIfNeeded()
    return res
  } catch (e) {
    activateAutoMock('completeTask', e)
    return { success: true }
  }
}

export async function undoTask(taskId: TaskId) {
  if (isUsingMocks()) {
    return { success: true }
  }
  try {
    const res = await internalFetch<{ success: boolean; task?: Task }>(`/api/tasks/${taskId}/undo`, { method: 'POST' })
    resetAutoMockIfNeeded()
    return res
  } catch (e) {
    activateAutoMock('undoTask', e)
    return { success: true }
  }
}

// ---------------- Graph ----------------
export interface GraphResponse { nodes: Task[]; edges: [TaskId, TaskId][] }
export async function getGraph(window?: string) {
  if (isUsingMocks()) return mockGraph
  const params = window ? `?window=${encodeURIComponent(window)}` : ''
  try {
    const res = await internalFetch<GraphResponse>(`/api/graph${params}`)
    resetAutoMockIfNeeded()
    return res
  } catch (e) {
    activateAutoMock('getGraph', e)
    return mockGraph
  }
}

// ---------------- Connectors ----------------
export interface ConnectorsResponse { connectors: Connector[] }
export async function getConnectors() {
  if (isUsingMocks()) return { connectors: mockConnectors }
  try {
    const res = await internalFetch<ConnectorsResponse>('/api/connectors')
    resetAutoMockIfNeeded()
    return res
  } catch (e) {
    activateAutoMock('getConnectors', e)
    return { connectors: mockConnectors }
  }
}

export async function connectConnector(kind: string) {
  if (isUsingMocks()) {
    return { connector: mockConnectors.find(c => c.kind === kind) }
  }
  try {
    const res = await internalFetch<{ authUrl?: string; connector?: Connector }>(`/api/connectors/${kind}/connect`, { method: 'POST' })
    resetAutoMockIfNeeded()
    return res
  } catch (e) {
    activateAutoMock('connectConnector', e)
    return { connector: mockConnectors.find(c => c.kind === kind) }
  }
}

export async function testConnector(kind: string) {
  if (isUsingMocks()) {
    return { status: 'ok', connector: mockConnectors.find(c => c.kind === kind) }
  }
  try {
    const res = await internalFetch<{ status: string; connector?: Connector }>(`/api/connectors/${kind}/test`, { method: 'POST' })
    resetAutoMockIfNeeded()
    return res
  } catch (e) {
    activateAutoMock('testConnector', e)
    return { status: 'ok', connector: mockConnectors.find(c => c.kind === kind) }
  }
}

// ---------------- Health ----------------
export async function getHealth() {
  if (USE_MOCKS) {
    return { status: 'ok', version: 'mock' }
  }
  try {
    const res = await internalFetch<{ status: string; version?: string }>('/api/health', { retry: 0 })
    // Only reset if backend is reachable and not mock override
    resetAutoMockIfNeeded()
    return res
  } catch (e) {
    // Do not immediately activate fallback solely on health; leave that to functional calls.
    return { status: 'unreachable' }
  }
}

export { ApiError }