interface GraphCanvasProps {
  nodes: any[]
  edges: any[]
  onNodeSelect?: (node: any) => void
}

export function GraphCanvas({ nodes, edges, onNodeSelect }: GraphCanvasProps) {
  return (
    <div className="w-full h-96 border rounded-lg bg-gray-50 flex items-center justify-center">
      <p className="text-muted-foreground">Graph visualization will go here</p>
    </div>
  )
}