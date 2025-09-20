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
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([])
  
  // Generate mock positions for nodes (in a real app, this would be calculated based on dates/relationships)
  useEffect(() => {
    if (nodes.length === 0) return
    
    const mockNodes: GraphNode[] = nodes.map((task, index) => {
      // Position nodes based on their horizon
      const horizonX = {
        'past7d': 100,
        'today': 250,
        'week': 400,
        'month': 550
      }
      
      return {
        id: task.id,
        x: horizonX[task.horizon] || 100,
        y: 150 + (index % 3) * 80, // Vertical stacking
        task
      }
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
    if (task.status === 'todo') return '#facc15'
    return '#6b7280'
  }

    const getNodeFill = (task: Task) => {
    if (task.status === 'done') return '#22c55e'
    if (task.status === 'todo') return '#facc15'
    return 'none'
  }

  if (nodes.length === 0) {
    return (
      <div className="w-full h-96 border rounded-lg bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">No tasks to display</p>
          <p className="text-sm text-muted-foreground">Tasks will appear here as you create them</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-96 border rounded-lg bg-gray-50 relative overflow-hidden">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox="0 0 700 384"
        className="cursor-move"
      >
        {/* Grid pattern for better visual reference */}
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
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
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => handleNodeClick(node)}
            />
            
            {/* Hover tooltip */}
            {hoveredNode === node.id && (
              <g>
                <rect
                  x={node.x + 20}
                  y={node.y - 30}
                  width={150}
                  height={40}
                  fill="rgba(0,0,0,0.8)"
                  rx="4"
                />
                <text
                  x={node.x + 25}
                  y={node.y - 15}
                  fill="white"
                  fontSize="12"
                  fontWeight="bold"
                >
                  {node.task.title}
                </text>
                <text
                  x={node.x + 25}
                  y={node.y - 5}
                  fill="white"
                  fontSize="10"
                >
                  {node.task.horizon} • {node.task.status}
                </text>
              </g>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}