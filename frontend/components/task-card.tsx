'use client'

import React from 'react'
import { ExternalLink } from 'lucide-react'

interface TaskCardProps {
  title: string
  description?: string
  externalRef?: string
  selected?: boolean
  onClick?: () => void
}

export function TaskCard({ title, description, externalRef, selected, onClick }: TaskCardProps) {
  const selectedStyles = selected ? "ring-2 ring-ring bg-accent" : ""
  
  return (
    <div 
      className={`p-4 border rounded-lg cursor-pointer hover:shadow-md hover:bg-accent/50 transition-all group bg-card ${selectedStyles}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground group-hover:text-accent-foreground">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {description}
            </p>
          )}
          
          {externalRef && (
            <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
              <ExternalLink className="w-3 h-3" />
              <span>{externalRef}</span>
            </div>
          )}
        </div>
        
        {/* Back chevron - shown in detail state */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            className="text-muted-foreground"
          >
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </div>
      </div>
    </div>
  )
}