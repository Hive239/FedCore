// Construction Logic and Trade Dependencies
// This module contains construction sequencing rules and trade conflict detection

export interface TradeDependency {
  trade: string
  dependsOn: string[]
  cannotOverlapWith: string[]
  minimumDaysBefore?: number
  minimumDaysAfter?: number
  weatherSensitive?: boolean
  requiresInspection?: boolean
}

export interface ConflictRule {
  id: string
  name: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  type: 'sequence' | 'resource' | 'space' | 'weather' | 'inspection' | 'safety'
  checkFunction: (event1: any, event2: any) => boolean
}

// Construction sequence dependencies
export const TRADE_DEPENDENCIES: Record<string, TradeDependency> = {
  foundation: {
    trade: 'foundation',
    dependsOn: ['demolition', 'site_prep'],
    cannotOverlapWith: ['framing', 'electrical', 'plumbing'],
    minimumDaysAfter: 7, // Curing time
    weatherSensitive: true,
    requiresInspection: true
  },
  framing: {
    trade: 'framing',
    dependsOn: ['foundation'],
    cannotOverlapWith: ['roofing', 'siding'],
    minimumDaysBefore: 3,
    weatherSensitive: true,
    requiresInspection: true
  },
  roofing: {
    trade: 'roofing',
    dependsOn: ['framing'],
    cannotOverlapWith: ['electrical', 'plumbing', 'hvac'],
    weatherSensitive: true,
    requiresInspection: false
  },
  electrical: {
    trade: 'electrical',
    dependsOn: ['framing'],
    cannotOverlapWith: ['insulation', 'drywall'],
    minimumDaysBefore: 2,
    requiresInspection: true
  },
  plumbing: {
    trade: 'plumbing',
    dependsOn: ['framing'],
    cannotOverlapWith: ['insulation', 'drywall'],
    minimumDaysBefore: 2,
    requiresInspection: true
  },
  hvac: {
    trade: 'hvac',
    dependsOn: ['framing', 'roofing'],
    cannotOverlapWith: ['insulation', 'drywall'],
    minimumDaysBefore: 2,
    requiresInspection: true
  },
  insulation: {
    trade: 'insulation',
    dependsOn: ['electrical', 'plumbing', 'hvac'],
    cannotOverlapWith: ['drywall'],
    minimumDaysBefore: 1,
    weatherSensitive: false,
    requiresInspection: true
  },
  drywall: {
    trade: 'drywall',
    dependsOn: ['insulation'],
    cannotOverlapWith: ['painting', 'flooring'],
    minimumDaysAfter: 2, // Drying time
    weatherSensitive: false,
    requiresInspection: false
  },
  painting: {
    trade: 'painting',
    dependsOn: ['drywall'],
    cannotOverlapWith: ['flooring', 'installation'],
    minimumDaysAfter: 2, // Drying time
    weatherSensitive: false,
    requiresInspection: false
  },
  flooring: {
    trade: 'flooring',
    dependsOn: ['painting'],
    cannotOverlapWith: ['installation'],
    weatherSensitive: false,
    requiresInspection: false
  },
  windows_doors: {
    trade: 'windows_doors',
    dependsOn: ['framing'],
    cannotOverlapWith: ['siding', 'insulation'],
    weatherSensitive: true,
    requiresInspection: false
  },
  siding: {
    trade: 'siding',
    dependsOn: ['windows_doors', 'roofing'],
    cannotOverlapWith: ['landscaping'],
    weatherSensitive: true,
    requiresInspection: false
  },
  landscaping: {
    trade: 'landscaping',
    dependsOn: ['siding', 'concrete'],
    cannotOverlapWith: [],
    weatherSensitive: true,
    requiresInspection: false
  },
  concrete: {
    trade: 'concrete',
    dependsOn: ['foundation'],
    cannotOverlapWith: ['landscaping'],
    minimumDaysAfter: 7, // Curing time
    weatherSensitive: true,
    requiresInspection: false
  },
  installation: {
    trade: 'installation',
    dependsOn: ['flooring', 'painting'],
    cannotOverlapWith: [],
    weatherSensitive: false,
    requiresInspection: false
  },
  demolition: {
    trade: 'demolition',
    dependsOn: [],
    cannotOverlapWith: ['foundation', 'framing'],
    weatherSensitive: false,
    requiresInspection: true
  }
}

