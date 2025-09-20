'use client'

import React from 'react'
import { GraphCanvas } from '@/components/graph-canvas'

export default function GraphPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-4">Work Tree</h1>
        
        {/* Toolbar */}
        <div className="flex items-center gap-4 mb-6">
          <button className="p-2 border rounded-lg hover:bg-accent">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3"/>
            </svg>
          </button>
          <span className="text-sm text-muted-foreground">This month</span>
        </div>
      </div>

      {/* Lane Labels */}
      <div className="mb-4">
        <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground">
          <div>Last 7 days</div>
          <div>Today</div>
          <div>This week</div>
          <div>This month</div>
        </div>
      </div>

      {/* Graph Canvas */}
      <GraphCanvas 
        nodes={[]} 
        edges={[]} 
        onNodeSelect={(node) => console.log('Node selected:', node)}
      />
    </div>
  )
}