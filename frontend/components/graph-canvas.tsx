'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Task } from '@/lib/types'

interface GraphNode {
  id: string
  x: number
  y: number
  task: Task
}

interface GraphEdge {
  from: string
  to: string
}

interface GraphCanvasProps {
  nodes: Task[]
  edges: [string, string][]
  onNodeSelect?: (task: Task) => void
}

export function GraphCanvas({ nodes, edges, onNodeSelect }: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [hoveredHorizon, setHoveredHorizon] = useState<string | null>(null)
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([])
  
  // Generate mock positions for nodes (in a real app, this would be calculated based on dates/relationships)
  useEffect(() => {
    if (nodes.length === 0) return
    
    // Group nodes by horizon first
    const horizonsOrder: Array<'past7d' | 'today' | 'week' | 'month'> = ['past7d', 'today', 'week', 'month']
    const grouped: Record<string, Task[]> = {}
    horizonsOrder.forEach(h => { grouped[h] = [] })
    nodes.forEach(t => { (grouped[t.horizon] = grouped[t.horizon] || []).push(t) })

    // Sort each horizon's tasks by ID (string compare) and map to positions
    const mockNodes: GraphNode[] = []
    const horizonY: Record<string, number> = {
      'past7d': 80,
      'today': 160,
      'week': 240,
      'month': 320
    }
    horizonsOrder.forEach(h => {
      const list = (grouped[h] || []).slice().sort((a, b) => a.id.localeCompare(b.id))
      list.forEach((task, idx) => {
        const baseX = 350
        const spacing = 120
        const offset = (idx - (list.length - 1) / 2) * spacing // center them
        mockNodes.push({
          id: task.id,
            x: baseX + offset,
            y: horizonY[task.horizon] || 80,
            task
        })
      })
    })
    
    setGraphNodes(mockNodes)
  }, [nodes])

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node.id)
    onNodeSelect?.(node.task)
  }

  const getNodeColor = (task: Task) => {
    return task.status === 'done' ? '#22c55e' : '#6b7280'
  }

  const getNodeStroke = (task: Task) => {
    if (task.status === 'done') return '#22c55e'
    if (task.status === 'todo' || task.status === 'in_progress') return '#facc15'
    return '#6b7280'
  }

    const getNodeFill = (task: Task) => {
    if (task.status === 'done') return '#22c55e'
    if (task.status === 'todo' || task.status === 'in_progress') return '#facc15'
    return 'none'
  }

  // Determine opacity based on horizon and hover state
  const getNodeOpacity = (task: Task) => {
    const horizon = task.horizon
    // TODAY nodes always fully opaque unless another horizon hover rule overrides? Requirement: TODAY default opaque, others semi.
    const baseOpacity = horizon === 'today' ? 1 : 0.35
    if (!hoveredHorizon) return baseOpacity
    // When a horizon is hovered, that horizon becomes fully opaque, others dimmed
    return horizon === hoveredHorizon ? 1 : 0.15
  }

  if (nodes.length === 0) {
    return (
      <div className="w-full h-96 border rounded-lg bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">No tasks to display</p>
          <p className="text-sm text-muted-foreground">Tasks will appear here as you create them</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-96 border rounded-lg bg-white relative overflow-hidden">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox="0 0 700 384"
      >
        {/* Grid pattern for better visual reference */}
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Horizon boundary lines */}
        {[120, 200, 280].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="700"
            y2={y}
            stroke="#d1d5db"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        ))}

        {/* Horizon labels centered between lines */}
        {[
          { y: 60, label: 'Past 7 Days', key: 'past7d' },
          { y: 160, label: 'Today', key: 'today' },
          { y: 240, label: 'This Week', key: 'week' },
          { y: 332, label: 'This Month', key: 'month' }
        ].map(({ y, label, key }) => {
          const focused = hoveredHorizon ? hoveredHorizon === key : key === 'today'
          return (
            <text
              key={label}
              x="10"
              y={y}
              fill={focused ? '#374151' : '#9ca3af'}
              fontSize="10"
              fontWeight={focused ? 'bold' : 'medium'}
              className="uppercase tracking-wider transition-colors duration-150"
            >
              {label}
            </text>
          )
        })}
        
        {/* Render edges */}
        {edges.map(([fromId, toId], index) => {
          const fromNode = graphNodes.find(n => n.id === fromId)
          const toNode = graphNodes.find(n => n.id === toId)
          
          if (!fromNode || !toNode) return null
          
          return (
            <line
              key={`${fromId}-${toId}-${index}`}
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              stroke="#94a3b8"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          )
        })}
        
        {/* Render nodes */}
        {graphNodes.map((node) => (
          <g key={node.id}>
            {/* Node circle */}
            <circle
              cx={node.x}
              cy={node.y}
              r={hoveredNode === node.id ? 16 : 12}
              fill={getNodeFill(node.task)}
              stroke={getNodeStroke(node.task)}
              strokeWidth={selectedNode === node.id ? 4 : 2}
              opacity={getNodeOpacity(node.task)}
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => {
                setHoveredNode(node.id)
                setHoveredHorizon(node.task.horizon)
              }}
              onMouseLeave={() => {
                setHoveredNode(null)
                setHoveredHorizon(null)
              }}
              onClick={() => handleNodeClick(node)}
            />
          </g>
        ))}
        
        {/* Hover tooltip - rendered separately to be on top */}
        {graphNodes.find(node => node.id === hoveredNode) && (() => {
          const node = graphNodes.find(n => n.id === hoveredNode)!
          // Dynamic text wrapping + sizing
          const maxCharsPerLine = 32
          const words = node.task.title.split(/\s+/)
          const lines: string[] = []
          let current = ''
          words.forEach(w => {
            const test = current.length ? current + ' ' + w : w
            if (test.length > maxCharsPerLine) {
              if (current) lines.push(current)
              current = w
            } else {
              current = test
            }
          })
          if (current) lines.push(current)

          const statusLine = `${node.task.horizon} • ${node.task.status}`
          const charWidth = 7.2 // approximate average char width in px for font-size 13
          const horizontalPadding = 24
          const contentWidth = Math.max(
            ...[...lines, statusLine].map(l => l.length * charWidth),
            120 // minimum width
          )
          let tooltipWidth = Math.ceil(contentWidth) + horizontalPadding
          const lineHeight = 18
          const verticalPadding = 16
          const tooltipHeight = lines.length * lineHeight + lineHeight + verticalPadding // title lines + status line

          // Positioning logic (avoid clipping right edge)
          let tooltipX = node.x + 24
          if (tooltipX + tooltipWidth > 700) {
            tooltipX = node.x - 24 - tooltipWidth
          }
          // Clamp min X
          if (tooltipX < 4) tooltipX = 4
          const tooltipY = node.y - tooltipHeight / 2
          // Ensure tooltip fully visible vertically
          const minY = 4
          const maxY = 384 - tooltipHeight - 4
            
          const finalY = Math.min(Math.max(tooltipY, minY), maxY)
          const textStartX = tooltipX + 12
          const firstLineY = finalY + 20

          return (
            <g style={{ pointerEvents: 'none' }}>
              <rect
                x={tooltipX}
                y={finalY}
                width={tooltipWidth}
                height={tooltipHeight}
                fill="rgba(0,0,0,0.85)"
                rx={8}
              />
              {/* Title lines */}
              {lines.map((line, idx) => (
                <text
                  key={idx}
                  x={textStartX}
                  y={firstLineY + idx * lineHeight}
                  fill="white"
                  fontSize={13}
                  fontWeight="bold"
                >
                  {line}
                </text>
              ))}
              {/* Status line */}
              <text
                x={textStartX}
                y={firstLineY + lines.length * lineHeight}
                fill="#cbd5e1"
                fontSize={11}
              >
                {statusLine}
              </text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}
