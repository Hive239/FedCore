'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestSecurityConnection() {
  const [status, setStatus] = useState<any>({})
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    const supabase = createClient()
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setStatus({ error: 'Not authenticated' })
        return
      }

      // Test inserting a real security event
      const testEvent = {
        tenant_id: user.id,
        event_type: 'system_health_check',
        severity: 'low',
        source_ip: '127.0.0.1',
        user_id: user.id,
        endpoint: '/api/health',
        method: 'GET',
        response_status: 200,
        blocked: false,
        threat_score: 5,
        geolocation: { country: 'United States', city: 'System' },
        created_at: new Date().toISOString()
      }

      // Insert test event
      const { data: insertedEvent, error: insertError } = await supabase
        .from('security_events')
        .insert([testEvent])
        .select()
        .single()

      if (insertError) {
        console.error('Insert error:', JSON.stringify(insertError, null, 2))
        setStatus({ 
          error: `Failed to insert: ${insertError.message || 'Unknown error'}`,
          details: insertError
        })
        return
      }

      // Query all security events
      const { data: events, error: queryError } = await supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (queryError) {
        console.error('Query error:', queryError)
        setStatus({ 
          error: `Failed to query: ${queryError.message}`,
          details: queryError
        })
        return
      }

      // Check other tables
      const tableChecks = await Promise.allSettled([
        supabase.from('security_incidents').select('count'),
        supabase.from('security_alerts').select('count'),
        supabase.from('compliance_records').select('count'),
        supabase.from('ai_threat_predictions').select('count'),
        supabase.from('vulnerability_scans').select('count'),
        supabase.from('zero_trust_access').select('count'),
        supabase.from('mobile_device_security').select('count'),
        supabase.from('supply_chain_security').select('count')
      ])

      const tableCounts = {
        security_incidents: tableChecks[0].status === 'fulfilled' ? tableChecks[0].value.data?.length : 'Error',
        security_alerts: tableChecks[1].status === 'fulfilled' ? tableChecks[1].value.data?.length : 'Error',
        compliance_records: tableChecks[2].status === 'fulfilled' ? tableChecks[2].value.data?.length : 'Error',
        ai_threat_predictions: tableChecks[3].status === 'fulfilled' ? tableChecks[3].value.data?.length : 'Error',
        vulnerability_scans: tableChecks[4].status === 'fulfilled' ? tableChecks[4].value.data?.length : 'Error',
        zero_trust_access: tableChecks[5].status === 'fulfilled' ? tableChecks[5].value.data?.length : 'Error',
        mobile_device_security: tableChecks[6].status === 'fulfilled' ? tableChecks[6].value.data?.length : 'Error',
        supply_chain_security: tableChecks[7].status === 'fulfilled' ? tableChecks[7].value.data?.length : 'Error'
      }

      setStatus({
        success: true,
        user: user.email,
        insertedEvent: insertedEvent,
        totalEvents: events?.length || 0,
        latestEvents: events?.slice(0, 3).map(e => ({
          type: e.event_type,
          severity: e.severity,
          time: e.created_at
        })),
        tableCounts
      })

    } catch (error) {
      console.error('Test failed:', error)
      setStatus({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  const insertRealData = async () => {
    setLoading(true)
    const supabase = createClient()
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Insert various types of real security events
      const realEvents = [
        {
          tenant_id: user.id,
          event_type: 'login_successful',
          severity: 'low',
          source_ip: '192.168.1.1',
          user_id: user.id,
          endpoint: '/api/auth/login',
          method: 'POST',
          response_status: 200,
          blocked: false,
          threat_score: 0,
          created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString()
        },
        {
          tenant_id: user.id,
          event_type: 'permission_denied',
          severity: 'medium',
          source_ip: '10.0.0.1',
          user_id: user.id,
          endpoint: '/api/admin/users',
          method: 'DELETE',
          response_status: 403,
          blocked: true,
          threat_score: 45,
          created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString()
        },
        {
          tenant_id: user.id,
          event_type: 'api_rate_limit',
          severity: 'low',
          source_ip: '172.16.0.1',
          user_id: user.id,
          endpoint: '/api/reports/generate',
          method: 'POST',
          response_status: 429,
          blocked: false,
          threat_score: 20,
          created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString()
        }
      ]

      const { data, error } = await supabase
        .from('security_events')
        .insert(realEvents)
        .select()

      if (error) {
        console.error('Failed to insert real events:', error)
      } else {
        console.log('Inserted real events:', data)
        alert(`Successfully inserted ${data.length} real security events!`)
      }
    } finally {
      setLoading(false)
      testConnection() // Refresh status
    }
  }

  useEffect(() => {
    testConnection()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Database Connection Test</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={testConnection} disabled={loading}>
              Test Connection
            </Button>
            <Button onClick={insertRealData} disabled={loading} variant="outline">
              Insert Real Events
            </Button>
          </div>
          
          {loading && <p>Testing connection...</p>}
          
          {status.success && (
            <div className="space-y-2 text-sm">
              <p className="text-green-600 font-semibold">✅ Connected to Real Database!</p>
              <p>User: {status.user}</p>
              <p>Total Events in Database: {status.totalEvents}</p>
              
              {status.latestEvents?.length > 0 && (
                <div>
                  <p className="font-semibold mt-2">Latest Events:</p>
                  <ul className="list-disc list-inside">
                    {status.latestEvents.map((e: any, i: number) => (
                      <li key={i}>
                        {e.type} - {e.severity} - {new Date(e.time).toLocaleString()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div>
                <p className="font-semibold mt-2">Table Status:</p>
                <ul className="list-disc list-inside">
                  {Object.entries(status.tableCounts || {}).map(([table, count]) => (
                    <li key={table}>
                      {table}: {count === 'Error' ? '❌ Not accessible' : `${count} records`}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {status.error && (
            <div className="text-red-600">
              <p className="font-semibold">Error:</p>
              <p>{status.error}</p>
              {status.details && (
                <pre className="text-xs mt-2 p-2 bg-red-50 rounded">
                  {JSON.stringify(status.details, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}