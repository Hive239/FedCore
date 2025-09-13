import { TaskSuggestion, ContactTag } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

// Construction phase sequences
const constructionPhases = [
  'planning',
  'permits',
  'site_prep',
  'foundation',
  'framing',
  'roofing',
  'mep_rough',
  'insulation',
  'drywall',
  'flooring',
  'mep_finish',
  'painting',
  'fixtures',
  'landscaping',
  'final_inspection',
  'closeout'
]

// Task templates by phase
const phaseTaskTemplates: Record<string, Array<{
  title: string
  description?: string
  duration_days: number
  required_contacts: string[]
  tags: string[]
}>> = {
  planning: [
    {
      title: 'Site Survey and Analysis',
      description: 'Conduct comprehensive site survey including topography, utilities, and access',
      duration_days: 2,
      required_contacts: ['design_professional'],
      tags: ['survey', 'planning', 'site-analysis']
    },
    {
      title: 'Architectural Design Development',
      description: 'Develop detailed architectural plans and specifications',
      duration_days: 14,
      required_contacts: ['design_professional'],
      tags: ['design', 'architecture', 'planning']
    },
    {
      title: 'Engineering Review',
      description: 'Structural, MEP, and civil engineering review and coordination',
      duration_days: 7,
      required_contacts: ['design_professional'],
      tags: ['engineering', 'review', 'coordination']
    }
  ],
  permits: [
    {
      title: 'Prepare Permit Application',
      description: 'Compile all required documents for building permit submission',
      duration_days: 3,
      required_contacts: ['design_professional'],
      tags: ['permits', 'documentation', 'submission']
    },
    {
      title: 'Submit Building Permit',
      description: 'Submit permit application to local building department',
      duration_days: 1,
      required_contacts: [],
      tags: ['permits', 'submission', 'regulatory']
    },
    {
      title: 'Address Permit Comments',
      description: 'Respond to building department review comments',
      duration_days: 5,
      required_contacts: ['design_professional'],
      tags: ['permits', 'revisions', 'compliance']
    }
  ],
  foundation: [
    {
      title: 'Excavation and Site Preparation',
      description: 'Excavate for foundation and prepare site',
      duration_days: 2,
      required_contacts: ['contractor'],
      tags: ['excavation', 'site-prep', 'foundation']
    },
    {
      title: 'Pour Concrete Footings',
      description: 'Form and pour concrete footings per structural plans',
      duration_days: 1,
      required_contacts: ['contractor'],
      tags: ['concrete', 'footings', 'foundation']
    },
    {
      title: 'Foundation Walls Construction',
      description: 'Build foundation walls and install waterproofing',
      duration_days: 3,
      required_contacts: ['contractor'],
      tags: ['foundation', 'walls', 'waterproofing']
    },
    {
      title: 'Foundation Inspection',
      description: 'Schedule and complete foundation inspection',
      duration_days: 1,
      required_contacts: ['contractor'],
      tags: ['inspection', 'foundation', 'compliance']
    }
  ],
  framing: [
    {
      title: 'Floor System Installation',
      description: 'Install floor joists and subfloor',
      duration_days: 3,
      required_contacts: ['contractor'],
      tags: ['framing', 'floors', 'structural']
    },
    {
      title: 'Wall Framing',
      description: 'Frame exterior and interior walls',
      duration_days: 5,
      required_contacts: ['contractor'],
      tags: ['framing', 'walls', 'structural']
    },
    {
      title: 'Roof Framing',
      description: 'Install roof trusses or rafters and sheathing',
      duration_days: 4,
      required_contacts: ['contractor'],
      tags: ['framing', 'roof', 'structural']
    },
    {
      title: 'Framing Inspection',
      description: 'Schedule and complete framing inspection',
      duration_days: 1,
      required_contacts: ['contractor'],
      tags: ['inspection', 'framing', 'compliance']
    }
  ],
  mep_rough: [
    {
      title: 'Plumbing Rough-In',
      description: 'Install water supply and drain lines',
      duration_days: 3,
      required_contacts: ['contractor', 'vendor'],
      tags: ['plumbing', 'rough-in', 'mep']
    },
    {
      title: 'Electrical Rough-In',
      description: 'Install electrical wiring and boxes',
      duration_days: 4,
      required_contacts: ['contractor', 'vendor'],
      tags: ['electrical', 'rough-in', 'mep']
    },
    {
      title: 'HVAC Rough-In',
      description: 'Install ductwork and HVAC equipment',
      duration_days: 3,
      required_contacts: ['contractor', 'vendor'],
      tags: ['hvac', 'rough-in', 'mep']
    },
    {
      title: 'MEP Inspections',
      description: 'Complete all MEP rough-in inspections',
      duration_days: 2,
      required_contacts: ['contractor'],
      tags: ['inspection', 'mep', 'compliance']
    }
  ]
}

// Analyze task title to determine phase
function detectConstructionPhase(taskTitle: string): string | null {
  const title = taskTitle.toLowerCase()
  
  if (title.includes('design') || title.includes('plan') || title.includes('survey')) {
    return 'planning'
  }
  if (title.includes('permit') || title.includes('approval')) {
    return 'permits'
  }
  if (title.includes('excavat') || title.includes('site prep')) {
    return 'site_prep'
  }
  if (title.includes('foundation') || title.includes('footing') || title.includes('slab')) {
    return 'foundation'
  }
  if (title.includes('fram') || title.includes('wall') || title.includes('roof')) {
    return 'framing'
  }
  if (title.includes('plumb') || title.includes('electric') || title.includes('hvac') || title.includes('mep')) {
    return 'mep_rough'
  }
  if (title.includes('insul')) {
    return 'insulation'
  }
  if (title.includes('drywall') || title.includes('sheetrock')) {
    return 'drywall'
  }
  if (title.includes('floor') || title.includes('tile')) {
    return 'flooring'
  }
  if (title.includes('paint') || title.includes('finish')) {
    return 'painting'
  }
  if (title.includes('landscap') || title.includes('exterior')) {
    return 'landscaping'
  }
  if (title.includes('inspect') || title.includes('final')) {
    return 'final_inspection'
  }
  
  return null
}