// Conflict detection rules
export const CONFLICT_RULES: ConflictRule[] = [
  {
    id: 'sequence_violation',
    name: 'Construction Sequence Violation',
    description: 'Work scheduled out of proper construction sequence',
    severity: 'critical',
    type: 'sequence',
    checkFunction: (event1, event2) => {
      const dep1 = TRADE_DEPENDENCIES[event1.event_type]
      const dep2 = TRADE_DEPENDENCIES[event2.event_type]
      
      if (!dep1 || !dep2) return false
      
      // Check if event2 depends on event1 but is scheduled before
      if (dep2.dependsOn.includes(event1.event_type)) {
        const start1 = new Date(event1.start_time).getTime()
        const start2 = new Date(event2.start_time).getTime()
        return start2 < start1
      }
      
      return false
    }
  },
  {
    id: 'overlap_violation',
    name: 'Trade Overlap Conflict',
    description: 'Trades that cannot work simultaneously are scheduled together',
    severity: 'high',
    type: 'space',
    checkFunction: (event1, event2) => {
      const dep1 = TRADE_DEPENDENCIES[event1.event_type]
      const dep2 = TRADE_DEPENDENCIES[event2.event_type]
      
      if (!dep1 || !dep2) return false
      
      // Check if trades cannot overlap
      if (dep1.cannotOverlapWith.includes(event2.event_type) || 
          dep2.cannotOverlapWith.includes(event1.event_type)) {
        const start1 = new Date(event1.start_time).getTime()
        const end1 = new Date(event1.end_time || event1.start_time).getTime()
        const start2 = new Date(event2.start_time).getTime()
        const end2 = new Date(event2.end_time || event2.start_time).getTime()
        
        // Check for overlap
        return (start1 < end2 && end1 > start2)
      }
      
      return false
    }
  },
  {
    id: 'curing_time',
    name: 'Insufficient Curing/Drying Time',
    description: 'Not enough time allocated for materials to cure or dry',
    severity: 'high',
    type: 'sequence',
    checkFunction: (event1, event2) => {
      const dep1 = TRADE_DEPENDENCIES[event1.event_type]
      const dep2 = TRADE_DEPENDENCIES[event2.event_type]
      
      if (!dep1 || !dep2) return false
      
      // Check minimum days after requirement
      if (dep1.minimumDaysAfter && dep2.dependsOn.includes(event1.event_type)) {
        const end1 = new Date(event1.end_time || event1.start_time).getTime()
        const start2 = new Date(event2.start_time).getTime()
        const daysBetween = (start2 - end1) / (1000 * 60 * 60 * 24)
        
        return daysBetween < dep1.minimumDaysAfter
      }
      
      return false
    }
  },
  {
    id: 'inspection_pending',
    name: 'Inspection Required',
    description: 'Work scheduled before required inspection',
    severity: 'critical',
    type: 'inspection',
    checkFunction: (event1, event2) => {
      const dep1 = TRADE_DEPENDENCIES[event1.event_type]
      const dep2 = TRADE_DEPENDENCIES[event2.event_type]
      
      if (!dep1 || !dep2) return false
      
      // Check if event1 requires inspection and event2 depends on it
      if (dep1.requiresInspection && dep2.dependsOn.includes(event1.event_type)) {
        // Check if there's an inspection scheduled between them
        // This would need to check for inspection events
        return event1.event_type !== 'inspection' && !event1.inspection_completed
      }
      
      return false
    }
  },
  {
    id: 'weather_conflict',
    name: 'Weather-Sensitive Work',
    description: 'Weather-sensitive work scheduled during poor conditions',
    severity: 'medium',
    type: 'weather',
    checkFunction: (event1, event2) => {
      // This would integrate with weather data
      const dep1 = TRADE_DEPENDENCIES[event1.event_type]
      
      if (!dep1 || !dep1.weatherSensitive) return false
      
      // Check if bad weather is forecasted
      if (event2.event_type === 'weather_alert' || event2.weather_condition === 'rain' || event2.weather_condition === 'snow') {
        const start1 = new Date(event1.start_time).getTime()
        const end1 = new Date(event1.end_time || event1.start_time).getTime()
        const weatherTime = new Date(event2.start_time).getTime()
        
        return weatherTime >= start1 && weatherTime <= end1
      }
      
      return false
    }
  },
  {
    id: 'resource_conflict',
    name: 'Resource Overallocation',
    description: 'Same crew or equipment scheduled for multiple tasks',
    severity: 'high',
    type: 'resource',
    checkFunction: (event1, event2) => {
      // Check if same team members or equipment are assigned
      if (event1.team_member_id === event2.team_member_id && event1.team_member_id) {
        const start1 = new Date(event1.start_time).getTime()
        const end1 = new Date(event1.end_time || event1.start_time).getTime()
        const start2 = new Date(event2.start_time).getTime()
        const end2 = new Date(event2.end_time || event2.start_time).getTime()
        
        // Check for overlap
        return (start1 < end2 && end1 > start2)
      }
      
      return false
    }
  },
  {
    id: 'safety_violation',
    name: 'Safety Protocol Violation',
    description: 'Unsafe work conditions due to concurrent activities',
    severity: 'critical',
    type: 'safety',
    checkFunction: (event1, event2) => {
      // Demolition cannot happen with other trades present
      if (event1.event_type === 'demolition' || event2.event_type === 'demolition') {
        const start1 = new Date(event1.start_time).getTime()
        const end1 = new Date(event1.end_time || event1.start_time).getTime()
        const start2 = new Date(event2.start_time).getTime()
        const end2 = new Date(event2.end_time || event2.start_time).getTime()
        
        // Check for any overlap
        return (start1 < end2 && end1 > start2) && event1.id !== event2.id
      }
      
      return false
    }
  }
]

