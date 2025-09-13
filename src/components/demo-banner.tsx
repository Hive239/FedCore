'use client'

export function DemoBanner() {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
  
  if (!isDemoMode) return null
  
  return (
    <div className="bg-yellow-500 text-black px-4 py-2 text-center text-sm font-medium">
      🚧 Demo Mode - Exploring without authentication. Changes won't be saved to database.
    </div>
  )
}