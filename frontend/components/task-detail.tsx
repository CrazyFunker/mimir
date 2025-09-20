interface TaskDetailProps {
  title: string
  description?: string
  externalUrl?: string
  onBack: () => void
  onComplete: () => void
}

export function TaskDetail({ title, description, externalUrl, onBack, onComplete }: TaskDetailProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mb-6">{description}</p>}
        {externalUrl && (
          <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Open external link
          </a>
        )}
        <div className="flex gap-3 mt-6">
          <button 
            onClick={onBack}
            className="px-4 py-2 border border-gray-300 rounded"
          >
            BACK
          </button>
          <button 
            onClick={onComplete}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}