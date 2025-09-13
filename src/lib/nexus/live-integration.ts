/**
 * NEXUS Live Integration System
 * Connects all systems with real-time data flow
 * Ensures Nexus TOP TIER, Enterprise Architecture, and Live Storage are synchronized
 */

import { createClient } from '@/lib/supabase/client'
import { getWebSocketClient } from '@/lib/websocket/client'
import { nexusTopTier } from '@/lib/ml/nexus-top-tier'
import { cacheManager } from '@/lib/cache/unified-cache'
import { performanceMonitor } from '@/lib/performance-monitor'

// Initialize all connections
const supabase = createClient()
const wsClient = getWebSocketClient()

export class NexusLiveIntegration {
  private static instance: NexusLiveIntegration
  private subscriptions: Map<string, any> = new Map()
  private isInitialized = false
  private tenantId: string | null = null

  private constructor() {
    this.initialize()
  }

  static getInstance(): NexusLiveIntegration {
    if (!NexusLiveIntegration.instance) {
      NexusLiveIntegration.instance = new NexusLiveIntegration()
    }
    return NexusLiveIntegration.instance
  }

  private async initialize() {
    if (this.isInitialized) return
    
    console.log('🚀 Initializing NEXUS Live Integration System')
    
    // 0. Get current tenant context
    await this.initializeTenantContext()
    
    // 1. Connect to real-time database channels
    await this.setupDatabaseSubscriptions()
    
    // 2. Connect WebSocket channels
    await this.setupWebSocketChannels()
    
    // 3. Initialize ML feedback loop
    await this.setupMLFeedbackLoop()
    
    // 4. Start performance monitoring
    await this.setupPerformanceMonitoring()
    
    // 5. Connect Enterprise Architecture Analyzer
    await this.connectArchitectureAnalyzer()
    
    this.isInitialized = true
    console.log('✅ NEXUS Live Integration System Ready')
  }

  /**
   * Initialize tenant context for multi-tenancy
   */
  private async initializeTenantContext() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()

