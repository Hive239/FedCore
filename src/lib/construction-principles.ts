// Construction Principles Knowledge Base
// Core construction principles that guide scheduling and conflict detection
// Integrates with Nexus ML for continuous learning

export interface ConstructionPrinciple {
  id: string
  category: 'sequencing' | 'safety' | 'quality' | 'efficiency' | 'compliance' | 'resource' | 'environmental'
  name: string
  description: string
  importance: number // 1-10 scale
  conditions: string[]
  exceptions?: string[]
  learned: boolean // Whether this was learned from user feedback
  confidence: number // ML confidence score
  examples?: string[]
}

// Core Construction Principles Database
export const CONSTRUCTION_PRINCIPLES: ConstructionPrinciple[] = [
  // SEQUENCING PRINCIPLES
  {
    id: 'seq_001',
    category: 'sequencing',
    name: 'Foundation Before Framing',
    description: 'Foundation must be completed and cured before framing begins',
    importance: 10,
    conditions: [
      'Foundation concrete must cure for minimum 7 days',
      'Foundation inspection must be passed',
      'Moisture barriers must be installed'
    ],
    exceptions: ['Temporary structures', 'Modular construction'],
    learned: false,
    confidence: 1.0,
    examples: ['Concrete foundation → Wait 7 days → Begin framing']
  },
  {
    id: 'seq_002',
    category: 'sequencing',
    name: 'Rough-In Before Close-In',
    description: 'All MEP rough-ins must be complete before insulation and drywall',
    importance: 9,
    conditions: [
      'Electrical rough-in complete',
      'Plumbing rough-in complete',
      'HVAC rough-in complete',
      'Inspections passed'
    ],
    learned: false,
    confidence: 1.0
  },
  {
    id: 'seq_003',
    category: 'sequencing',
    name: 'Dry-In Priority',
    description: 'Building must be dried-in (roof/windows) before interior work',
    importance: 9,
    conditions: [
      'Roof decking and underlayment complete',
      'Windows and doors installed',
      'Building wrap/moisture barrier installed'
    ],
    learned: false,
    confidence: 1.0
  },
  {
    id: 'seq_004',
    category: 'sequencing',
    name: 'Top-Down Exterior',
    description: 'Exterior work proceeds from top to bottom to prevent damage',
    importance: 7,
    conditions: [
      'Roof before siding',
      'Siding before landscaping',
      'Gutters after roofing'
    ],
    learned: false,
    confidence: 0.95
  },
  {
    id: 'seq_005',
    category: 'sequencing',
    name: 'Clean to Dirty Finish Work',
    description: 'Finish work proceeds from clean to dirty trades',
    importance: 6,
    conditions: [
      'Painting before flooring',
      'Drywall before trim',
      'Ceiling work before wall work'
    ],
    learned: false,
    confidence: 0.9
  },

  // SAFETY PRINCIPLES
  {
    id: 'saf_001',
    category: 'safety',
    name: 'Overhead Protection',
    description: 'No work below active overhead operations',
    importance: 10,
    conditions: [
      'Roofing excludes work below',
      'Crane operations require clear zones',
      'Demolition requires full clearance'
    ],
    learned: false,
    confidence: 1.0
  },
  {
    id: 'saf_002',
    category: 'safety',
    name: 'Structural Stability',
    description: 'Structural elements must be secured before loading',
    importance: 10,
    conditions: [
      'Beams must be fully connected',
      'Temporary bracing required until permanent bracing installed',
      'Load limits must be observed'
    ],
    learned: false,
    confidence: 1.0
  },
  {
    id: 'saf_003',
    category: 'safety',
    name: 'Excavation Safety',
    description: 'Excavations must be shored or sloped before entry',
    importance: 10,
    conditions: [
      'Trenches over 5 feet require protection',
      'Daily inspections required',
      'Access ladders every 25 feet'
    ],
    learned: false,
    confidence: 1.0
  },
  {
    id: 'saf_004',
    category: 'safety',
    name: 'Hot Work Separation',
    description: 'Hot work must be isolated from combustibles',
    importance: 9,
    conditions: [
      'Fire watch required',
      '35-foot clearance from combustibles',
      'Fire suppression equipment on hand'
    ],
    learned: false,
    confidence: 1.0
  },

  // QUALITY PRINCIPLES
  {
    id: 'qua_001',
    category: 'quality',
    name: 'Moisture Control',
    description: 'Materials must be protected from moisture damage',
    importance: 9,
    conditions: [
      'Materials stored off ground',
      'Temporary weather protection required',
      'Moisture content checked before installation'
    ],
    learned: false,
    confidence: 0.95
  },
  {
    id: 'qua_002',
    category: 'quality',
    name: 'Temperature Constraints',
    description: 'Temperature-sensitive work must occur within specified ranges',
    importance: 8,
    conditions: [
      'Concrete: 40-90°F',
      'Painting: 50-85°F',
      'Roofing adhesives: per manufacturer'
    ],
    learned: false,
    confidence: 0.9
  },
  {
    id: 'qua_003',
    category: 'quality',
    name: 'Cure Time Respect',
    description: 'Materials must have adequate cure/dry time',
    importance: 8,
    conditions: [
      'Concrete: 7-28 days depending on use',
      'Paint: per manufacturer specs',
      'Adhesives: full cure before loading'
    ],
    learned: false,
    confidence: 0.95
  },
  {
    id: 'qua_004',
    category: 'quality',
    name: 'Protection of Finished Work',
    description: 'Completed work must be protected from damage',
    importance: 7,
    conditions: [
      'Floor protection during construction',
      'Wall corner guards',
      'HVAC filter protection'
    ],
    learned: false,
    confidence: 0.85
  },

  // EFFICIENCY PRINCIPLES
  {
    id: 'eff_001',
    category: 'efficiency',
    name: 'Trade Stacking Optimization',
    description: 'Multiple trades can work simultaneously in different areas',
    importance: 7,
    conditions: [
      'Vertical separation (different floors)',
      'Horizontal separation (different zones)',
      'No shared resources required'
    ],
    learned: false,
    confidence: 0.8
  },
  {
    id: 'eff_002',
    category: 'efficiency',
    name: 'Material Delivery Timing',
    description: 'Materials delivered just-in-time to reduce storage/damage',
    importance: 6,
    conditions: [
      'Storage space available',
      'Weather protection available',
      'Installation crew ready'
    ],
    learned: false,
    confidence: 0.75
  },
  {
    id: 'eff_003',
    category: 'efficiency',
    name: 'Critical Path Priority',
    description: 'Critical path activities take precedence',
    importance: 8,
    conditions: [
      'Delays impact overall schedule',
      'No float available',
      'Dependencies downstream'
    ],
    learned: false,
    confidence: 0.85
  },
  {
    id: 'eff_004',
    category: 'efficiency',
    name: 'Inspection Scheduling',
    description: 'Inspections scheduled to avoid work stoppage',
    importance: 7,
    conditions: [
      'Inspector availability confirmed',
      'Work complete for inspection',
      'Documentation ready'
    ],
    learned: false,
    confidence: 0.8
  },

  // COMPLIANCE PRINCIPLES
  {
    id: 'com_001',
    category: 'compliance',
    name: 'Permit Sequencing',
    description: 'Work cannot proceed without required permits',
    importance: 10,
    conditions: [
      'Building permit before construction',
      'Trade permits before trade work',
      'Inspection approvals before concealment'
    ],
    learned: false,
    confidence: 1.0
  },
  {
    id: 'com_002',
    category: 'compliance',
    name: 'Code Inspection Points',
    description: 'Mandatory inspection points must be scheduled',
    importance: 10,
    conditions: [
      'Foundation before backfill',
      'Framing before insulation',
      'Rough-ins before close-in',
      'Final before occupancy'
    ],
    learned: false,
    confidence: 1.0
  },
  {
    id: 'com_003',
    category: 'compliance',
    name: 'Environmental Compliance',
    description: 'Environmental regulations must be followed',
    importance: 9,
    conditions: [
      'Erosion control in place',
      'Dust control measures',
      'Noise ordinance compliance',
      'Waste disposal compliance'
    ],
    learned: false,
    confidence: 0.95
  },

  // RESOURCE PRINCIPLES
  {
    id: 'res_001',
    category: 'resource',
    name: 'Crew Availability',
    description: 'Adequate crew size required for safe/efficient work',
    importance: 8,
    conditions: [
      'Minimum crew sizes per task',
      'Skill requirements met',
      'Supervision ratios maintained'
    ],
    learned: false,
    confidence: 0.85
  },
  {
    id: 'res_002',
    category: 'resource',
    name: 'Equipment Availability',
    description: 'Required equipment must be available and operational',
    importance: 8,
    conditions: [
      'Equipment reserved/scheduled',
      'Operators qualified',
      'Maintenance current'
    ],
    learned: false,
    confidence: 0.85
  },
  {
    id: 'res_003',
    category: 'resource',
    name: 'Space Conflicts',
    description: 'Adequate workspace required for each trade',
    importance: 7,
    conditions: [
      'Sufficient area for work',
      'Access routes clear',
      'Material staging space available'
    ],
    learned: false,
    confidence: 0.8
  },

  // ENVIRONMENTAL PRINCIPLES
  {
    id: 'env_001',
    category: 'environmental',
    name: 'Weather Windows',
    description: 'Weather-sensitive work requires appropriate conditions',
    importance: 8,
    conditions: [
      'No rain for roofing/concrete',
      'Temperature ranges for materials',
      'Wind limits for crane work'
    ],
    learned: false,
    confidence: 0.9
  },
  {
    id: 'env_002',
    category: 'environmental',
    name: 'Seasonal Considerations',
    description: 'Seasonal factors affect scheduling',
    importance: 6,
    conditions: [
      'Frost protection in winter',
      'Heat protection in summer',
      'Rainy season avoidance'
    ],
    learned: false,
    confidence: 0.75
  }
]

