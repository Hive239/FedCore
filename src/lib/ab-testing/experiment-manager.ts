/**
 * A/B Testing Framework
 * Enterprise-grade experimentation platform
 */

// UUID import removed - use crypto.randomUUID() instead

interface Experiment {
  id: string
  name: string
  description: string
  variants: Variant[]
  targeting: TargetingRule[]
  allocation: number // Percentage of traffic (0-100)
  status: 'draft' | 'running' | 'paused' | 'completed'
  startDate?: Date
  endDate?: Date
  metrics: Metric[]
}

interface Variant {
  id: string
  name: string
  weight: number // Relative weight for traffic distribution
  config: Record<string, any>
  isControl?: boolean
}

interface TargetingRule {
  type: 'user' | 'segment' | 'geo' | 'device' | 'custom'
  operator: 'equals' | 'contains' | 'regex' | 'in' | 'not_in'
  value: any
}

interface Metric {
  name: string
  type: 'conversion' | 'revenue' | 'engagement' | 'custom'
  goal: 'maximize' | 'minimize'
  primaryMetric?: boolean
}

interface UserContext {
  userId: string
  sessionId: string
  traits: Record<string, any>
  location?: {
    country?: string
    region?: string
    city?: string
  }
  device?: {
    type?: 'mobile' | 'tablet' | 'desktop'
    os?: string
    browser?: string
  }
}

interface ExperimentResult {
  experimentId: string
  variantId: string
  variantName: string
  config: Record<string, any>
}

/**
 * Main Experiment Manager
 */
export class ExperimentManager {
  private static instance: ExperimentManager
  private experiments: Map<string, Experiment> = new Map()
  private userAssignments: Map<string, Map<string, string>> = new Map()
  private eventQueue: ExperimentEvent[] = []

  static getInstance(): ExperimentManager {
    if (!ExperimentManager.instance) {
      ExperimentManager.instance = new ExperimentManager()
    }
    return ExperimentManager.instance
  }

  /**
   * Register an experiment
   */
  registerExperiment(experiment: Experiment): void {
    this.experiments.set(experiment.id, experiment)
    console.log(`[A/B] Registered experiment: ${experiment.name}`)
  }

  /**
   * Get variant for user
   */
  getVariant(experimentId: string, context: UserContext): ExperimentResult | null {
    const experiment = this.experiments.get(experimentId)
    
    if (!experiment || experiment.status !== 'running') {
      return null
    }

    // Check if user meets targeting criteria
    if (!this.evaluateTargeting(experiment.targeting, context)) {
      return null
    }

    // Check traffic allocation
    if (!this.isInAllocation(experiment.allocation, context.userId)) {
      return null
    }

    // Get or assign variant
    const variantId = this.getOrAssignVariant(experiment, context)
    const variant = experiment.variants.find(v => v.id === variantId)

    if (!variant) {
      return null
    }

    // Track exposure
    this.trackExposure(experiment.id, variantId, context)

    return {
      experimentId: experiment.id,
      variantId: variant.id,
      variantName: variant.name,
      config: variant.config
    }
  }

  /**
   * Track conversion event
   */
  trackConversion(
    experimentId: string, 
    metricName: string, 
    value: number = 1, 
    context: UserContext
  ): void {
    const assignment = this.getUserAssignment(experimentId, context.userId)
    
    if (!assignment) {
      return
    }

    this.queueEvent({
      type: 'conversion',
      experimentId,
      variantId: assignment,
      metricName,
      value,
      userId: context.userId,
      timestamp: new Date()
    })
  }

  /**
   * Evaluate targeting rules
   */
  private evaluateTargeting(rules: TargetingRule[], context: UserContext): boolean {
    if (rules.length === 0) {
      return true
    }

    return rules.every(rule => {
      switch (rule.type) {
        case 'user':
          return this.evaluateUserRule(rule, context.userId)
        case 'segment':
          return this.evaluateSegmentRule(rule, context.traits)
        case 'geo':
          return this.evaluateGeoRule(rule, context.location)
        case 'device':
          return this.evaluateDeviceRule(rule, context.device)
        case 'custom':
          return this.evaluateCustomRule(rule, context)
        default:
          return false
      }
    })
  }

  private evaluateUserRule(rule: TargetingRule, userId: string): boolean {
    switch (rule.operator) {
      case 'equals':
        return userId === rule.value
      case 'in':
        return rule.value.includes(userId)
      case 'not_in':
        return !rule.value.includes(userId)
      default:
        return false
    }
  }

  private evaluateSegmentRule(rule: TargetingRule, traits: Record<string, any>): boolean {
    const segmentValue = traits[rule.type] || ''
    
    switch (rule.operator) {
      case 'equals':
        return segmentValue === rule.value
      case 'contains':
        return segmentValue.toString().includes(rule.value)
      case 'regex':
        return new RegExp(rule.value).test(segmentValue.toString())
      default:
        return false
    }
  }

