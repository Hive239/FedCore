"use client"

import { createContext, useContext, ReactNode } from 'react'

interface DemoUser {
  id: string
  email: string
  name: string
  tenantId: string
  tenantName: string
  role: 'owner' | 'admin' | 'member'
}

interface DemoContextType {
  user: DemoUser | null
  isDemo: boolean
}

const DemoContext = createContext<DemoContextType | undefined>(undefined)

// Demo data - only used when NEXT_PUBLIC_DEMO_MODE is true
const DEMO_USER: DemoUser = {
  id: 'f013cb62-e5fb-40ec-a92e-b655505e2b88',
  email: 'demo@projectpro.com',
  name: 'Demo User',
  tenantId: '550e8400-e29b-41d4-a716-446655440001',
  tenantName: 'Demo Construction Company',
  role: 'owner'
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
  
  return (
    <DemoContext.Provider value={{ 
      user: isDemoMode ? DEMO_USER : null, 
      isDemo: isDemoMode 
    }}>
      {children}
    </DemoContext.Provider>
  )
}

export function useDemoUser() {
  const context = useContext(DemoContext)
  if (!context) {
    throw new Error('useDemoUser must be used within DemoProvider')
  }
  return context
}