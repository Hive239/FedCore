import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// Security Data Types
export interface SecurityEvent {
  id: string
  tenant_id: string
  event_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  source_ip: string
  user_id?: string
  session_id?: string
  endpoint?: string
  method?: string
  user_agent?: string
  payload?: any
  response_status?: number
  response_time?: number
  blocked: boolean
  threat_score?: number
  geolocation?: any
  device_fingerprint?: string
  created_at: string
  resolved_at?: string
  resolved_by?: string
  resolution_notes?: string
}

export interface ThreatIntelligence {
  id: string
  threat_type: string
  indicator_type: string
  indicator_value: string
  threat_score: number
  source: string
  description?: string
  tags?: string[]
  first_seen: string
  last_seen: string
  active: boolean
  confidence_level: number
}

export interface SecurityMetrics {
  threatEventsTotal: number
  threatEventsChange: number
  blockedRequestsTotal: number
  blockedRequestsChange: number
  failedLoginsTotal: number
  failedLoginsChange: number
  averageThreatScore: number
  threatScoreChange: number
  complianceScore: number
  riskScore: number
  topThreats: Array<{
    type: string
    count: number
    severity: string
  }>
  geographicThreats: Array<{
    country: string
    count: number
    risk_level: string
  }>
  timeSeriesData: Array<{
    timestamp: string
    threat_events: number
    blocked_requests: number
    threat_score: number
  }>
}

export interface SecurityIncident {
  id: string
  tenant_id: string
  incident_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed'
  title: string
  description?: string
  affected_systems?: string[]
  affected_users?: string[]
  detection_time: string
  containment_time?: string
  resolution_time?: string
  assigned_to?: string
  root_cause?: string
  lessons_learned?: string
  related_events?: string[]
  evidence?: any
  timeline?: any[]
  impact_assessment?: any
}

export interface ComplianceRecord {
  id: string
  tenant_id: string
  framework: string
  audit_type: string
  status: 'pending' | 'in_progress' | 'compliant' | 'non_compliant' | 'remediated'
  findings?: any
  recommendations?: any
  evidence_files?: string[]
  auditor_id?: string
  audit_date: string
  next_audit_date?: string
  compliance_score?: number
  risk_assessment?: any
  remediation_plan?: any
}

export interface SecurityConfiguration {
  id: string
  tenant_id: string
  rate_limits: any
  ip_whitelist?: string[]
  ip_blacklist?: string[]
  allowed_countries?: string[]
  blocked_countries?: string[]
  session_timeout: number
  max_login_attempts: number
  lockout_duration: number
  require_2fa: boolean
  password_policy: any
  allowed_file_types?: string[]
  max_file_size: number
  encryption_required: boolean
  audit_level: string
  compliance_frameworks?: string[]
  notification_settings: any
  auto_response_enabled: boolean
  threat_response_rules: any
  data_retention_days: number
}

export interface ConstructionDataAccess {
  id: string
  tenant_id: string
  user_id: string
  project_id: string
  client_id?: string
  data_type: string
  access_type: string
  data_classification: string
  justification?: string
  approved_by?: string
  approval_required: boolean
  approved_at?: string
  access_time: string
  source_ip?: string
  device_info?: any
  location_info?: any
  document_ids?: string[]
  field_access: boolean
  compliance_notes?: string
}

export interface MobileDeviceSecurity {
  id: string
  tenant_id: string
  user_id: string
  device_id: string
  device_fingerprint: string
  device_type?: string
  device_model?: string
  os_version?: string
  app_version?: string
  last_security_check?: string
  security_status: 'secure' | 'warning' | 'compromised' | 'unknown'
  jailbroken_rooted: boolean
  encryption_enabled: boolean
  screen_lock_enabled: boolean
  remote_wipe_enabled: boolean
  last_location?: any
  trusted_networks?: string[]
  security_violations?: any
  compliance_status?: any
}

export interface SecurityAlert {
  id: string
  tenant_id: string
  alert_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description?: string
  affected_resources?: any
  detection_rules?: any
  automated_response?: any
  acknowledged: boolean
  acknowledged_by?: string
  acknowledged_at?: string
  resolved: boolean
  resolved_at?: string
  false_positive: boolean
  correlation_id?: string
  created_at: string
  expires_at?: string
}