  private evaluateGeoRule(rule: TargetingRule, location?: UserContext['location']): boolean {
    if (!location) return false
    
    const geoValue = location.country || location.region || location.city
    return geoValue === rule.value
  }

  private evaluateDeviceRule(rule: TargetingRule, device?: UserContext['device']): boolean {
    if (!device) return false
    
    const deviceValue = device.type || device.os || device.browser
    return deviceValue === rule.value
  }

  private evaluateCustomRule(rule: TargetingRule, context: UserContext): boolean {
    // Custom evaluation logic
    return true
  }

  /**
   * Check if user is in traffic allocation
   */
  private isInAllocation(allocation: number, userId: string): boolean {
    const hash = this.hashUserId(userId)
    const bucket = hash % 100
    return bucket < allocation
  }

  /**
   * Hash user ID for consistent bucketing
   */
  private hashUserId(userId: string): number {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Get or assign variant to user
   */
  private getOrAssignVariant(experiment: Experiment, context: UserContext): string {
    // Check existing assignment
    const existingAssignment = this.getUserAssignment(experiment.id, context.userId)
    if (existingAssignment) {
      return existingAssignment
    }

    // Assign new variant
    const variant = this.selectVariant(experiment.variants, context.userId)
    this.saveAssignment(experiment.id, context.userId, variant.id)
    
    return variant.id
  }

  /**
   * Select variant based on weights
   */
  private selectVariant(variants: Variant[], userId: string): Variant {
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0)
    const hash = this.hashUserId(userId)
    const random = (hash % totalWeight) + 1
    
    let cumulative = 0
    for (const variant of variants) {
      cumulative += variant.weight
      if (random <= cumulative) {
        return variant
      }
    }
    
    return variants[0] // Fallback to first variant
  }

  /**
   * Get user's existing assignment
   */
  private getUserAssignment(experimentId: string, userId: string): string | null {
    const userAssignments = this.userAssignments.get(userId)
    return userAssignments?.get(experimentId) || null
  }

  /**
   * Save user assignment
   */
  private saveAssignment(experimentId: string, userId: string, variantId: string): void {
    if (!this.userAssignments.has(userId)) {
      this.userAssignments.set(userId, new Map())
    }
    this.userAssignments.get(userId)!.set(experimentId, variantId)
    
    // Persist to storage
    if (typeof window !== 'undefined') {
      const key = `ab_${experimentId}_${userId}`
      localStorage.setItem(key, variantId)
    }
  }

  /**
   * Track exposure event
   */
  private trackExposure(experimentId: string, variantId: string, context: UserContext): void {
    this.queueEvent({
      type: 'exposure',
      experimentId,
      variantId,
      userId: context.userId,
      timestamp: new Date()
    })
  }

  /**
   * Queue event for batch processing
   */
  private queueEvent(event: ExperimentEvent): void {
    this.eventQueue.push(event)
    
    // Flush queue if it gets too large
    if (this.eventQueue.length >= 100) {
      this.flushEvents()
    }
  }

  /**
   * Flush events to analytics service
   */
  async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return
    }

    const events = [...this.eventQueue]
    this.eventQueue = []

    try {
      // Send to analytics service
      await this.sendToAnalytics(events)
    } catch (error) {
      console.error('[A/B] Failed to send events:', error)
      // Re-queue failed events
      this.eventQueue.unshift(...events)
    }
  }

  /**
   * Send events to analytics service
   */
  private async sendToAnalytics(events: ExperimentEvent[]): Promise<void> {
    // Implementation would send to your analytics service
    console.log('[A/B] Sending events:', events.length)
  }

  /**
   * Get experiment results
   */
  async getResults(experimentId: string): Promise<ExperimentResults> {
    // This would fetch from your analytics service
    return {
      experimentId,
      variants: [],
      winner: null,
      confidence: 0
    }
  }
}

/**
 * Event types
 */
interface ExperimentEvent {
  type: 'exposure' | 'conversion'
  experimentId: string
  variantId: string
  userId: string
  timestamp: Date
  metricName?: string
  value?: number
}

/**
 * Experiment results
 */
interface ExperimentResults {
  experimentId: string
  variants: VariantResult[]
  winner: string | null
  confidence: number
}

interface VariantResult {
  variantId: string
  variantName: string
  conversions: number
  exposures: number
  conversionRate: number
  confidence: number
  uplift?: number
}

/**
 * React Hook for A/B Testing
 */
export function useExperiment(
  experimentId: string,
  context: UserContext
): ExperimentResult | null {
  const manager = ExperimentManager.getInstance()
  return manager.getVariant(experimentId, context)
}

/**
 * Feature flag integration
 */
export class FeatureFlags {
  private static flags: Map<string, boolean | string | number> = new Map()

  static set(key: string, value: boolean | string | number): void {
    this.flags.set(key, value)
  }

  static get(key: string, defaultValue: any = false): any {
    return this.flags.get(key) ?? defaultValue
  }

  static isEnabled(key: string): boolean {
    return this.flags.get(key) === true
  }
}

// Export singleton instance
export const experimentManager = ExperimentManager.getInstance()