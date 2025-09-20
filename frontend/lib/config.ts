// Centralized runtime configuration

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
export const USE_MOCKS = (process.env.NEXT_PUBLIC_USE_MOCKS || 'false').toLowerCase() === 'true'
export const LOG_API = (process.env.NEXT_PUBLIC_LOG_API || 'false').toLowerCase() === 'true'

export interface FetchOptions extends RequestInit {
  skipAuth?: boolean
  retry?: number
}

export const DEFAULT_RETRY = 1

export function shouldUseMocks() {
  return USE_MOCKS
}
