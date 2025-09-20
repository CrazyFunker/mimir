'use client'

import React from 'react'

export function SuccessRing() {
  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className="text-center">
        {/* Expanding ring animation */}
        <div className="relative">
          <div className="absolute inset-0">
            <div className="w-32 h-32 border-4 border-success rounded-full animate-ping opacity-75"></div>
          </div>
          <div className="absolute inset-0">
            <div className="w-32 h-32 border-2 border-success rounded-full animate-ping opacity-50" style={{animationDelay: '0.3s'}}></div>
          </div>
          
          {/* Center check mark */}
          <div className="relative w-32 h-32 bg-success rounded-full flex items-center justify-center">
            <svg 
              width="48" 
              height="48" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="white" 
              strokeWidth="3"
              className="animate-pulse"
            >
              <path d="m9 12 2 2 4-4"/>
            </svg>
          </div>
        </div>
        
        {/* Success message */}
        <div className="mt-6 animate-fade-in">
          <p className="text-2xl font-bold text-success">Well done! 🍾</p>
        </div>
      </div>
    </div>
  )
}