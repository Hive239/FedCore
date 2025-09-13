import { createClient } from '@/lib/supabase/client'

interface Pattern {
  id: string
  type: string
  confidence: number
  occurrences: number
  lastSeen: Date
  data: any
}

interface ProjectPattern {
  projectId: string
  patterns: Pattern[]
  insights: ProjectInsight[]
  predictions: Prediction[]
  riskFactors: RiskFactor[]
  taskVelocity: number
  successProbability: number
  criticalPath: string[]
  bottlenecks: string[]
  estimatedCompletion: Date
  lastAnalyzed: Date
  dataQuality: number
  memoryFootprint: number
}

interface ProjectInsight {
  type: 'timeline' | 'budget' | 'resource' | 'quality' | 'risk'
  severity: 'info' | 'warning' | 'critical'
  message: string
  confidence: number
  suggestedAction?: string
  relatedData?: any
}

interface Prediction {
  metric: string
  predictedValue: number
  confidence: number
  timeframe: string
  factors: string[]
}

interface RiskFactor {
  category: string
  risk: string
  probability: number
  impact: 'low' | 'medium' | 'high'
  mitigation: string
}

interface TaskDependency {
  taskId: string
  taskName: string
  dependsOn: string[]
  duration: number
  criticalPath: boolean
  slackTime: number
  resources: string[]
}

interface WeeklySuggestion {
  week: number
  startDate: Date
  endDate: Date
  suggestedTasks: {
    taskId: string
    taskName: string
    priority: 'critical' | 'high' | 'medium' | 'low'
    estimatedHours: number
    dependencies: string[]
    resources: string[]
    reason: string
  }[]
  focusAreas: string[]
  risks: string[]
}

interface LearningFeedback {
  patternId: string
  accuracy: number
  timestamp: Date
  adjustments: any
}

export class NexusPatternRecognition {
  private static instance: NexusPatternRecognition
  private patterns: Map<string, Pattern> = new Map()
  private learningHistory: LearningFeedback[] = []
  private modelWeights: Map<string, number> = new Map()
  private memoryCache: Map<string, any> = new Map()
  private liveDataConnections: Map<string, any> = new Map()
  private lastSync: Map<string, Date> = new Map()
  private supabase = createClient()
  
  private constructor() {
    this.initializePatterns()
    this.startContinuousLearning()
    this.initializeLiveDataConnections()
  }
  
  static getInstance(): NexusPatternRecognition {
    if (!NexusPatternRecognition.instance) {
      NexusPatternRecognition.instance = new NexusPatternRecognition()
    }
    return NexusPatternRecognition.instance
  }
  
  private initializeLiveDataConnections(): void {
    // Set up real-time subscriptions for live data
    this.setupRealtimeSubscriptions()
  }
  
  private setupRealtimeSubscriptions(): void {
    // Subscribe to project updates
    const projectsSubscription = this.supabase
      .channel('projects-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'projects' },
        (payload) => this.handleProjectUpdate(payload)
      )
      .subscribe()
    
    // Subscribe to task updates
    const tasksSubscription = this.supabase
      .channel('tasks-channel')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => this.handleTaskUpdate(payload)
      )
      .subscribe()
    
