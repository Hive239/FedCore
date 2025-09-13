/**
 * A/B Testing Experiments Configuration
 * Define all active experiments here
 */

import { experimentManager } from './experiment-manager'

// Dashboard Layout Experiment
experimentManager.registerExperiment({
  id: 'dashboard-layout-v2',
  name: 'Dashboard Layout Optimization',
  description: 'Testing new dashboard layout with improved information architecture',
  allocation: 50, // 50% of users
  status: 'running',
  variants: [
    {
      id: 'control',
      name: 'Current Layout',
      weight: 50,
      isControl: true,
      config: {
        layout: 'grid',
        columns: 3,
        showSidebar: true
      }
    },
    {
      id: 'variant-a',
      name: 'Compact Layout',
      weight: 50,
      config: {
        layout: 'compact',
        columns: 2,
        showSidebar: false,
        cardSize: 'small'
      }
    }
  ],
  targeting: [],
  metrics: [
    {
      name: 'dashboard_engagement',
      type: 'engagement',
      goal: 'maximize',
      primaryMetric: true
    },
    {
      name: 'task_completion',
      type: 'conversion',
      goal: 'maximize'
    }
  ]
})

// Onboarding Flow Experiment
experimentManager.registerExperiment({
  id: 'onboarding-flow-v3',
  name: 'Simplified Onboarding',
  description: 'Testing simplified onboarding with fewer steps',
  allocation: 100, // All new users
  status: 'running',
  variants: [
    {
      id: 'control',
      name: 'Current Onboarding',
      weight: 33,
      isControl: true,
      config: {
        steps: 5,
        showTutorial: true,
        requireProfile: true
      }
    },
    {
      id: 'variant-a',
      name: 'Simplified 3-Step',
      weight: 33,
      config: {
        steps: 3,
        showTutorial: false,
        requireProfile: false,
        showProgress: true
      }
    },
    {
      id: 'variant-b',
      name: 'Single Page Setup',
      weight: 34,
      config: {
        steps: 1,
        showTutorial: false,
        requireProfile: false,
        expandable: true
      }
    }
  ],
  targeting: [
    {
      type: 'segment',
      operator: 'equals',
      value: 'new_user'
    }
  ],
  metrics: [
    {
      name: 'onboarding_completion',
      type: 'conversion',
      goal: 'maximize',
      primaryMetric: true
    },
    {
      name: 'time_to_first_project',
      type: 'custom',
      goal: 'minimize'
    }
  ]
})

// Map Performance Experiment
experimentManager.registerExperiment({
  id: 'map-rendering-optimization',
  name: 'Map Rendering Strategy',
  description: 'Testing different map rendering strategies for performance',
  allocation: 30, // 30% of users
  status: 'running',
  variants: [
    {
      id: 'control',
      name: 'Current Rendering',
      weight: 50,
      isControl: true,
      config: {
        renderer: 'webgl',
        clustering: false,
        lazyLoad: false
      }
    },
    {
      id: 'variant-a',
      name: 'Progressive Rendering',
      weight: 50,
      config: {
        renderer: 'webgl',
        clustering: true,
        lazyLoad: true,
        tileSize: 256,
        maxZoom: 18
      }
    }
  ],
  targeting: [
    {
      type: 'device',
      operator: 'equals',
      value: 'desktop'
    }
  ],
  metrics: [
    {
      name: 'map_load_time',
      type: 'custom',
      goal: 'minimize',
      primaryMetric: true
    },
    {
      name: 'map_interaction_rate',
      type: 'engagement',
      goal: 'maximize'
    }
  ]
})

// Notification Preferences Experiment
experimentManager.registerExperiment({
  id: 'notification-preferences',
  name: 'Smart Notification Defaults',
  description: 'Testing AI-powered notification preferences',
  allocation: 20, // 20% of users
  status: 'running',
  variants: [
    {
      id: 'control',
      name: 'Manual Settings',
      weight: 50,
      isControl: true,
      config: {
        defaultOn: false,
        showPreferences: true,
        aiSuggestions: false
      }
    },
    {
      id: 'variant-a',
      name: 'AI Recommendations',
      weight: 50,
      config: {
        defaultOn: true,
        showPreferences: true,
        aiSuggestions: true,
        adaptiveTiming: true
      }
    }
  ],
  targeting: [
    {
      type: 'segment',
      operator: 'equals',
      value: 'active_user'
    }
  ],
  metrics: [
    {
      name: 'notification_engagement',
      type: 'engagement',
      goal: 'maximize',
      primaryMetric: true
    },
    {
      name: 'notification_opt_out',
      type: 'custom',
      goal: 'minimize'
    }
  ]
})

// Search Algorithm Experiment
experimentManager.registerExperiment({
  id: 'search-algorithm-v2',
  name: 'Enhanced Search Algorithm',
  description: 'Testing fuzzy search vs exact match',
  allocation: 40, // 40% of users
  status: 'running',
  variants: [
    {
      id: 'control',
      name: 'Exact Match',
      weight: 50,
      isControl: true,
      config: {
        algorithm: 'exact',
        suggestions: false,
        spellCheck: false
      }
    },
    {
      id: 'variant-a',
      name: 'Fuzzy Search',
      weight: 50,
      config: {
        algorithm: 'fuzzy',
        suggestions: true,
        spellCheck: true,
        threshold: 0.6
      }
    }
  ],
  targeting: [],
  metrics: [
    {
      name: 'search_success_rate',
      type: 'conversion',
      goal: 'maximize',
      primaryMetric: true
    },
    {
      name: 'search_refinements',
      type: 'custom',
      goal: 'minimize'
    }
  ]
})

// Export active experiment IDs
export const ACTIVE_EXPERIMENTS = {
  DASHBOARD_LAYOUT: 'dashboard-layout-v2',
  ONBOARDING_FLOW: 'onboarding-flow-v3',
  MAP_RENDERING: 'map-rendering-optimization',
  NOTIFICATIONS: 'notification-preferences',
  SEARCH: 'search-algorithm-v2'
} as const

// Feature flags configuration
import { FeatureFlags } from './experiment-manager'

// Set feature flags
FeatureFlags.set('new_calendar_view', true)
FeatureFlags.set('advanced_filters', true)
FeatureFlags.set('ai_assistant', false)
FeatureFlags.set('beta_features', false)
FeatureFlags.set('performance_monitoring', true)
FeatureFlags.set('debug_mode', process.env.NODE_ENV === 'development')

export { FeatureFlags }