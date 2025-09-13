"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Shield,
  AlertTriangle,
  Activity,
  Lock,
  Globe,
  Smartphone,
  FileText,
  Users,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Zap,
  Brain,
  Bell,
  Settings,
  Cpu,
  Fingerprint,
  Network,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  CircuitBoard,
  Sparkles,
  Bot,
  Scan,
  Key,
  WifiOff,
  Target,
  Package,
  HardDrive,
  Layers,
  Database,
  Router,
  Wifi,
  Building
} from 'lucide-react'
import { 
  useSecurityData, 
  useAIThreatPredictions,
  useVulnerabilityScans,
  useZeroTrustAccess,
  useBehavioralAnalytics,
  useSupplyChainSecurity,
  useMobileDeviceSecurity,
  useQuantumEncryptionStatus
} from '@/lib/hooks/use-security'
import { useCurrentTenant } from '@/components/tenant/tenant-switcher'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import TestSecurityConnection from './test-connection'

export default function SecurityPage() {
  const [timeRange, setTimeRange] = useState('24h')
  const [activeTab, setActiveTab] = useState('overview')
  const { tenant } = useCurrentTenant()
  
  const { 
    events, 
    metrics, 
    incidents, 
    alerts, 
    compliance,
    constructionAccess,
    isLoading, 
    error 
  } = useSecurityData(tenant?.id, timeRange)
  
  const { data: aiPredictions } = useAIThreatPredictions(tenant?.id)
  const { data: vulnerabilityScans } = useVulnerabilityScans(tenant?.id)
  const { data: zeroTrustLogs } = useZeroTrustAccess(tenant?.id)
  const { data: behavioralData } = useBehavioralAnalytics(tenant?.id)
  const { data: supplyChainData, isLoading: scLoading } = useSupplyChainSecurity(tenant?.id)
  const { data: mobileDevices, isLoading: mobileLoading } = useMobileDeviceSecurity(tenant?.id)
  const { data: quantumStatus, isLoading: quantumLoading } = useQuantumEncryptionStatus(tenant?.id)

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'secure': return 'text-green-600 bg-green-50'
      case 'warning': return 'text-yellow-600 bg-yellow-50'
      case 'compromised': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getThreatLevelColor = (score: number) => {
    if (score > 75) return 'text-red-600'
    if (score > 50) return 'text-orange-600'
    if (score > 25) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        {/* Database Connection Test */}
        <div className="mb-6">
          <TestSecurityConnection />
        </div>
        
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-red-100 to-orange-100 rounded-lg">
                  <Shield className="h-6 w-6 text-red-600" />
                </div>
                Security Center
              </h1>
              <p className="text-gray-600 mt-2">Comprehensive security monitoring, threat protection, and AI-powered defense</p>
            </div>
            
            <div className="flex gap-3">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[150px] bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300 hover:border-red-400 transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Security Overview Cards */}
          <div className="mb-6">
            <div className="p-[2px] rounded-xl bg-gradient-to-br from-red-400 via-orange-400 to-yellow-400 hover:shadow-2xl transition-all duration-300">
              <div className="p-6 bg-white/95 backdrop-blur-sm rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center border-4",
                      getThreatLevelColor(metrics?.riskScore || 0) === 'text-green-600' ? 'bg-green-50 border-green-200' :
                      getThreatLevelColor(metrics?.riskScore || 0) === 'text-yellow-600' ? 'bg-yellow-50 border-yellow-200' :
                      getThreatLevelColor(metrics?.riskScore || 0) === 'text-orange-600' ? 'bg-orange-50 border-orange-200' :
                      'bg-red-50 border-red-200'
                    )}>
                      <span className={cn("font-bold text-xl", getThreatLevelColor(metrics?.riskScore || 0))}>{metrics?.riskScore || 0}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">System Threat Level</h3>
                      <p className="text-gray-600">
                        {metrics?.riskScore ? (
                          metrics.riskScore > 75 ? 'Critical - Immediate Action Required' :
                          metrics.riskScore > 50 ? 'High - Active Threats Detected' :
                          metrics.riskScore > 25 ? 'Medium - Monitoring Required' :
                          'Low - System Secure'
                        ) : 'Calculating...'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {aiPredictions && aiPredictions.length > 0 && (
                      <Badge variant="outline" className="px-3 py-1">
                        <Bot className="h-4 w-4 mr-1" />
                        AI Active
                      </Badge>
                    )}
                    <Badge variant="outline" className="px-3 py-1 text-green-600 border-green-200">
                      <ShieldCheck className="h-4 w-4 mr-1" />
                      Protected
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-red-200 to-red-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
              <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <Badge variant={metrics?.threatEventsChange && metrics.threatEventsChange > 0 ? "destructive" : "secondary"}>
                      {metrics?.threatEventsChange ? `${metrics.threatEventsChange > 0 ? '+' : ''}${metrics.threatEventsChange.toFixed(1)}%` : '0%'}
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{metrics?.threatEventsTotal || 0}</p>
                  <p className="text-sm text-gray-600">Threat Events</p>
                </CardContent>
              </Card>
            </div>

            <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-orange-200 to-orange-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
              <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <ShieldOff className="h-5 w-5 text-orange-600" />
                    </div>
                    <Badge variant={metrics?.blockedRequestsChange && metrics.blockedRequestsChange > 0 ? "destructive" : "secondary"}>
                      {metrics?.blockedRequestsChange ? `${metrics.blockedRequestsChange > 0 ? '+' : ''}${metrics.blockedRequestsChange.toFixed(1)}%` : '0%'}
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{metrics?.blockedRequestsTotal || 0}</p>
                  <p className="text-sm text-gray-600">Blocked Attacks</p>
                </CardContent>
              </Card>
            </div>

            <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
              <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Brain className="h-5 w-5 text-purple-600" />
                    </div>
                    <Badge variant="outline">
                      AI
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{aiPredictions?.length || 0}</p>
                  <p className="text-sm text-gray-600">AI Predictions</p>
                </CardContent>
              </Card>
            </div>

            <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-green-200 to-green-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
              <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <ShieldCheck className="h-5 w-5 text-green-600" />
                    </div>
                    <Badge variant="outline" className="text-green-600">
                      {metrics?.complianceScore || 0}%
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{compliance?.length || 0}</p>
                  <p className="text-sm text-gray-600">Compliance Status</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Placeholder for tabs - will add next */}
        <div>Tabs content will go here</div>
      </div>
    </div>
  )
}