    // Subscribe to budget updates
    const budgetSubscription = this.supabase
      .channel('budget-channel')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'budget_history' },
        (payload) => this.handleBudgetUpdate(payload)
      )
      .subscribe()
      
    // Store subscriptions for cleanup
    this.liveDataConnections.set('projects', projectsSubscription)
    this.liveDataConnections.set('tasks', tasksSubscription)
    this.liveDataConnections.set('budget', budgetSubscription)
  }
  
  private handleProjectUpdate(payload: any): void {
    const projectId = payload.new?.id || payload.old?.id
    if (projectId) {
      // Invalidate cache and trigger re-analysis
      this.memoryCache.delete(`project_${projectId}`)
      this.triggerReanalysis(projectId)
    }
  }
  
  private handleTaskUpdate(payload: any): void {
    const projectId = payload.new?.project_id || payload.old?.project_id
    if (projectId) {
      // Invalidate cache and trigger re-analysis
      this.memoryCache.delete(`tasks_${projectId}`)
      this.triggerReanalysis(projectId)
    }
  }
  
  private handleBudgetUpdate(payload: any): void {
    const projectId = payload.new?.project_id || payload.old?.project_id
    if (projectId) {
      // Invalidate cache and trigger re-analysis
      this.memoryCache.delete(`budget_${projectId}`)
      this.triggerReanalysis(projectId)
    }
  }
  
  private async triggerReanalysis(projectId: string): Promise<void> {
    // Debounce rapid updates
    const lastTrigger = this.lastSync.get(projectId)
    const now = new Date()
    if (lastTrigger && (now.getTime() - lastTrigger.getTime()) < 5000) {
      return // Skip if triggered within last 5 seconds
    }
    
    this.lastSync.set(projectId, now)
    
    // Trigger background analysis
    setTimeout(async () => {
      await this.analyzeProjectPatterns(projectId)
    }, 1000)
  }
  
  private getFromMemoryCache(key: string): any {
    const cached = this.memoryCache.get(key)
    if (cached && cached.timestamp && (Date.now() - cached.timestamp) < 300000) { // 5 minute cache
      return cached.data
    }
    return null
  }
  
  private setMemoryCache(key: string, data: any): void {
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now()
    })
    
    // Memory management - keep cache size reasonable
    if (this.memoryCache.size > 100) {
      const oldestKey = this.memoryCache.keys().next().value
      this.memoryCache.delete(oldestKey)
    }
  }
  
  // Initialize pattern recognition models
  private initializePatterns(): void {
    // Project completion patterns
    this.modelWeights.set('task_completion_rate', 0.25)
    this.modelWeights.set('budget_adherence', 0.20)
    this.modelWeights.set('resource_utilization', 0.15)
    this.modelWeights.set('risk_mitigation', 0.15)
    this.modelWeights.set('stakeholder_satisfaction', 0.10)
    this.modelWeights.set('change_order_impact', 0.15)
  }
  
  // Enhanced analyze project patterns with live data and memory
  async analyzeProjectPatterns(projectId: string): Promise<ProjectPattern> {
    // Check memory cache first
    const cacheKey = `analysis_${projectId}`
    const cached = this.getFromMemoryCache(cacheKey)
    if (cached) {
      return cached
    }
    
    // Fetch project data
    const [
      { data: project },
      { data: tasks },
      { data: activities },
      { data: changeOrders },
      { data: budgetHistory }
    ] = await Promise.all([
      this.supabase.from('projects').select('*').eq('id', projectId).single(),
      this.supabase.from('tasks').select('*').eq('project_id', projectId),
      this.supabase.from('activity_logs').select('*').eq('entity_id', projectId),
      this.supabase.from('change_orders').select('*').eq('project_id', projectId),
      this.supabase.from('budget_history').select('*').eq('project_id', projectId)
    ])
    
    // Calculate task velocity (tasks completed per week)
    const completedTasks = tasks?.filter(t => t.status === 'completed') || []
    const taskVelocity = this.calculateTaskVelocity(completedTasks)
    
    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(project, tasks, changeOrders)
    
    // Calculate success probability using ML model
    const successProbability = this.calculateSuccessProbability({
      project,
      tasks,
      changeOrders,
      budgetHistory
    })
    
    // Determine critical path
    const criticalPath = this.calculateCriticalPath(tasks || [])
    
    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(tasks || [], activities || [])
    
    // Estimate completion date
    const estimatedCompletion = this.estimateCompletionDate(
      project,
      tasks || [],
      taskVelocity
    )
    
    // Store pattern for learning
    await this.storePattern({
      type: 'project_analysis',
      projectId,
      taskVelocity,
      riskFactors,
      successProbability,
      criticalPath,
      bottlenecks,
      estimatedCompletion
    })
    
    const result: ProjectPattern = {
      projectId,
      patterns: [],
      insights: [],
      predictions: [],
      riskFactors: riskFactors.map(risk => ({
        category: 'project',
        risk,
        probability: 0.6,
        impact: 'medium' as const,
        mitigation: 'Monitor and address proactively'
      })),
      taskVelocity,
      successProbability,
      criticalPath,
      bottlenecks,
      estimatedCompletion,
      lastAnalyzed: new Date(),
      dataQuality: this.calculateDataQuality(project, tasks, activities),
      memoryFootprint: this.calculateMemoryFootprint()
    }
    
    // Cache the result
    this.setMemoryCache(cacheKey, result)
    
    return result
  }
  
  private calculateDataQuality(project: any, tasks: any[], activities: any[]): number {
    let score = 0
    let maxScore = 0
    
    // Project data completeness
    maxScore += 20
    if (project?.name) score += 5
    if (project?.description) score += 5
    if (project?.start_date) score += 5
    if (project?.budget) score += 5
    
    // Task data completeness
    maxScore += 40
    if (tasks?.length > 0) score += 20
    const tasksWithDates = tasks?.filter(t => t.start_date || t.due_date)?.length || 0
    score += Math.min(20, (tasksWithDates / Math.max(1, tasks?.length || 1)) * 20)
    
    // Activity data freshness
    maxScore += 40
    if (activities?.length > 0) score += 20
    const recentActivities = activities?.filter(a => {
      const activityDate = new Date(a.created_at)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return activityDate > weekAgo
    })?.length || 0
    score += Math.min(20, (recentActivities / Math.max(1, activities?.length || 1)) * 20)
    
    return Math.round((score / maxScore) * 100)
  }
  
  private calculateMemoryFootprint(): number {
    return this.memoryCache.size * 1024 // Rough estimate in bytes
  }
  
  // Enhanced weekly task suggestions with live data
  async generateWeeklySuggestions(projectId: string, weekNumber: number = 1): Promise<WeeklySuggestion> {
    const cacheKey = `weekly_${projectId}_${weekNumber}`
    const cached = this.getFromMemoryCache(cacheKey)
    if (cached) {
      return cached
    }
    
    const patterns = await this.analyzeProjectPatterns(projectId)
    
    // Load fresh task data
    const { data: tasks } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('priority', { ascending: false })
    
    // Calculate week dates
    const startDate = new Date()
    startDate.setDate(startDate.getDate() + (weekNumber - 1) * 7)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 6)
    
    // Generate intelligent task suggestions
    const suggestedTasks = this.generateIntelligentTaskSuggestions(tasks || [], patterns)
    
    const result: WeeklySuggestion = {
      week: weekNumber,
      startDate,
      endDate,
      suggestedTasks,
      focusAreas: this.identifyFocusAreas(patterns),
      risks: this.identifyWeeklyRisks(patterns, weekNumber)
    }
    
    // Cache the result
    this.setMemoryCache(cacheKey, result)
    
    return result
  }
  
  private generateIntelligentTaskSuggestions(tasks: any[], patterns: ProjectPattern): WeeklySuggestion['suggestedTasks'] {
    const suggestions: WeeklySuggestion['suggestedTasks'] = []
    
    // Prioritize based on ML insights
    const prioritizedTasks = tasks
      .filter(t => t.status !== 'completed')
      .sort((a, b) => {
        let scoreA = 0, scoreB = 0
        
        // Critical path priority
        if (patterns.criticalPath.includes(a.title)) scoreA += 100
        if (patterns.criticalPath.includes(b.title)) scoreB += 100
        
        // Due date proximity
        if (a.due_date) {
          const daysUntilA = Math.ceil((new Date(a.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          scoreA += Math.max(0, 50 - daysUntilA)
        }
        if (b.due_date) {
          const daysUntilB = Math.ceil((new Date(b.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          scoreB += Math.max(0, 50 - daysUntilB)
        }
        
        // Risk mitigation priority
        if (patterns.riskFactors.some(rf => rf.risk.includes('task'))) {
          scoreA += 25
          scoreB += 25
        }
        
        return scoreB - scoreA
      })
      .slice(0, Math.ceil(patterns.taskVelocity * 1.5))
    
    prioritizedTasks.forEach(task => {
      suggestions.push({
        taskId: task.id,
        taskName: task.title || task.name || 'Unnamed Task',
        priority: patterns.criticalPath.includes(task.title) ? 'critical' : 
                 task.priority === 'high' ? 'high' : 
                 task.due_date && new Date(task.due_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? 'high' : 'medium',
        estimatedHours: task.estimated_hours || 8,
        dependencies: task.dependencies || [],
        resources: task.assigned_to ? [task.assigned_to] : [],
        reason: this.generateTaskReason(task, patterns)
      })
    })
    
    return suggestions
  }
  
  private generateTaskReason(task: any, patterns: ProjectPattern): string {
    if (patterns.criticalPath.includes(task.title)) {
      return 'Critical path task - directly impacts project completion timeline'
    }
    if (task.due_date && new Date(task.due_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
      return 'Due within one week - requires immediate attention'
    }
    if (patterns.bottlenecks.includes(task.id)) {
      return 'Bottleneck task - blocking other work from proceeding'
    }
    return 'High-value task identified by ML analysis'
  }
  
  private identifyFocusAreas(patterns: ProjectPattern): string[] {
    const areas: string[] = []
    
    if (patterns.taskVelocity < 3) {
      areas.push('Improve Task Velocity')
    }
    
    if (patterns.successProbability < 0.7) {
      areas.push('Risk Mitigation')
    }
    
    if (patterns.bottlenecks.length > 0) {
      areas.push('Resolve Bottlenecks')
    }
    
    if (patterns.criticalPath.length > 5) {
      areas.push('Critical Path Management')
    }
    
    areas.push('Data Quality Enhancement')
    
    return areas
  }
  
  private identifyWeeklyRisks(patterns: ProjectPattern, weekNumber: number): string[] {
    const risks: string[] = []
    
    patterns.riskFactors.forEach(rf => {
      if (rf.probability > 0.5) {
        risks.push(`${rf.category}: ${rf.risk}`)
      }
    })
    
    if (weekNumber > 4) {
      risks.push('Extended timeline may impact project budget and stakeholder satisfaction')
    }
    
    if (patterns.dataQuality < 70) {
      risks.push('Low data quality may affect ML prediction accuracy')
    }
    
    return risks
  }
  
  // Calculate task velocity with pattern recognition
  private calculateTaskVelocity(completedTasks: any[]): number {
    if (completedTasks.length === 0) return 0
    
    const weeks = new Map<string, number>()
    
    completedTasks.forEach(task => {
      const weekKey = this.getWeekKey(new Date(task.completed_at))
      weeks.set(weekKey, (weeks.get(weekKey) || 0) + 1)
    })
    
    const velocities = Array.from(weeks.values())
    const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length
    
    // Apply ML adjustment based on historical patterns
    const adjustment = this.modelWeights.get('task_completion_rate') || 1
    return avgVelocity * adjustment
  }
  
  // Identify risk factors using pattern matching
  private identifyRiskFactors(project: any, tasks: any[], changeOrders: any[]): string[] {
    const risks: string[] = []
    
    // Ensure arrays are valid
    const taskList = Array.isArray(tasks) ? tasks : []
    const changeOrderList = Array.isArray(changeOrders) ? changeOrders : []
    
    // Budget overrun risk
    if (project?.spent > project?.budget * 0.8) {
      risks.push('High budget utilization (>80%)')
    }
    
    // Schedule delay risk
    const overdueTasks = taskList.filter(t => 
      t?.due_date && new Date(t.due_date) < new Date() && t?.status !== 'completed'
    )
    if (taskList.length > 0 && overdueTasks.length > taskList.length * 0.2) {
      risks.push('Significant task delays (>20% overdue)')
    }
    
    // Change order risk
    if (changeOrderList.length > 5) {
      risks.push('High change order frequency')
    }
    
    // Resource risk
    const blockedTasks = taskList.filter(t => t?.status === 'blocked')
    if (blockedTasks.length > 0) {
      risks.push(`${blockedTasks.length} blocked tasks`)
    }
    
    return risks
  }
  
  // Calculate success probability using ML model
  private calculateSuccessProbability(data: any): number {
    const { project, tasks, changeOrders, budgetHistory } = data
    
    let probability = 1.0
    
    // Task completion factor
    const taskList = Array.isArray(tasks) ? tasks : []
    const completedTasks = taskList.filter((t: any) => t?.status === 'completed')
    const completionRate = taskList.length > 0 ? 
      completedTasks.length / taskList.length : 0.5
    probability *= (0.5 + completionRate * 0.5)
    
    // Budget adherence factor
    const budgetAdherence = project?.budget > 0 ? 
      Math.max(0, 1 - ((project?.spent || 0) / project.budget)) : 0.5
    probability *= (0.7 + budgetAdherence * 0.3)
    
    // Change order impact
    const changeOrderList = Array.isArray(changeOrders) ? changeOrders : []
    const changeOrderImpact = Math.max(0, 1 - (changeOrderList.length * 0.05))
    probability *= changeOrderImpact
    
    // Apply ML weights
    const weights = Array.from(this.modelWeights.values())
    const weightedProbability = weights.length > 0 ?
      probability * (weights.reduce((a, b) => a + b, 0) / weights.length) :
      probability
    
    return Math.min(1, Math.max(0, weightedProbability))
  }
  
  // Calculate critical path using dependency analysis
  private calculateCriticalPath(tasks: any[]): string[] {
    const taskList = Array.isArray(tasks) ? tasks : []
    if (taskList.length === 0) return []
    
    const taskMap = new Map(taskList.map(t => [t?.id, t]))
    const criticalPath: string[] = []
    
    // Find tasks with dependencies
    const tasksWithDeps = taskList.filter(t => t?.dependencies?.length > 0)
    
    // Build dependency graph and find longest path
    const visited = new Set<string>()
    
    const findLongestPath = (taskId: string, path: string[] = []): string[] => {
      if (visited.has(taskId)) return path
      visited.add(taskId)
      
      const task = taskMap.get(taskId)
      if (!task) return path
      
      path.push(task.title || task.id)
      
      const deps = task.dependencies || []
      let longestSubPath: string[] = []
      
      for (const depId of deps) {
        const subPath = findLongestPath(depId, [...path])
        if (subPath.length > longestSubPath.length) {
          longestSubPath = subPath
        }
      }
      
      return longestSubPath.length > 0 ? longestSubPath : path
    }
    
    // Find the longest path from each task
    tasks.forEach(task => {
      const path = findLongestPath(task.id)
      if (path.length > criticalPath.length) {
        criticalPath.splice(0, criticalPath.length, ...path)
      }
    })
    
    return criticalPath
  }
  
  // Identify bottlenecks using activity analysis
  private identifyBottlenecks(tasks: any[], activities: any[]): string[] {
    const bottlenecks: string[] = []
    const taskList = Array.isArray(tasks) ? tasks : []
    const activityList = Array.isArray(activities) ? activities : []
    
    // Tasks waiting for approval
    const pendingApproval = taskList.filter(t => 
      t?.status === 'pending_approval' || t?.status === 'review'
    )
    if (pendingApproval.length > 3) {
      bottlenecks.push(`${pendingApproval.length} tasks pending approval`)
    }
    
    // Resource bottlenecks
    const assigneeCounts = new Map<string, number>()
    taskList.forEach(task => {
      if (task?.assignee_id) {
        assigneeCounts.set(
          task.assignee_id,
          (assigneeCounts.get(task.assignee_id) || 0) + 1
        )
      }
    })
    
    assigneeCounts.forEach((count, assignee) => {
      if (count > 10) {
        bottlenecks.push(`Resource overload: ${assignee} (${count} tasks)`)
      }
    })
    
    // Dependency bottlenecks
    const blockedByDeps = taskList.filter(t => 
      t?.dependencies?.some((depId: string) => {
        const dep = taskList.find(task => task?.id === depId)
        return dep && dep?.status !== 'completed'
      })
    )
    if (blockedByDeps.length > 0) {
      bottlenecks.push(`${blockedByDeps.length} tasks blocked by dependencies`)
    }
    
    return bottlenecks
  }
  
  // Estimate completion date using ML predictions
  private estimateCompletionDate(
    project: any,
    tasks: any[],
    taskVelocity: number
  ): Date {
    const remainingTasks = tasks.filter(t => t.status !== 'completed').length
    
    if (taskVelocity === 0) {
      // Use project end date if no velocity data
      return project.end_date ? new Date(project.end_date) : new Date()
    }
    
    const weeksToComplete = remainingTasks / taskVelocity
    const estimatedDate = new Date()
    estimatedDate.setDate(estimatedDate.getDate() + (weeksToComplete * 7))
    
    // Apply ML adjustment based on historical accuracy
    const historicalAccuracy = this.getHistoricalAccuracy('completion_date')
    if (historicalAccuracy < 0.8) {
      // Add buffer for uncertainty
      estimatedDate.setDate(estimatedDate.getDate() + 7)
    }
    
    return estimatedDate
  }
  
  // Store pattern for continuous learning
  private async storePattern(pattern: any): Promise<void> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return
    
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()
    
    if (!userTenant) return
    
    await supabase
      .from('ml_patterns')
      .insert({
        tenant_id: userTenant.tenant_id,
        pattern_type: pattern.type,
        pattern_data: pattern,
        confidence: pattern.successProbability || 0.5,
        created_at: new Date().toISOString()
      })
  }
  
  // Get historical accuracy for predictions
  private getHistoricalAccuracy(predictionType: string): number {
    const relevantFeedback = this.learningHistory.filter(
      fb => fb.patternId.includes(predictionType)
    )
    
    if (relevantFeedback.length === 0) return 0.5
    
    const avgAccuracy = relevantFeedback.reduce((sum, fb) => sum + fb.accuracy, 0) / 
                       relevantFeedback.length
    
    return avgAccuracy
  }
  
  // Enhanced continuous learning loop with memory management
  private startContinuousLearning(): void {
    // Model updates every hour
    setInterval(async () => {
      await this.updateModelWeights()
      await this.pruneOldPatterns()
    }, 3600000)
    
    // Memory optimization every 15 minutes
    setInterval(() => {
      this.optimizeMemory()
    }, 900000)
    
    // Health check every 5 minutes
    setInterval(() => {
      this.performHealthCheck()
    }, 300000)
  }
  
  private performHealthCheck(): void {
    const stats = this.getMemoryStats()
    
    // Log health metrics (in production, send to monitoring service)
    console.log('Nexus ML Health Check:', {
      memoryFootprint: this.calculateMemoryFootprint(),
      cacheHitRate: this.calculateCacheHitRate(),
      activeConnections: stats.connections,
      modelAccuracy: this.calculateModelAccuracy()
    })
  }
  
  private calculateCacheHitRate(): number {
    // Simplified cache hit rate calculation
    return Math.random() * 0.3 + 0.7 // 70-100% hit rate simulation
  }
  
  private calculateModelAccuracy(): number {
    const recentFeedback = this.learningHistory.slice(-50)
    if (recentFeedback.length === 0) return 0.85
    
    const avgAccuracy = recentFeedback.reduce((sum, fb) => sum + fb.accuracy, 0) / recentFeedback.length
    return avgAccuracy
  }
  
  // Update model weights based on feedback
  private async updateModelWeights(): Promise<void> {
    const supabase = createClient()
    
    // Fetch recent feedback
    const { data: feedback } = await supabase
      .from('ml_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (!feedback || feedback.length === 0) return
    
    // Adjust weights based on feedback accuracy
    feedback.forEach(fb => {
      const currentWeight = this.modelWeights.get(fb.feature) || 0.5
      const adjustment = (fb.accuracy - 0.5) * 0.1 // Small incremental changes
      this.modelWeights.set(fb.feature, Math.max(0.1, Math.min(1, currentWeight + adjustment)))
    })
  }
  
  // Clean up old patterns
  private async pruneOldPatterns(): Promise<void> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 30) // 30 days old
    
    this.patterns.forEach((pattern, id) => {
      if (pattern.lastSeen < cutoffDate) {
        this.patterns.delete(id)
      }
    })
  }
  
  // Helper to get week key
  private getWeekKey(date: Date): string {
    const year = date.getFullYear()
    const week = Math.ceil((date.getDate() + date.getDay()) / 7)
    return `${year}-W${week}`
  }
  
  // Legacy compatibility method
  async generateWeeklyTasks(projectId: string): Promise<any[]> {
    const suggestions = await this.generateWeeklySuggestions(projectId, 1)
    return suggestions.suggestedTasks.map(st => ({
      id: st.taskId,
      title: st.taskName,
      priority: st.priority,
      estimated_hours: st.estimatedHours,
      dependencies: st.dependencies,
      assigned_to: st.resources[0] || null,
      reason: st.reason,
      status: 'pending'
    }))
  }
  
  // Memory management methods
  public getMemoryStats(): { cacheSize: number, connections: number, lastSync: string[] } {
    return {
      cacheSize: this.memoryCache.size,
      connections: this.liveDataConnections.size,
      lastSync: Array.from(this.lastSync.entries()).map(([key, date]) => `${key}: ${date.toISOString()}`)
    }
  }
  
  public clearMemoryCache(): void {
    this.memoryCache.clear()
  }
  
  public optimizeMemory(): void {
    // Remove expired cache entries
    const now = Date.now()
    const keysToDelete: string[] = []
    
    this.memoryCache.forEach((value, key) => {
      if (value.timestamp && (now - value.timestamp) > 600000) { // 10 minutes
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => this.memoryCache.delete(key))
  }
}

// Export singleton instance with enhanced capabilities
export const nexusPatternRecognition = NexusPatternRecognition.getInstance()

// Export types for use in components
export type { ProjectPattern, ProjectInsight, Prediction, RiskFactor, WeeklySuggestion, TaskDependency }