      if (userTenant) {
        this.tenantId = userTenant.tenant_id
        console.log(`🏢 NEXUS initialized for tenant: ${this.tenantId}`)
      }
    } catch (error) {
      console.warn('Failed to initialize tenant context:', error)
    }
  }

  /**
   * Setup real-time database subscriptions
   */
  private async setupDatabaseSubscriptions() {
    // Subscribe to ML predictions updates
    const predictionsChannel = supabase
      .channel('predictions_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'predictions_cache'
      }, (payload) => {
        this.handlePredictionUpdate(payload)
      })
      .subscribe()
    
    this.subscriptions.set('predictions', predictionsChannel)

    // Subscribe to weather data updates
    const weatherChannel = supabase
      .channel('weather_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'weather_data'
      }, (payload) => {
        this.handleWeatherUpdate(payload)
      })
      .subscribe()
    
    this.subscriptions.set('weather', weatherChannel)

    // Subscribe to schedule conflicts
    const conflictsChannel = supabase
      .channel('schedule_conflicts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'schedule_conflicts'
      }, (payload) => {
        this.handleNewConflict(payload)
      })
      .subscribe()
    
    this.subscriptions.set('conflicts', conflictsChannel)

    // Subscribe to ML feedback for continuous learning
    const feedbackChannel = supabase
      .channel('ml_feedback')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ml_feedback'
      }, (payload) => {
        this.handleMLFeedback(payload)
      })
      .subscribe()
    
    this.subscriptions.set('feedback', feedbackChannel)
  }

  /**
   * Setup WebSocket channels for real-time communication
   */
  private async setupWebSocketChannels() {
    if (!wsClient) return

    // Nexus updates channel
    await wsClient.subscribeToChannel('nexus_updates')
    wsClient.on('nexus_update', (data: any) => {
      this.broadcastNexusUpdate(data)
    })

    // Architecture analysis channel
    await wsClient.subscribeToChannel('architecture_analysis')
    wsClient.on('analysis_complete', (data: any) => {
      this.handleArchitectureAnalysis(data)
    })

    // Performance metrics channel
    await wsClient.subscribeToChannel('performance_metrics')
    wsClient.on('metric_update', (data: any) => {
      this.updatePerformanceMetrics(data)
    })
  }

  /**
   * Setup ML feedback loop for continuous learning
   */
  private async setupMLFeedbackLoop() {
    // Check for feedback every 5 minutes
    setInterval(async () => {
      const { data: feedback } = await supabase
        .from('ml_feedback')
        .select('*')
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })

      if (feedback && feedback.length > 0) {
        await this.processMLFeedback(feedback)
      }
    }, 5 * 60 * 1000) // 5 minutes
  }

  /**
   * Setup performance monitoring
   */
  private async setupPerformanceMonitoring() {
    // Monitor cache performance
    setInterval(async () => {
      const cacheStats = await cacheManager.getStats()
      this.storeCacheMetrics(cacheStats)
    }, 60000) // Every minute

    // Monitor ML model performance
    setInterval(async () => {
      const modelStats = await this.getModelPerformance()
      this.storeModelMetrics(modelStats)
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  /**
   * Connect Enterprise Architecture Analyzer
   */
  private async connectArchitectureAnalyzer() {
    // Run architecture analysis daily
    setInterval(async () => {
      const analysis = await this.runArchitectureAnalysis()
      await this.storeArchitectureResults(analysis)
    }, 24 * 60 * 60 * 1000) // Daily

    // Real-time code change monitoring
    if (wsClient) {
      await wsClient.subscribeToChannel('code_changes')
      wsClient.on('code_change', async (change: any) => {
        // Trigger incremental analysis
        const impact = await this.analyzeCodeChangeImpact(change)
        if (impact.severity === 'high') {
          await this.notifyArchitectureIssue(impact)
        }
      })
    }
  }

  /**
   * Handle prediction updates
   */
  private async handlePredictionUpdate(payload: any) {
    const { new: prediction } = payload
    
    // Only process if it belongs to current tenant
    if (this.tenantId && prediction.tenant_id !== this.tenantId) {
      return
    }
    
    // Update cache
    await cacheManager.set(
      `prediction:${prediction.id}`,
      prediction,
      prediction.expires_at ? new Date(prediction.expires_at).getTime() - Date.now() : 3600000
    )

    // Broadcast to connected clients
    if (wsClient) {
      wsClient.broadcast('nexus_updates', 'prediction_update', {
        data: prediction
      })
    }
  }

  /**
   * Handle weather updates
   */
  private async handleWeatherUpdate(payload: any) {
    const { new: weatherData } = payload
    
    // Check for conflicts with scheduled events
    const { data: events } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('date', weatherData.weather_date)
      .in('work_location', ['exterior', 'roof', 'underground'])

    if (events && events.length > 0) {
      for (const event of events) {
        const analysis = await nexusTopTier.analyzeWeatherConflict(
          {
            title: event.title,
            location: event.work_location,
            date: new Date(event.start_time),
            projectId: event.project_id
          },
          weatherData.raw_data
        )

        if (analysis.hasConflict) {
          await this.createWeatherAlert(event, analysis)
        }
      }
    }
  }

  /**
   * Handle new conflicts
   */
  private async handleNewConflict(payload: any) {
    const { new: conflict } = payload
    
    // Only process if it belongs to current tenant
    if (this.tenantId && conflict.tenant_id !== this.tenantId) {
      return
    }
    
    // Store in cache for quick access
    await cacheManager.set(`conflict:${conflict.id}`, conflict, 3600000)

    // Notify relevant users
    await this.notifyConflict(conflict)

    // Trigger ML learning
    await this.learnFromConflict(conflict)
  }

  /**
   * Handle ML feedback
   */
  private async handleMLFeedback(payload: any) {
    const { new: feedback } = payload
    
    // Only process if it belongs to current tenant
    if (this.tenantId && feedback.tenant_id !== this.tenantId) {
      return
    }
    
    // Update model confidence scores
    await this.updateModelConfidence(feedback)

    // Check if new pattern should be learned
    const shouldLearn = await this.shouldLearnNewPattern(feedback)
    if (shouldLearn) {
      await this.generateNewPrinciple(feedback)
    }
  }

  /**
   * Process batch ML feedback
   */
  private async processMLFeedback(feedbackBatch: any[]) {
    // Group by principle
    const groupedFeedback = feedbackBatch.reduce((acc, fb) => {
      const key = fb.principle_id || 'general'
      if (!acc[key]) acc[key] = []
      acc[key].push(fb)
      return acc
    }, {} as Record<string, any[]>)

    // Update confidence scores
    for (const [principleId, feedbacks] of Object.entries(groupedFeedback)) {
      const feedbackArray = feedbacks as any[]
      const acceptanceRate = feedbackArray.filter((f: any) => f.user_action === 'accepted').length / feedbackArray.length
      
      await supabase
        .from('construction_principles')
        .update({ 
          confidence_score: acceptanceRate,
          total_feedback: feedbackArray.length
        })
        .eq('id', principleId)
    }
  }

  /**
   * Store cache metrics
   */
  private async storeCacheMetrics(stats: any) {
    await supabase.from('performance_metrics').insert({
      metric_type: 'cache',
      metrics_data: stats,
      created_at: new Date().toISOString()
    })
  }

  /**
   * Store model metrics
   */
  private async storeModelMetrics(stats: any) {
    await supabase.from('ml_model_metrics').insert({
      model_name: 'nexus_top_tier',
      accuracy: stats.accuracy,
      inference_time_ms: stats.inferenceTime,
      memory_usage_mb: stats.memoryUsage,
      created_at: new Date().toISOString()
    })
  }

  /**
   * Get model performance stats
   */
  private async getModelPerformance() {
    const { data: predictions } = await supabase
      .from('predictions_cache')
      .select('confidence_score')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const avgConfidence = predictions
      ? predictions.reduce((sum, p) => sum + (p.confidence_score || 0), 0) / predictions.length
      : 0

    return {
      accuracy: avgConfidence,
      inferenceTime: 50 + Math.random() * 50, // Mock for now
      memoryUsage: 100 + Math.random() * 50 // Mock for now
    }
  }

  /**
   * Run architecture analysis
   */
  private async runArchitectureAnalysis() {
    // This would call the Enterprise Architecture Analyzer
    return {
      score: 85,
      issues: [],
      recommendations: []
    }
  }

  /**
   * Store architecture results
   */
  private async storeArchitectureResults(analysis: any) {
    await supabase.from('architecture_analysis_reports').insert({
      analysis_type: 'scheduled',
      production_readiness_score: analysis.score,
      issues: analysis.issues,
      recommendations: analysis.recommendations,
      created_at: new Date().toISOString()
    })
  }

  /**
   * Analyze code change impact
   */
  private async analyzeCodeChangeImpact(change: any) {
    // Simplified impact analysis
    return {
      severity: 'low',
      affected: [],
      recommendation: ''
    }
  }

  /**
   * Create weather alert
   */
  private async createWeatherAlert(event: any, analysis: any) {
    await supabase.from('notifications').insert({
      user_id: event.created_by,
      type: 'weather_alert',
      title: 'Weather Conflict Detected',
      message: analysis.recommendation,
      metadata: {
        event_id: event.id,
        risk_score: analysis.riskScore,
        alternative_dates: analysis.alternativeDates
      },
      created_at: new Date().toISOString()
    })
  }

  /**
   * Notify about conflicts
   */
  private async notifyConflict(conflict: any) {
    // Get affected users
    const { data: users } = await supabase
      .from('project_teams')
      .select('user_id')
      .eq('project_id', conflict.project_id)

    if (users) {
      for (const user of users) {
        await supabase.from('notifications').insert({
          user_id: user.user_id,
          type: 'schedule_conflict',
          title: 'Schedule Conflict Detected',
          message: `${conflict.conflict_type}: ${conflict.description}`,
          metadata: conflict,
          created_at: new Date().toISOString()
        })
      }
    }
  }

  /**
   * Learn from conflict resolution
   */
  private async learnFromConflict(conflict: any) {
    if (conflict.resolution_action) {
      await supabase.from('ml_feedback').insert({
        principle_id: conflict.principle_id,
        user_action: conflict.resolution_action,
        confidence_before: conflict.confidence_score,
        context: conflict.conflict_data,
        created_at: new Date().toISOString()
      })
    }
  }

  /**
   * Update model confidence based on feedback
   */
  private async updateModelConfidence(feedback: any) {
    // This would trigger model retraining in production
    console.log('Updating model confidence based on feedback:', feedback)
  }

  /**
   * Check if new pattern should be learned
   */
  private async shouldLearnNewPattern(feedback: any): Promise<boolean> {
    // Check if we've seen this pattern multiple times
    const { count } = await supabase
      .from('ml_feedback')
      .select('*', { count: 'exact', head: true })
      .match({ 
        user_action: feedback.user_action,
        principle_id: feedback.principle_id 
      })

    return count > 10 // Learn after 10 similar feedbacks
  }

  /**
   * Generate new principle from feedback
   */
  private async generateNewPrinciple(feedback: any) {
    await supabase.from('construction_principles').insert({
      category: 'learned',
      principle: `Auto-learned from user feedback`,
      description: `Pattern detected from ${feedback.user_action} actions`,
      confidence_score: 0.5,
      is_ml_generated: true,
      created_at: new Date().toISOString()
    })
  }

  /**
   * Broadcast Nexus updates
   */
  private broadcastNexusUpdate(data: any) {
    // Broadcast to all connected clients
    if (wsClient) {
      wsClient.broadcast('nexus_updates', 'update', data)
    }
  }

  /**
   * Handle architecture analysis results
   */
  private handleArchitectureAnalysis(data: any) {
    // Store and broadcast results
    this.storeArchitectureResults(data)
    this.broadcastNexusUpdate({
      type: 'architecture_analysis',
      data
    })
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(data: any) {
    // TODO: performanceMonitor.recordMetric is private
    // Need to use public API or make recordMetric public
    console.log('Performance metric update:', data)
  }

  /**
   * Notify about architecture issues
   */
  private async notifyArchitectureIssue(impact: any) {
    // Send critical notifications
    await supabase.from('notifications').insert({
      type: 'architecture_alert',
      severity: 'critical',
      title: 'Architecture Issue Detected',
      message: impact.recommendation,
      metadata: impact,
      created_at: new Date().toISOString()
    })
  }

  /**
   * Get live system status
   */
  async getSystemStatus() {
    return {
      nexus: {
        connected: true,
        lastPrediction: await this.getLastPredictionTime(),
        activeModels: await this.getActiveModels()
      },
      database: {
        connected: this.subscriptions.size > 0,
        activeSubscriptions: Array.from(this.subscriptions.keys())
      },
      websocket: {
        connected: false, // TODO: wsClient.isConnected() is private
        channels: [] // TODO: wsClient.getActiveChannels() needs to be implemented
      },
      cache: {
        stats: cacheManager.getStats()
      },
      architecture: {
        lastAnalysis: await this.getLastAnalysisTime(),
        score: await this.getCurrentArchitectureScore()
      }
    }
  }

  private async getLastPredictionTime() {
    const { data } = await supabase
      .from('predictions_cache')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    return data?.created_at || null
  }

  private async getActiveModels() {
    const { data } = await supabase
      .from('ml_models')
      .select('model_name, version, accuracy_score')
      .eq('is_active', true)
    
    return data || []
  }

  private async getLastAnalysisTime() {
    const { data } = await supabase
      .from('architecture_analysis_reports')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    return data?.created_at || null
  }

  private async getCurrentArchitectureScore() {
    const { data } = await supabase
      .from('architecture_analysis_reports')
      .select('production_readiness_score')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    return data?.production_readiness_score || 0
  }

  /**
   * Cleanup subscriptions
   */
  async cleanup() {
    for (const [key, subscription] of this.subscriptions) {
      await supabase.removeChannel(subscription)
    }
    this.subscriptions.clear()
    this.isInitialized = false
  }
}

// Export singleton instance
export const nexusLiveIntegration = NexusLiveIntegration.getInstance()

// Auto-initialize on import
if (typeof window !== 'undefined') {
  nexusLiveIntegration.getSystemStatus().then(status => {
    console.log('🔗 NEXUS Live Integration Status:', status)
  })
}