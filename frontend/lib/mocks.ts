// Centralized mock data so components/pages can switch between real API and mocks
import { Task, TasksByHorizon, Connector } from './types'

export const mockTasksByHorizon: TasksByHorizon = {
  today: [
    {
      id: '1',
      title: 'Email CTO',
      description: 'Follow up on Q4 planning discussion from yesterday\'s leadership meeting',
      horizon: 'today',
      status: 'todo',
      external: { kind: 'jira', ref: 'JIRA-1415', url: 'https://company.atlassian.net/browse/JIRA-1415' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  week: [
    {
      id: '2',
      title: 'Review API Documentation',
      description: 'Check the new authentication endpoints before client integration',
      horizon: 'week',
      status: 'todo',
      external: { kind: 'github', ref: 'PR-342', url: 'https://github.com/company/api/pull/342' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  month: [
    {
      id: '3',
      title: 'Quarterly review preparation',
      description: 'Compile team metrics and summaries',
      horizon: 'month',
      status: 'todo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  past7d: [] as any
}

export const mockGraph = {
  nodes: [
    { id: '1', title: 'Email CTO', description: 'Follow up Q4 planning', horizon: 'today', status: 'done', createdAt: '', updatedAt: '' },
    { id: '2', title: 'Review API Documentation', description: 'Auth endpoints', horizon: 'today', status: 'todo', createdAt: '', updatedAt: '' },
    { id: '3', title: 'Plan team retrospective', description: 'Agenda + room', horizon: 'week', status: 'todo', createdAt: '', updatedAt: '' },
  ],
  edges: [ ['1','2'], ['2','3'] ] as [string,string][]
}

export const mockConnectors: Connector[] = [
  { id: 'c1', kind: 'jira', status: 'connected', baseUrl: 'https://company.atlassian.net', createdAt: '', updatedAt: '' },
  { id: 'c2', kind: 'gmail', status: 'connected', createdAt: '', updatedAt: '' },
  { id: 'c3', kind: 'github', status: 'error', error: 'Rate limit', createdAt: '', updatedAt: '' },
]