// Conflict analyzer
export interface ConflictAnalysis {
  conflicts: Array<{
    event1: any
    event2: any
    rule: ConflictRule
    severity: string
    description: string
    resolution?: string
  }>
  suggestions: string[]
  score: number // 0-100, where 100 is no conflicts
}

export function analyzeScheduleConflicts(
  events: any[],
  perspective: 'strict' | 'balanced' | 'flexible' = 'balanced',
  weatherData?: any[]
): ConflictAnalysis {
  const conflicts: ConflictAnalysis['conflicts'] = []
  const suggestions: string[] = []
  
  // Adjust rules based on perspective
  const activeRules = CONFLICT_RULES.filter(rule => {
    if (perspective === 'strict') return true
    if (perspective === 'flexible') return rule.severity === 'critical'
    // balanced - exclude low severity weather conflicts
    return !(rule.type === 'weather' && rule.severity === 'low')
  })
  
  // Check each pair of events
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const event1 = events[i]
      const event2 = events[j]
      
      // Check against each rule
      for (const rule of activeRules) {
        if (rule.checkFunction(event1, event2)) {
          conflicts.push({
            event1,
            event2,
            rule,
            severity: rule.severity,
            description: `${rule.name}: ${event1.title} conflicts with ${event2.title}`,
            resolution: generateResolution(event1, event2, rule)
          })
        }
      }
    }
  }
  
  // Generate suggestions
  if (conflicts.length > 0) {
    const criticalCount = conflicts.filter(c => c.severity === 'critical').length
    const highCount = conflicts.filter(c => c.severity === 'high').length
    
    if (criticalCount > 0) {
      suggestions.push(`⚠️ ${criticalCount} critical conflicts require immediate attention`)
      suggestions.push('Consider rescheduling work to follow proper construction sequence')
    }
    
    if (highCount > 0) {
      suggestions.push(`${highCount} high-priority conflicts may cause delays`)
      suggestions.push('Review trade dependencies and adjust schedule accordingly')
    }
    
    // Add specific suggestions based on conflict types
    const sequenceConflicts = conflicts.filter(c => c.rule.type === 'sequence')
    if (sequenceConflicts.length > 0) {
      suggestions.push('Reorder tasks to follow construction best practices')
    }
    
    const weatherConflicts = conflicts.filter(c => c.rule.type === 'weather')
    if (weatherConflicts.length > 0) {
      suggestions.push('Consider weather forecasts when scheduling outdoor work')
    }
  } else {
    suggestions.push('✅ Schedule looks good! No conflicts detected.')
  }
  
  // Calculate score
  const maxScore = 100
  const criticalPenalty = 25
  const highPenalty = 15
  const mediumPenalty = 8
  const lowPenalty = 3
  
  let score = maxScore
  conflicts.forEach(conflict => {
    switch (conflict.severity) {
      case 'critical': score -= criticalPenalty; break
      case 'high': score -= highPenalty; break
      case 'medium': score -= mediumPenalty; break
      case 'low': score -= lowPenalty; break
    }
  })
  
  score = Math.max(0, score)
  
  return {
    conflicts,
    suggestions,
    score
  }
}