// Fetch security events
async function fetchSecurityEvents(
  tenantId?: string, 
  timeRange: string = '24h',
  eventType?: string,
  severity?: string
): Promise<SecurityEvent[]> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  let query = supabase
    .from('security_events')
    .select(`
      *,
      resolved_by_profile:profiles!security_events_resolved_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(1000)
  
  // Apply time range filter
  const timeRangeMap = {
    '1h': '1 hour',
    '24h': '24 hours',
    '7d': '7 days',
    '30d': '30 days'
  }
  
  if (timeRangeMap[timeRange as keyof typeof timeRangeMap]) {
    query = query.gte('created_at', `now() - interval '${timeRangeMap[timeRange as keyof typeof timeRangeMap]}'`)
  }
  
  if (tenantId && tenantId !== 'all') {
    query = query.eq('tenant_id', tenantId)
  }
  
  if (eventType) {
    query = query.eq('event_type', eventType)
  }
  
  if (severity) {
    query = query.eq('severity', severity)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return data || []
}

// Fetch security metrics
async function fetchSecurityMetrics(
  tenantId?: string,
  timeRange: string = '24h'
): Promise<SecurityMetrics> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  // Get current period events
  const currentEvents = await fetchSecurityEvents(tenantId, timeRange)
  
  // Get previous period for comparison
  const previousTimeRange = timeRange === '1h' ? '2h' : 
                           timeRange === '24h' ? '48h' :
                           timeRange === '7d' ? '14d' : '60d'
  
  const previousEvents = await fetchSecurityEvents(tenantId, previousTimeRange)
  const previousPeriodEvents = previousEvents.slice(currentEvents.length)
  
  // Calculate metrics
  const threatEventsTotal = currentEvents.length
  const threatEventsChange = previousPeriodEvents.length > 0 
    ? ((threatEventsTotal - previousPeriodEvents.length) / previousPeriodEvents.length) * 100 
    : 0
  
  const blockedRequestsTotal = currentEvents.filter(e => e.blocked).length
  const previousBlocked = previousPeriodEvents.filter(e => e.blocked).length
  const blockedRequestsChange = previousBlocked > 0 
    ? ((blockedRequestsTotal - previousBlocked) / previousBlocked) * 100 
    : 0
  
  const failedLoginsTotal = currentEvents.filter(e => e.event_type === 'authentication_failure').length
  const previousFailed = previousPeriodEvents.filter(e => e.event_type === 'authentication_failure').length
  const failedLoginsChange = previousFailed > 0 
    ? ((failedLoginsTotal - previousFailed) / previousFailed) * 100 
    : 0
  
  const averageThreatScore = currentEvents.reduce((sum, e) => sum + (e.threat_score || 0), 0) / Math.max(currentEvents.length, 1)
  const previousAvgScore = previousPeriodEvents.reduce((sum, e) => sum + (e.threat_score || 0), 0) / Math.max(previousPeriodEvents.length, 1)
  const threatScoreChange = previousAvgScore > 0 ? ((averageThreatScore - previousAvgScore) / previousAvgScore) * 100 : 0
  
  // Calculate top threats
  const threatCounts = currentEvents.reduce((acc: Record<string, number>, event) => {
    acc[event.event_type] = (acc[event.event_type] || 0) + 1
    return acc
  }, {})
  
  const topThreats = Object.entries(threatCounts)
    .map(([type, count]) => ({
      type,
      count,
      severity: currentEvents.find(e => e.event_type === type)?.severity || 'medium'
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  
  // Extract geographic data from actual events with geolocation
  const geographicCounts: Record<string, { count: number, risk_level: string }> = {}
  currentEvents.forEach(event => {
    if (event.geolocation?.country) {
      const country = event.geolocation.country
      if (!geographicCounts[country]) {
        geographicCounts[country] = { count: 0, risk_level: 'medium' }
      }
      geographicCounts[country].count++
      // Determine risk level based on threat scores
      const avgScore = currentEvents
        .filter(e => e.geolocation?.country === country)
        .reduce((sum, e) => sum + (e.threat_score || 0), 0) / geographicCounts[country].count
      geographicCounts[country].risk_level = avgScore > 70 ? 'high' : avgScore > 40 ? 'medium' : 'low'
    }
  })
  
  const geographicThreats = Object.entries(geographicCounts)
    .map(([country, data]) => ({
      country,
      count: data.count,
      risk_level: data.risk_level
    }))
    .sort((a, b) => b.count - a.count)
  
  // Generate time series from actual event timestamps
  const hourlyBuckets: Record<string, { threat_events: number, blocked_requests: number, threat_score: number }> = {}
  const now = new Date()
  
  // Initialize buckets for last 24 hours
  for (let i = 0; i < 24; i++) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000)
    const hourKey = hour.toISOString().slice(0, 13) // YYYY-MM-DDTHH
    hourlyBuckets[hourKey] = { threat_events: 0, blocked_requests: 0, threat_score: 0 }
  }
  
  // Populate buckets with actual data
  currentEvents.forEach(event => {
    const eventHour = new Date(event.created_at).toISOString().slice(0, 13)
    if (hourlyBuckets[eventHour]) {
      hourlyBuckets[eventHour].threat_events++
      if (event.blocked) {
        hourlyBuckets[eventHour].blocked_requests++
      }
      hourlyBuckets[eventHour].threat_score += (event.threat_score || 0)
    }
  })
  
  // Convert to array and calculate averages
  const timeSeriesData = Object.entries(hourlyBuckets)
    .map(([timestamp, data]) => ({
      timestamp: timestamp + ':00:00.000Z',
      threat_events: data.threat_events,
      blocked_requests: data.blocked_requests,
      threat_score: data.threat_events > 0 ? Math.round(data.threat_score / data.threat_events) : 0
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  
  // Calculate compliance score from actual compliance records
  const { data: complianceData } = await supabase
    .from('compliance_audit_records')
    .select('status')
    .eq('tenant_id', tenantId || '')
    .gte('audit_date', `now() - interval '30 days'`)
  
  const complianceRecords = complianceData || []
  const compliantCount = complianceRecords.filter(r => r.status === 'compliant' || r.status === 'remediated').length
  const totalCompliance = complianceRecords.length
  const complianceScore = totalCompliance > 0 ? Math.round((compliantCount / totalCompliance) * 100) : 0
  
  // Calculate risk score based on actual threat data
  const criticalEvents = currentEvents.filter(e => e.severity === 'critical').length
  const highEvents = currentEvents.filter(e => e.severity === 'high').length
  const riskScore = Math.min(100, Math.round(
    (criticalEvents * 10) + 
    (highEvents * 5) + 
    (averageThreatScore * 0.3) + 
    (blockedRequestsTotal * 2)
  ))
  
  return {
    threatEventsTotal,
    threatEventsChange,
    blockedRequestsTotal,
    blockedRequestsChange,
    failedLoginsTotal,
    failedLoginsChange,
    averageThreatScore: Math.round(averageThreatScore),
    threatScoreChange,
    complianceScore,
    riskScore,
    topThreats,
    geographicThreats,
    timeSeriesData
  }
}

// Fetch security configuration
async function fetchSecurityConfiguration(tenantId: string): Promise<SecurityConfiguration | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('security_configurations')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  return data
}

// Fetch construction data access logs
async function fetchConstructionDataAccess(
  tenantId?: string,
  projectId?: string,
  timeRange: string = '7d'
): Promise<ConstructionDataAccess[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('construction_data_access')
    .select(`
      *,
      user:profiles!construction_data_access_user_id_fkey(full_name),
      project:projects!construction_data_access_project_id_fkey(name),
      approved_by_profile:profiles!construction_data_access_approved_by_fkey(full_name)
    `)
    .order('access_time', { ascending: false })
    .limit(500)
  
  if (tenantId && tenantId !== 'all') {
    query = query.eq('tenant_id', tenantId)
  }
  
  if (projectId) {
    query = query.eq('project_id', projectId)
  }
  
  // Apply time range
  const timeRangeMap = {
    '24h': '24 hours',
    '7d': '7 days',
    '30d': '30 days'
  }
  
  if (timeRangeMap[timeRange as keyof typeof timeRangeMap]) {
    query = query.gte('access_time', `now() - interval '${timeRangeMap[timeRange as keyof typeof timeRangeMap]}'`)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return data || []
}

// Fetch security incidents
async function fetchSecurityIncidents(tenantId?: string): Promise<SecurityIncident[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('security_incidents')
    .select(`
      *,
      assigned_to_profile:profiles!security_incidents_assigned_to_fkey(full_name)
    `)
    .order('detection_time', { ascending: false })
    .limit(100)
  
  if (tenantId && tenantId !== 'all') {
    query = query.eq('tenant_id', tenantId)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return data || []
}

// Fetch security alerts
async function fetchSecurityAlerts(tenantId?: string): Promise<SecurityAlert[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('security_alerts')
    .select('*')
    .eq('acknowledged', false)
    .order('created_at', { ascending: false })
    .limit(50)
  
  if (tenantId && tenantId !== 'all') {
    query = query.eq('tenant_id', tenantId)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return data || []
}

// Fetch compliance records
async function fetchComplianceRecords(tenantId?: string): Promise<ComplianceRecord[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('compliance_audit_records')
    .select(`
      *,
      auditor:profiles!compliance_audit_records_auditor_id_fkey(full_name)
    `)
    .order('audit_date', { ascending: false })
    .limit(50)
  
  if (tenantId && tenantId !== 'all') {
    query = query.eq('tenant_id', tenantId)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return data || []
}

// Update security configuration
async function updateSecurityConfiguration(
  tenantId: string, 
  config: Partial<SecurityConfiguration>
): Promise<SecurityConfiguration> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('security_configurations')
    .upsert({
      tenant_id: tenantId,
      ...config,
      updated_at: new Date().toISOString()
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Acknowledge security alert
async function acknowledgeSecurityAlert(alertId: string): Promise<void> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  const { error } = await supabase
    .from('security_alerts')
    .update({
      acknowledged: true,
      acknowledged_by: user.id,
      acknowledged_at: new Date().toISOString()
    })
    .eq('id', alertId)
  
  if (error) throw error
}

// React Query Hooks
export function useSecurityEvents(
  tenantId?: string,
  timeRange: string = '24h',
  eventType?: string,
  severity?: string
) {
  return useQuery({
    queryKey: ['security-events', tenantId, timeRange, eventType, severity],
    queryFn: () => fetchSecurityEvents(tenantId, timeRange, eventType, severity),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5 // 5 minutes
  })
}

export function useSecurityMetrics(tenantId?: string, timeRange: string = '24h') {
  return useQuery({
    queryKey: ['security-metrics', tenantId, timeRange],
    queryFn: () => fetchSecurityMetrics(tenantId, timeRange),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 10 // 10 minutes
  })
}

export function useSecurityConfiguration(tenantId: string) {
  return useQuery({
    queryKey: ['security-configuration', tenantId],
    queryFn: () => fetchSecurityConfiguration(tenantId),
    staleTime: 1000 * 60 * 10 // 10 minutes
  })
}

export function useConstructionDataAccess(
  tenantId?: string,
  projectId?: string,
  timeRange: string = '7d'
) {
  return useQuery({
    queryKey: ['construction-data-access', tenantId, projectId, timeRange],
    queryFn: () => fetchConstructionDataAccess(tenantId, projectId, timeRange),
    staleTime: 1000 * 60 * 5 // 5 minutes
  })
}

export function useSecurityIncidents(tenantId?: string) {
  return useQuery({
    queryKey: ['security-incidents', tenantId],
    queryFn: () => fetchSecurityIncidents(tenantId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5 // 5 minutes
  })
}

export function useSecurityAlerts(tenantId?: string) {
  return useQuery({
    queryKey: ['security-alerts', tenantId],
    queryFn: () => fetchSecurityAlerts(tenantId),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60 // 1 minute
  })
}

export function useComplianceRecords(tenantId?: string) {
  return useQuery({
    queryKey: ['compliance-records', tenantId],
    queryFn: () => fetchComplianceRecords(tenantId),
    staleTime: 1000 * 60 * 30 // 30 minutes
  })
}

// Mutation hooks
export function useUpdateSecurityConfiguration() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ tenantId, config }: { tenantId: string; config: Partial<SecurityConfiguration> }) =>
      updateSecurityConfiguration(tenantId, config),
    onSuccess: (_, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: ['security-configuration', tenantId] })
    }
  })
}

export function useAcknowledgeSecurityAlert() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: acknowledgeSecurityAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-alerts'] })
    }
  })
}

// Combined hook for all security data
export function useSecurityData(tenantId?: string, timeRange: string = '24h') {
  const events = useSecurityEvents(tenantId, timeRange)
  const metrics = useSecurityMetrics(tenantId, timeRange)
  const incidents = useSecurityIncidents(tenantId)
  const alerts = useSecurityAlerts(tenantId)
  const compliance = useComplianceRecords(tenantId)
  const constructionAccess = useConstructionDataAccess(tenantId, undefined, timeRange)
  
  return {
    events: events.data || [],
    metrics: metrics.data,
    incidents: incidents.data || [],
    alerts: alerts.data || [],
    compliance: compliance.data || [],
    constructionAccess: constructionAccess.data || [],
    isLoading: events.isLoading || metrics.isLoading || incidents.isLoading || alerts.isLoading,
    error: events.error || metrics.error || incidents.error || alerts.error
  }
}

// Advanced Security Features Types
export interface AIThreatPrediction {
  id: string
  tenant_id: string
  prediction_type: string
  threat_category: string
  probability: number
  predicted_impact: 'low' | 'medium' | 'high' | 'critical'
  predicted_timeframe: string
  confidence_score: number
  risk_factors: any
  recommended_actions: any
  model_version: string
  created_at: string
  expires_at?: string
  prevented?: boolean
}

export interface VulnerabilityScan {
  id: string
  tenant_id: string
  scan_type: string
  target: string
  vulnerabilities_found: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  scan_duration: number
  findings: any
  remediation_status: string
  auto_patched: number
  created_at: string
  completed_at?: string
}

export interface ZeroTrustAccess {
  id: string
  tenant_id: string
  user_id: string
  resource_type: string
  resource_id: string
  trust_score: number
  access_granted: boolean
  denial_reason?: string
  mfa_verified: boolean
  device_compliance: boolean
  created_at: string
}

export interface BehavioralAnalytics {
  id: string
  tenant_id: string
  user_id?: string
  entity_type: string
  entity_id: string
  anomaly_score: number
  anomaly_type?: string
  ml_model_confidence: number
  risk_classification: 'benign' | 'suspicious' | 'malicious' | 'unknown'
  investigation_required: boolean
  created_at: string
}

// Fetch AI threat predictions
async function fetchAIThreatPredictions(tenantId?: string): Promise<AIThreatPrediction[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('ai_threat_predictions')
    .select('*')
    .order('probability', { ascending: false })
    .limit(50)
  
  if (tenantId && tenantId !== 'all') {
    query = query.eq('tenant_id', tenantId)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// Fetch vulnerability scans
async function fetchVulnerabilityScans(tenantId?: string): Promise<VulnerabilityScan[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('vulnerability_scans')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)
  
  if (tenantId && tenantId !== 'all') {
    query = query.eq('tenant_id', tenantId)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// Fetch zero trust access logs
async function fetchZeroTrustAccess(tenantId?: string): Promise<ZeroTrustAccess[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('zero_trust_access')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  
  if (tenantId && tenantId !== 'all') {
    query = query.eq('tenant_id', tenantId)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// Fetch behavioral analytics
async function fetchBehavioralAnalytics(tenantId?: string): Promise<BehavioralAnalytics[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('behavioral_analytics')
    .select('*')
    .gte('anomaly_score', 0.5) // Only show significant anomalies
    .order('anomaly_score', { ascending: false })
    .limit(50)
  
  if (tenantId && tenantId !== 'all') {
    query = query.eq('tenant_id', tenantId)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// Hooks for advanced features
export function useAIThreatPredictions(tenantId?: string) {
  return useQuery({
    queryKey: ['ai-threat-predictions', tenantId],
    queryFn: () => fetchAIThreatPredictions(tenantId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 10 // 10 minutes
  })
}

export function useVulnerabilityScans(tenantId?: string) {
  return useQuery({
    queryKey: ['vulnerability-scans', tenantId],
    queryFn: () => fetchVulnerabilityScans(tenantId),
    staleTime: 1000 * 60 * 15, // 15 minutes
    refetchInterval: 1000 * 60 * 30 // 30 minutes
  })
}

export function useZeroTrustAccess(tenantId?: string) {
  return useQuery({
    queryKey: ['zero-trust-access', tenantId],
    queryFn: () => fetchZeroTrustAccess(tenantId),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60 * 2 // 2 minutes
  })
}

export function useBehavioralAnalytics(tenantId?: string) {
  return useQuery({
    queryKey: ['behavioral-analytics', tenantId],
    queryFn: () => fetchBehavioralAnalytics(tenantId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5 // 5 minutes
  })
}

// Additional interfaces for new security features
export interface SupplyChainComponent {
  id: string
  tenant_id: string
  vendor_name: string
  component_name: string
  component_type: string
  version?: string
  risk_score: number
  vulnerabilities?: any
  compliance_status: string
  last_security_audit?: string
  sbom_available: boolean
  verified_signature: boolean
  license_compliance: boolean
  created_at: string
  updated_at: string
}

export interface MobileDevice {
  id: string
  tenant_id: string
  user_id: string
  device_id: string
  device_fingerprint: string
  device_type?: string
  device_model?: string
  os_version?: string
  app_version?: string
  last_security_check?: string
  security_status: 'secure' | 'warning' | 'compromised' | 'unknown'
  jailbroken_rooted: boolean
  encryption_enabled: boolean
  screen_lock_enabled: boolean
  remote_wipe_enabled: boolean
  last_location?: any
  trusted_networks?: string[]
  security_violations?: any
  compliance_status?: any
  created_at: string
  updated_at: string
}

export interface QuantumEncryption {
  id: string
  tenant_id: string
  system_component: string
  encryption_algorithm: string
  quantum_resistant: boolean
  key_length?: number
  migration_status: string
  estimated_quantum_vulnerability_date?: string
  priority_level: string
  last_rotation?: string
  next_rotation?: string
  created_at: string
  updated_at: string
}

// Fetch functions for new security features
async function fetchSupplyChainSecurity(tenantId?: string): Promise<SupplyChainComponent[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('supply_chain_security')
    .select('*')
    .order('risk_score', { ascending: false })
    .limit(50)
  
  if (tenantId && tenantId !== 'all') {
    query = query.eq('tenant_id', tenantId)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

async function fetchMobileDeviceSecurity(tenantId?: string): Promise<MobileDevice[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('mobile_device_security')
    .select(`
      *,
      user:profiles!mobile_device_security_user_id_fkey(full_name, email)
    `)
    .order('updated_at', { ascending: false })
    .limit(100)
  
  if (tenantId && tenantId !== 'all') {
    query = query.eq('tenant_id', tenantId)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

async function fetchQuantumEncryptionStatus(tenantId?: string): Promise<QuantumEncryption[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('quantum_encryption_status')
    .select('*')
    .order('priority_level', { ascending: true })
    .limit(50)
  
  if (tenantId && tenantId !== 'all') {
    query = query.eq('tenant_id', tenantId)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// New hooks for enhanced security features
export function useSupplyChainSecurity(tenantId?: string) {
  return useQuery({
    queryKey: ['supply-chain-security', tenantId],
    queryFn: () => fetchSupplyChainSecurity(tenantId),
    staleTime: 1000 * 60 * 30, // 30 minutes
    refetchInterval: 1000 * 60 * 60 // 1 hour
  })
}

export function useMobileDeviceSecurity(tenantId?: string) {
  return useQuery({
    queryKey: ['mobile-device-security', tenantId],
    queryFn: () => fetchMobileDeviceSecurity(tenantId),
    staleTime: 1000 * 60 * 10, // 10 minutes
    refetchInterval: 1000 * 60 * 30 // 30 minutes
  })
}

export function useQuantumEncryptionStatus(tenantId?: string) {
  return useQuery({
    queryKey: ['quantum-encryption-status', tenantId],
    queryFn: () => fetchQuantumEncryptionStatus(tenantId),
    staleTime: 1000 * 60 * 60, // 1 hour
    refetchInterval: 1000 * 60 * 60 * 6 // 6 hours
  })
}