// ML Learning Integration
export interface PrincipleFeedback {
  principleId: string
  eventType1: string
  eventType2: string
  userAction: 'accepted' | 'rejected' | 'modified'
  context: {
    weather?: string
    projectType?: string
    location?: string
    season?: string
  }
  timestamp: Date
}

export class ConstructionPrinciplesEngine {
  private principles: Map<string, ConstructionPrinciple>
  private feedbackHistory: PrincipleFeedback[] = []
  private learnedPrinciples: ConstructionPrinciple[] = []

  constructor() {
    this.principles = new Map(
      CONSTRUCTION_PRINCIPLES.map(p => [p.id, { ...p }])
    )
  }

  // Apply principles to detect conflicts
  applyPrinciples(event1: any, event2: any): Array<{
    principle: ConstructionPrinciple
    violated: boolean
    confidence: number
    reason: string
  }> {
    const results = []
    
    for (const principle of this.principles.values()) {
      const result = this.evaluatePrinciple(principle, event1, event2)
      if (result.violated) {
        results.push(result)
      }
    }
    
    // Sort by importance and confidence
    results.sort((a, b) => {
      const scoreA = a.principle.importance * a.confidence
      const scoreB = b.principle.importance * b.confidence
      return scoreB - scoreA
    })
    
    return results
  }

