// Analytics tracking for user interactions
type AnalyticsEvent = 
  | 'focus_open_detail'
  | 'task_complete' 
  | 'task_undo'
  | 'graph_node_open'
  | 'connector_connect_start'
  | 'connector_connect_success'
  | 'connector_connect_error'
  | 'test_all_connectors'

interface AnalyticsData {
  [key: string]: any
}

export function trackEvent(event: AnalyticsEvent, data?: AnalyticsData) {
  // In development, just log to console
  if (process.env.NODE_ENV === 'development') {
    console.log('Analytics Event:', event, data)
    return
  }
  
  // In production, send to your analytics service
  // Example: Send to your backend or third-party service
  try {
    // This would be replaced with actual analytics implementation
    fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      }),
    }).catch(console.error)
  } catch (error) {
    console.warn('Analytics tracking failed:', error)
  }
}

export function trackPageView(page: string) {
  trackEvent('page_view' as AnalyticsEvent, { page })
}

export function trackTaskComplete(taskId: string, horizon: string) {
  trackEvent('task_complete', { taskId, horizon })
}

export function trackTaskUndo(taskId: string) {
  trackEvent('task_undo', { taskId })
}

export function trackConnectorEvent(kind: string, event: 'start' | 'success' | 'error', message?: string) {
  trackEvent(`connector_connect_${event}` as AnalyticsEvent, { kind, message })
}