function generateResolution(event1: any, event2: any, rule: ConflictRule): string {
  switch (rule.type) {
    case 'sequence':
      return `Reschedule ${event2.title} to start after ${event1.title} is completed`
    case 'space':
      return `Stagger these activities or assign to different areas of the project`
    case 'weather':
      return `Consider moving ${event1.title} to a day with better weather conditions`
    case 'inspection':
      return `Schedule inspection after ${event1.title} and before ${event2.title}`
    case 'resource':
      return `Assign different crews or reschedule to avoid resource conflicts`
    case 'safety':
      return `These activities cannot occur simultaneously for safety reasons`
    default:
      return 'Review and adjust schedule to resolve conflict'
  }
}

// Automatic conflict resolution
export interface ResolutionSuggestion {
  eventId: string
  originalStart: Date
  originalEnd: Date
  suggestedStart: Date
  suggestedEnd: Date
  reason: string
}

export function suggestOptimalSchedule(
  events: any[],
  constraints?: {
    projectDeadline?: Date
    preferredWorkDays?: number[]
    workHoursStart?: number
    workHoursEnd?: number
  }
): ResolutionSuggestion[] {
  const suggestions: ResolutionSuggestion[] = []
  const sortedEvents = [...events].sort((a, b) => {
    // Sort by dependency order
    const depA = TRADE_DEPENDENCIES[a.event_type]
    const depB = TRADE_DEPENDENCIES[b.event_type]
    
    if (!depA || !depB) return 0
    
    if (depB.dependsOn.includes(a.event_type)) return -1
    if (depA.dependsOn.includes(b.event_type)) return 1
    
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  })
  
  let lastEndTime = new Date()
  
  sortedEvents.forEach(event => {
    const dep = TRADE_DEPENDENCIES[event.event_type]
    if (!dep) return
    
    const originalStart = new Date(event.start_time)
    const originalEnd = new Date(event.end_time || event.start_time)
    let suggestedStart = new Date(originalStart)
    
    // Check dependencies
    const dependencies = sortedEvents.filter(e => 
      dep.dependsOn.includes(e.event_type)
    )
    
    if (dependencies.length > 0) {
      // Find the latest end time of dependencies
      const latestDependency = dependencies.reduce((latest, dep) => {
        const depEnd = new Date(dep.end_time || dep.start_time)
        return depEnd > latest ? depEnd : latest
      }, new Date(0))
      
      // Add minimum days after if required
      if (dep.minimumDaysAfter) {
        suggestedStart = new Date(latestDependency.getTime() + (dep.minimumDaysAfter * 24 * 60 * 60 * 1000))
      } else {
        suggestedStart = new Date(Math.max(latestDependency.getTime(), lastEndTime.getTime()))
      }
    }
    
    // Adjust for work hours and days if constraints provided
    if (constraints) {
      if (constraints.preferredWorkDays && !constraints.preferredWorkDays.includes(suggestedStart.getDay())) {
        // Move to next available work day
        while (!constraints.preferredWorkDays.includes(suggestedStart.getDay())) {
          suggestedStart.setDate(suggestedStart.getDate() + 1)
        }
      }
      
      if (constraints.workHoursStart && suggestedStart.getHours() < constraints.workHoursStart) {
        suggestedStart.setHours(constraints.workHoursStart)
      }
    }
    
    // Calculate suggested end time
    const duration = originalEnd.getTime() - originalStart.getTime()
    const suggestedEnd = new Date(suggestedStart.getTime() + duration)
    
    // Only suggest if different from original
    if (suggestedStart.getTime() !== originalStart.getTime()) {
      suggestions.push({
        eventId: event.id,
        originalStart,
        originalEnd,
        suggestedStart,
        suggestedEnd,
        reason: `Adjusted to follow construction sequence and dependencies`
      })
    }
    
    lastEndTime = suggestedEnd
  })
  
  return suggestions
}