  private evaluatePrinciple(
    principle: ConstructionPrinciple, 
    event1: any, 
    event2: any
  ): any {
    let violated = false
    let reason = ''
    
    switch (principle.category) {
      case 'sequencing':
        violated = this.checkSequenceViolation(principle, event1, event2)
        if (violated) {
          reason = `${event2.title} should not occur before ${event1.title} per ${principle.name}`
        }
        break
        
      case 'safety':
        violated = this.checkSafetyViolation(principle, event1, event2)
        if (violated) {
          reason = `Safety violation: ${principle.name}`
        }
        break
        
      case 'quality':
        violated = this.checkQualityViolation(principle, event1, event2)
        if (violated) {
          reason = `Quality concern: ${principle.name}`
        }
        break
        
      // Add more category checks...
    }
    
    return {
      principle,
      violated,
      confidence: principle.confidence,
      reason
    }
  }

  private checkSequenceViolation(principle: ConstructionPrinciple, event1: any, event2: any): boolean {
    // Check if events violate sequencing principle
    const tradeDeps = {
      'foundation': ['site_prep', 'demolition'],
      'framing': ['foundation'],
      'electrical': ['framing'],
      'plumbing': ['framing'],
      'insulation': ['electrical', 'plumbing', 'hvac'],
      'drywall': ['insulation'],
      'painting': ['drywall'],
      'flooring': ['painting']
    }
    
    const deps = tradeDeps[event2.event_type as keyof typeof tradeDeps]
    if (deps && deps.includes(event1.event_type)) {
      const start1 = new Date(event1.end_time || event1.start_time).getTime()
      const start2 = new Date(event2.start_time).getTime()
      return start2 < start1
    }
    
    return false
  }

