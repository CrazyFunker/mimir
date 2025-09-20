export function SuccessRing() {
  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-green-500 rounded-full animate-ping"></div>
        <p className="mt-4 text-lg font-semibold">Well done! 🍾</p>
      </div>
    </div>
  )
}