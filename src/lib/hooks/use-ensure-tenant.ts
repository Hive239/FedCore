import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function useEnsureTenant() {
  const [isChecking, setIsChecking] = useState(true)
  const [hasTenant, setHasTenant] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkAndEnsureTenant = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session || !session.user) {
          setError('No active session')
          setIsChecking(false)
          return
        }

        // Check if user has a tenant
        const { data: userTenant } = await supabase
          .from('user_tenants')
          .select('tenant_id')
          .eq('user_id', session.user.id)
          .single()

        if (userTenant) {
          setHasTenant(true)
          setIsChecking(false)
          return
        }

        // User doesn't have a tenant, call API to ensure one
        const response = await fetch('/api/tenant/ensure', {
          credentials: 'same-origin'
        })

        if (response.ok) {
          const result = await response.json()
          console.log('Tenant ensured:', result)
          setHasTenant(true)
        } else {
          const errorData = await response.json()
          setError(errorData.error || 'Failed to ensure tenant')
        }
      } catch (err) {
        console.error('Error ensuring tenant:', err)
        setError('Failed to check tenant assignment')
      } finally {
        setIsChecking(false)
      }
    }

    checkAndEnsureTenant()
  }, [supabase])

  return { isChecking, hasTenant, error }
}