  private checkSafetyViolation(principle: ConstructionPrinciple, event1: any, event2: any): boolean {
    // Check for safety violations
    if (principle.id === 'saf_001') {
      // Check overhead work conflicts
      const overhead = ['roofing', 'framing', 'demolition']
      if (overhead.includes(event1.event_type) && 
          !overhead.includes(event2.event_type)) {
        // Check time overlap
        const start1 = new Date(event1.start_time).getTime()
        const end1 = new Date(event1.end_time || event1.start_time).getTime()
        const start2 = new Date(event2.start_time).getTime()
        const end2 = new Date(event2.end_time || event2.start_time).getTime()
        
        return (start1 < end2 && end1 > start2)
      }
    }
    
    return false
  }

  private checkQualityViolation(principle: ConstructionPrinciple, event1: any, event2: any): boolean {
    // Check for quality violations
    if (principle.id === 'qua_003') {
      // Check cure time violations
      const cureRequirements: Record<string, number> = {
        'concrete': 7,
        'foundation': 7,
        'painting': 2,
        'drywall': 2
      }
      
      const cureTime = cureRequirements[event1.event_type]
      if (cureTime) {
        const end1 = new Date(event1.end_time || event1.start_time)
        const start2 = new Date(event2.start_time)
        const daysBetween = (start2.getTime() - end1.getTime()) / (1000 * 60 * 60 * 24)
        
        return daysBetween < cureTime
      }
    }
    
    return false
  }

  // Learn from user feedback
  async recordFeedback(feedback: PrincipleFeedback) {
    this.feedbackHistory.push(feedback)
    
    // Update principle confidence based on feedback
    const principle = this.principles.get(feedback.principleId)
    if (principle) {
      if (feedback.userAction === 'accepted') {
        // Increase confidence
        principle.confidence = Math.min(1.0, principle.confidence + 0.05)
      } else if (feedback.userAction === 'rejected') {
        // Decrease confidence
        principle.confidence = Math.max(0.3, principle.confidence - 0.1)
      }
      
      // Update principle
      this.principles.set(feedback.principleId, principle)
    }
    
    // Send to Nexus ML for processing
    await this.sendToNexusML(feedback)
    
    // Check if we should create new learned principles
    this.analyzeForNewPrinciples()
  }

