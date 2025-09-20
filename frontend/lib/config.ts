// Centralized runtime configuration

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface FetchOptions extends RequestInit {
  skipAuth?: boolean
  retry?: number
}

export const DEFAULT_RETRY = 1
