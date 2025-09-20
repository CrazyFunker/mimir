interface TaskCardProps {
  title: string
  description?: string
  externalRef?: string
  onClick?: () => void
}

export function TaskCard({ title, description, externalRef, onClick }: TaskCardProps) {
  return (
    <div 
      className="p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      {externalRef && <span className="text-xs text-muted-foreground">{externalRef}</span>}
    </div>
  )
}