  private async sendToNexusML(feedback: PrincipleFeedback) {
    // Integration with Nexus ML Engine
    try {
      const response = await fetch('/api/nexus/ml/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'construction_principle',
          feedback,
          context: {
            principles: Array.from(this.principles.values()),
            history: this.feedbackHistory.slice(-100) // Last 100 feedbacks
          }
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        
        // Update principles based on ML recommendations
        if (result.updatedPrinciples) {
          result.updatedPrinciples.forEach((p: ConstructionPrinciple) => {
            this.principles.set(p.id, p)
          })
        }
        
        // Add new learned principles
        if (result.newPrinciples) {
          result.newPrinciples.forEach((p: ConstructionPrinciple) => {
            p.learned = true
            this.principles.set(p.id, p)
            this.learnedPrinciples.push(p)
          })
        }
      }
    } catch (error) {
      console.error('Failed to send feedback to Nexus ML:', error)
    }
  }

  private analyzeForNewPrinciples() {
    // Analyze feedback patterns to identify new principles
    const recentFeedback = this.feedbackHistory.slice(-50)
    
    // Group by event type pairs
    const patterns = new Map<string, PrincipleFeedback[]>()
    recentFeedback.forEach(fb => {
      const key = `${fb.eventType1}-${fb.eventType2}`
      if (!patterns.has(key)) {
        patterns.set(key, [])
      }
      patterns.get(key)!.push(fb)
    })
    
    // Look for consistent patterns
    patterns.forEach((feedbacks, key) => {
      const rejectionRate = feedbacks.filter(f => f.userAction === 'rejected').length / feedbacks.length
      
      if (rejectionRate > 0.7 && feedbacks.length >= 5) {
        // High rejection rate - might need new principle
        const [type1, type2] = key.split('-')
        this.createLearnedPrinciple(type1, type2, feedbacks)
      }
    })
  }

  private createLearnedPrinciple(
    type1: string, 
    type2: string, 
    feedbacks: PrincipleFeedback[]
  ) {
    // Create a new learned principle based on user behavior
    const principleId = `learned_${Date.now()}`
    const newPrinciple: ConstructionPrinciple = {
      id: principleId,
      category: 'sequencing', // Determine from context
      name: `Learned: ${type1} and ${type2} compatibility`,
      description: `User preference: ${type1} and ${type2} scheduling relationship`,
      importance: 5, // Start with medium importance
      conditions: [
        `Based on ${feedbacks.length} user decisions`,
        `${Math.round(feedbacks.filter(f => f.userAction === 'rejected').length / feedbacks.length * 100)}% rejection rate`
      ],
      learned: true,
      confidence: 0.6, // Start with moderate confidence
      examples: feedbacks.slice(0, 3).map(f => 
        `${f.eventType1} → ${f.eventType2}: ${f.userAction}`
      )
    }
    
    this.principles.set(principleId, newPrinciple)
    this.learnedPrinciples.push(newPrinciple)
  }

  // Get principle recommendations
  getRecommendations(eventType: string): ConstructionPrinciple[] {
    const relevant: ConstructionPrinciple[] = []
    
    this.principles.forEach(principle => {
      // Check if principle mentions this event type
      const isRelevant = principle.conditions.some(c => 
        c.toLowerCase().includes(eventType.replace('_', ' ').toLowerCase())
      )
      
      if (isRelevant) {
        relevant.push(principle)
      }
    })
    
    return relevant.sort((a, b) => b.importance - a.importance)
  }

  // Export learned principles for sharing
  exportLearnedPrinciples(): string {
    return JSON.stringify(this.learnedPrinciples, null, 2)
  }

  // Import learned principles from another project
  importLearnedPrinciples(json: string) {
    try {
      const imported = JSON.parse(json) as ConstructionPrinciple[]
      imported.forEach(p => {
        p.confidence *= 0.8 // Reduce confidence for imported principles
        this.principles.set(p.id, p)
      })
    } catch (error) {
      console.error('Failed to import principles:', error)
    }
  }
}

// Singleton instance
export const principlesEngine = new ConstructionPrinciplesEngine()