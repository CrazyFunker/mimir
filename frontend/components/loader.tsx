interface LoaderProps {
  message?: string
}

export function Loader({ message = "…preparing your tasks… Sit back and relax while I gather information" }: LoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="mt-4 text-muted-foreground text-center max-w-md">{message}</p>
    </div>
  )
}