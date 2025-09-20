// Shared data models for Mimir application

export type TaskId = string
export type TaskHorizon = "today" | "week" | "month" | "past7d"
export type Source = "jira" | "email" | "github" | "drive" | "manual"
export type TaskStatus = "todo" | "in_progress" | "done" | "scheduled"

export interface ExternalReference {
  kind: 'jira' | 'gmail' | 'github'
  ref: string
  url?: string
}

export interface Task {
  id: string
  title: string
  description: string
  horizon: TaskHorizon
  status: TaskStatus
  external?: ExternalReference
  createdAt: string
  updatedAt: string
}

// Connector management types
export type ConnectorKind = "jira" | "gmail" | "github"
export type ConnectorStatus = "connected" | "disconnected" | "connecting" | "ok" | "error"

export interface Connector {
  id: string
  kind: ConnectorKind
  status: ConnectorStatus
  baseUrl?: string
  config?: Record<string, any>
  error?: string
  lastSyncAt?: string
  lastChecked?: string
  message?: string // show "Press to retry" when error
  createdAt: string
  updatedAt: string
}

// API response types
export interface TasksResponse {
  tasks: Task[]
}

export interface GraphResponse {
  nodes: Task[]
  edges: [TaskId, TaskId][]
}

export interface ConnectorsResponse {
  connectors: Connector[]
}

export interface ConnectResponse {
  url: string
}

export interface TestResponse {
  status: ConnectorStatus
  message?: string
}

// UI State types
export interface FocusPageState {
  selectedTaskIndex: number
  showDetail: boolean
  selectedTask?: Task
  showSuccess: boolean
  showUndo: boolean
  completedTaskId?: TaskId
}

export interface GraphPageState {
  selectedNode?: TaskId
  filters: {
    status: TaskStatus[]
    source: Source[]
    horizonVisibility: {
      past7d: boolean
      today: boolean
      week: boolean
      month: boolean
    }
  }
  window: string
}

export interface SettingsPageState {
  testingConnectors: boolean
  testResults: { [key in ConnectorKind]?: 'pending' | 'ok' | 'error' }
}

// Animation state types
export interface NavButtonState {
  variant: 'focus' | 'graph' | 'settings'
  active: boolean
  hover: boolean
  pressed: boolean
  countdown?: number // 0-100 for countdown animation
  loading: boolean
}

// Form types for task actions
export interface TaskCompleteRequest {
  taskId: TaskId
}

export interface TaskUndoRequest {
  taskId: TaskId
}

export interface ConnectorConnectRequest {
  kind: ConnectorKind
}

export interface ConnectorTestRequest {
  kind: ConnectorKind
}

// Utility types
export type TasksByHorizon = {
  today: Task[]
  week: Task[]
  month: Task[]
  past7d?: Task[]
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

// Event handler types
export interface TaskCardProps {
  task: Task
  onSelect?: (task: Task) => void
  onComplete?: (task: Task) => void
  selected?: boolean
}

export interface TaskDetailProps {
  task: Task
  onBack: () => void
  onComplete: (task: Task) => void
  onOpenExternal?: (url: string) => void
}

export interface ConnectorCardProps {
  connector: Connector
  onConnect?: (kind: ConnectorKind) => void
  onTest?: (kind: ConnectorKind) => void
  onRetry?: (kind: ConnectorKind) => void
}