// Get the next logical phase in construction
function getNextPhase(currentPhase: string | null): string | null {
  if (!currentPhase) return 'planning'
  
  const currentIndex = constructionPhases.indexOf(currentPhase)
  if (currentIndex === -1 || currentIndex === constructionPhases.length - 1) {
    return null
  }
  
  return constructionPhases[currentIndex + 1]
}

// Generate task suggestions based on current task
export async function generateTaskSuggestions(
  taskId: string,
  projectId?: string
): Promise<TaskSuggestion[]> {
  const supabase = createClient()
  
  // Get current task details
  const { data: currentTask, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single()
  
  if (error || !currentTask) {
    console.error('Failed to fetch task:', error)
    return []
  }
  
  // Detect current phase
  const currentPhase = detectConstructionPhase(currentTask.title)
  const nextPhase = getNextPhase(currentPhase)
  
  const suggestions: TaskSuggestion[] = []
  
  // Get suggestions from current phase (remaining tasks)
  if (currentPhase && phaseTaskTemplates[currentPhase]) {
    const currentPhaseTasks = phaseTaskTemplates[currentPhase]
    
    // Filter tasks that haven't been created yet (simplified check)
    for (const template of currentPhaseTasks) {
      // Check if a similar task already exists in the project
      if (projectId) {
        const { data: existingTasks } = await supabase
          .from('tasks')
          .select('id, title')
          .eq('project_id', projectId)
          .ilike('title', `%${template.title.split(' ')[0]}%`)
        
        // If no similar task exists, suggest it
        if (!existingTasks || existingTasks.length === 0) {
          const contactTags: ContactTag[] = template.required_contacts.map(type => ({
            contact_id: crypto.randomUUID(),
            contact_type: type as any,
            contact_name: `Select ${type.replace('_', ' ')}`
          }))
          
          suggestions.push({
            id: crypto.randomUUID(),
            suggested_title: template.title,
            suggested_description: template.description,
            suggested_priority: 'medium',
            suggested_duration_days: template.duration_days,
            suggested_tags: template.tags,
            suggested_contact_tags: contactTags,
            confidence_score: 0.8,
            suggestion_reason: `Common task in ${currentPhase.replace('_', ' ')} phase`,
            construction_phase: currentPhase
          })
        }
      }
    }
  }
  
  // Get suggestions from next phase
  if (nextPhase && phaseTaskTemplates[nextPhase]) {
    const nextPhaseTasks = phaseTaskTemplates[nextPhase].slice(0, 2) // Get first 2 tasks from next phase
    
    for (const template of nextPhaseTasks) {
      const contactTags: ContactTag[] = template.required_contacts.map(type => ({
        contact_id: crypto.randomUUID(),
        contact_type: type as any,
        contact_name: `Select ${type.replace('_', ' ')}`
      }))
      
      suggestions.push({
        id: crypto.randomUUID(),
        suggested_title: template.title,
        suggested_description: template.description,
        suggested_priority: 'medium',
        suggested_duration_days: template.duration_days,
        suggested_tags: template.tags,
        suggested_contact_tags: contactTags,
        confidence_score: 0.7,
        suggestion_reason: `Typical next step: ${nextPhase.replace('_', ' ')} phase`,
        construction_phase: nextPhase
      })
    }
  }
  
  // Context-based suggestions
  const taskTitleLower = currentTask.title.toLowerCase()
  
  // If task mentions inspection, suggest scheduling next phase
  if (taskTitleLower.includes('inspection') && taskTitleLower.includes('pass')) {
    suggestions.push({
      id: crypto.randomUUID(),
      suggested_title: 'Schedule Next Phase Meeting',
      suggested_description: 'Coordinate with contractors for the next construction phase',
      suggested_priority: 'high',
      suggested_duration_days: 1,
      suggested_tags: ['coordination', 'planning', 'meeting'],
      suggested_contact_tags: [
        {
          contact_id: crypto.randomUUID(),
          contact_type: 'contractor',
          contact_name: 'Select contractor'
        }
      ],
      confidence_score: 0.85,
      suggestion_reason: 'Inspection completed - coordinate next phase',
      construction_phase: nextPhase || undefined
    })
  }
  
  // If task mentions delays or issues, suggest mitigation
  if (taskTitleLower.includes('delay') || taskTitleLower.includes('issue')) {
    suggestions.push({
      id: crypto.randomUUID(),
      suggested_title: 'Create Recovery Plan',
      suggested_description: 'Develop plan to mitigate delays and get back on schedule',
      suggested_priority: 'high',
      suggested_duration_days: 1,
      suggested_tags: ['planning', 'mitigation', 'schedule'],
      suggested_contact_tags: [
        {
          contact_id: crypto.randomUUID(),
          contact_type: 'contractor',
          contact_name: 'Select contractor'
        }
      ],
      confidence_score: 0.9,
      suggestion_reason: 'Delay detected - mitigation needed',
      construction_phase: currentPhase || undefined
    })
  }
  
  return suggestions.slice(0, 5) // Return max 5 suggestions
}