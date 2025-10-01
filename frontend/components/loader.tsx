import Image from 'next/image'

interface LoaderProps {
  message?: string
  image?: string
}

export function Loader({ message = "…preparing your tasks… Sit back and relax while I gather information", image }: LoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen -mt-40">
      {image ? (
        <Image 
          src={image} 
          alt="Loading" 
          width={300} 
          height={300}
          className="animate-pulse"
        />
      ) : (
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      )}
      <p className="mt-4 text-muted-foreground text-center max-w-md">{message}</p>
    </div>
  )
}
