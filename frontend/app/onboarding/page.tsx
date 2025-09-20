"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConnectorCard } from '@/components/connector-card'
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react'
import { Connector } from '@/lib/types'

// Initial connector states for onboarding
const initialConnectors: Connector[] = [
  {
    id: '1',
    kind: 'jira',
    status: 'disconnected',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2', 
    kind: 'gmail',
    status: 'disconnected',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    kind: 'github',
    status: 'disconnected',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

type OnboardingStep = 'welcome' | 'connectors' | 'complete'

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')
  const [connectors, setConnectors] = useState(initialConnectors)

  const connectedCount = connectors.filter(c => c.status === 'connected').length
  const canComplete = connectedCount >= 1

  const handleConnect = (kind: string) => {
    console.log('Connecting to', kind)
    // In a real app, this would trigger OAuth flow
    setConnectors(prev => prev.map(conn => 
      conn.kind === kind ? { 
        ...conn, 
        status: 'connecting' as const 
      } : conn
    ))
    
    // Simulate connection after delay
    setTimeout(() => {
      setConnectors(prev => prev.map(conn => 
        conn.kind === kind ? { 
          ...conn, 
          status: 'connected' as const,
          lastSyncAt: new Date().toISOString()
        } : conn
      ))
    }, 2000)
  }

  const handleDisconnect = (kind: string) => {
    setConnectors(prev => prev.map(conn => 
      conn.kind === kind ? { 
        ...conn, 
        status: 'disconnected' as const,
        lastSyncAt: undefined 
      } : conn
    ))
  }

  const handleFinishOnboarding = () => {
    // In a real app, this would set a flag that onboarding is complete
    // and redirect to the main focus page
    window.location.href = '/'
  }

  if (currentStep === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-6">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to Mimir
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              The intelligent task manager for knowledge workers. Let's get you set up 
              by connecting to your existing tools.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-4">What Mimir does for you</h2>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-500 mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Centralized Tasks</h3>
                  <p className="text-gray-600 text-sm">
                    Pull tasks from Jira, GitHub PRs, and important emails into one unified view.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-500 mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Smart Prioritization</h3>
                  <p className="text-gray-600 text-sm">
                    AI-powered task ranking based on deadlines, dependencies, and context.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-500 mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Work Tree View</h3>
                  <p className="text-gray-600 text-sm">
                    Visualize how your tasks connect and flow through time horizons.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button 
            onClick={() => setCurrentStep('connectors')}
            size="lg"
            className="text-lg px-8 py-3"
          >
            Get Started
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  if (currentStep === 'connectors') {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Connect Your Tools
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              Connect at least one service to start using Mimir effectively.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <span>{connectedCount} of 3 connected</span>
              {canComplete && <CheckCircle className="w-4 h-4 text-green-500" />}
            </div>
          </div>

          <div className="grid gap-6 mb-12">
            {connectors.map((connector) => (
              <ConnectorCard
                key={connector.id}
                connector={connector}
                onConnect={() => handleConnect(connector.kind)}
                onDisconnect={() => handleDisconnect(connector.kind)}
              />
            ))}
          </div>

          {/* Progress and navigation */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 mb-1">
                  {canComplete ? 'You\'re ready to go!' : 'Almost there...'}
                </p>
                <p className="text-sm text-gray-600">
                  {canComplete 
                    ? 'You can always connect more services later in Settings.'
                    : 'Connect at least one service to continue.'}
                </p>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={() => handleFinishOnboarding()}
                >
                  Skip for now
                </Button>
                <Button 
                  onClick={() => setCurrentStep('complete')}
                  disabled={!canComplete}
                  className="flex items-center gap-2"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Complete step
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-6">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            You're all set! 🎉
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Mimir is now pulling tasks from your connected services. 
            Your personalized task dashboard is ready.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6">What happens next?</h2>
          <div className="grid gap-4 text-left">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                1
              </div>
              <div>
                <p className="font-medium">We'll sync your tasks</p>
                <p className="text-sm text-gray-600">This may take a few minutes for the initial sync.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold text-sm">
                2
              </div>
              <div>
                <p className="font-medium">AI will prioritize your work</p>
                <p className="text-sm text-gray-600">Tasks will be ranked by urgency and dependencies.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold text-sm">
                3
              </div>
              <div>
                <p className="font-medium">Start focusing</p>
                <p className="text-sm text-gray-600">Use keyboard shortcuts and the Work Tree to stay productive.</p>
              </div>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleFinishOnboarding}
          size="lg"
          className="text-lg px-8 py-3 bg-green-600 hover:bg-green-700"
        >
          Start Using Mimir
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  )
}