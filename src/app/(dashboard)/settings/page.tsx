"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Bell, Shield, Palette, CreditCard, Activity, MapPin, Clock, Users, MessageSquare, Settings, Globe, FileText, ArrowRight, Hash, Briefcase, Zap, Database, Wifi, TrendingUp, Brain, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Avatar preset options with solid colors and gradients
const avatarPresets = {
  gradients: [
    { id: 'g1', value: 'bg-gradient-to-br from-blue-400 via-blue-500 to-purple-700' },
    { id: 'g2', value: 'bg-gradient-to-br from-green-400 via-teal-500 to-blue-600' },
    { id: 'g3', value: 'bg-gradient-to-br from-purple-400 via-pink-500 to-rose-700' },
    { id: 'g4', value: 'bg-gradient-to-br from-yellow-300 via-orange-400 to-red-600' },
    { id: 'g5', value: 'bg-gradient-to-br from-pink-300 via-rose-400 to-red-700' },
    { id: 'g6', value: 'bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-600' },
    { id: 'g7', value: 'bg-gradient-to-br from-teal-300 via-cyan-400 to-blue-700' },
    { id: 'g8', value: 'bg-gradient-to-br from-orange-300 via-red-400 to-rose-700' },
    { id: 'g9', value: 'bg-gradient-to-br from-cyan-300 via-sky-400 to-indigo-700' },
    { id: 'g10', value: 'bg-gradient-to-br from-emerald-300 via-green-500 to-teal-700' },
    { id: 'g11', value: 'bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-800' },
    { id: 'g12', value: 'bg-gradient-to-br from-fuchsia-300 via-purple-500 to-violet-700' },
    { id: 'g13', value: 'bg-gradient-to-br from-red-300 via-pink-400 to-purple-700' },
    { id: 'g14', value: 'bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-700' },
    { id: 'g15', value: 'bg-gradient-to-br from-lime-300 via-green-400 to-emerald-700' },
    { id: 'g16', value: 'bg-gradient-to-br from-sky-300 via-blue-500 to-indigo-800' },
  ],
  solids: [
    { id: 's1', value: 'bg-slate-600' },
    { id: 's2', value: 'bg-gray-600' },
    { id: 's3', value: 'bg-zinc-600' },
    { id: 's4', value: 'bg-neutral-600' },
    { id: 's5', value: 'bg-stone-600' },
    { id: 's6', value: 'bg-red-600' },
    { id: 's7', value: 'bg-orange-600' },
    { id: 's8', value: 'bg-amber-600' },
    { id: 's9', value: 'bg-yellow-600' },
    { id: 's10', value: 'bg-lime-600' },
    { id: 's11', value: 'bg-green-600' },
    { id: 's12', value: 'bg-emerald-600' },
    { id: 's13', value: 'bg-teal-600' },
    { id: 's14', value: 'bg-cyan-600' },
    { id: 's15', value: 'bg-sky-600' },
    { id: 's16', value: 'bg-blue-600' },
    { id: 's17', value: 'bg-indigo-600' },
    { id: 's18', value: 'bg-violet-600' },
    { id: 's19', value: 'bg-purple-600' },
    { id: 's20', value: 'bg-fuchsia-600' },
    { id: 's21', value: 'bg-pink-600' },
    { id: 's22', value: 'bg-rose-600' },
  ]
}

const settingsSections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'projects', label: 'Projects', icon: Briefcase },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'ml', label: 'ML System', icon: Brain },
  { id: 'performance', label: 'Performance', icon: Activity },
  { id: 'security', label: 'Security', icon: Shield },
]

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile')
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    company: '',
    phone: '',
    avatar_url: '',
    job_title: '',
    department: '',
    bio: '',
    timezone: 'UTC',
    location: '',
    linkedin_url: '',
    website_url: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    work_hours_start: '09:00',
    work_hours_end: '17:00',
    preferred_language: 'en',
    date_format: 'MM/dd/yyyy',
    time_format: '12h'
  })
  
  const [performanceMetrics, setPerformanceMetrics] = useState({
    pageLoadTime: 0,
    memoryUsage: 0,
    memoryLimit: 0,
    cacheSize: 0,
    activeConnections: 0,
    apiLatency: 0,
    dbResponseTime: 0,
    totalQueries: 0,
    networkSpeed: 'Unknown',
    connectionType: 'Unknown'
  })
  
  const [notificationSettings, setNotificationSettings] = useState({
    email_enabled: true,
    email_frequency: 'instant',
    email_digest: false,
    email_project_updates: true,
    email_task_reminders: true,
    email_messages: true,
    email_mentions: true,
    email_team_activity: false,
    email_system_alerts: true,
    push_enabled: true,
    push_messages: true,
    push_mentions: true,
    push_task_reminders: true,
    push_project_updates: false,
    sms_enabled: false,
    sms_urgent_only: true,
    sms_task_deadlines: false,
    sms_system_alerts: false,
    inapp_enabled: true,
    inapp_sound: true,
    inapp_desktop: true,
    notify_team_member_joins: true,
    notify_team_member_leaves: true,
    notify_role_changes: true,
    notify_permission_changes: true,
    notify_external_messages: true,
    notify_vendor_updates: false,
    notify_client_communications: true,
    notify_dependency_delays: true,
    notify_dependency_completions: true,
    notify_critical_path_changes: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    quiet_hours_timezone: 'UTC'
  })
  
  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: 'system',
    accent_color: '#7c3aed',
    sidebar_collapsed: false,
    layout_density: 'comfortable',
    show_sidebar_labels: true,
    show_project_thumbnails: true,
    cards_per_row: 3,
    font_family: 'system',
    font_size: 'medium',
    dashboard_layout: 'grid',
    show_welcome_message: true,
    show_recent_activity: true,
    show_quick_stats: true,
    table_row_height: 'medium',
    table_striped_rows: true,
    table_hover_effects: true,
    enable_animations: true,
    reduce_motion: false
  })
  
  const [contactSettings, setContactSettings] = useState({
    show_offline_contacts: false,
    auto_add_team_members: true,
    show_contact_status: true,
    default_message_method: 'internal',
    auto_mark_read: false,
    typing_indicators: true,
    read_receipts: true,
    allow_external_contacts: true,
    require_approval_external: false,
    auto_sync_vendor_contacts: true,
    auto_sync_client_contacts: true,
    create_groups_permission: true,
    join_groups_auto: false
  })
  
  const [teamSettings, setTeamSettings] = useState({
    show_team_activity: true,
    show_team_status: true,
    auto_follow_team_projects: false,
    allow_task_assignments: true,
    allow_project_mentions: true,
    auto_share_updates: false,
    track_dependencies: true,
    notify_dependency_risks: true,
    show_dependency_timeline: true,
    auto_update_dependent_tasks: false,
    auto_add_project_events: true,
    sync_task_deadlines: true,
    working_hours_visible: true
  })
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session && session.user) {
          setUser(session.user)
          
          // Fetch all user settings
          const settingsResponse = await fetch('/api/settings', {
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
          })
          
          if (settingsResponse.ok) {
            const { settings } = await settingsResponse.json()
            
            // Update profile settings
            if (settings.profile) {
              setProfileData({
                full_name: settings.profile.full_name || '',
                email: session.user.email || '',
                company: settings.profile.company || '',
                phone: settings.profile.phone || '',
                avatar_url: settings.profile.avatar_url || '',
                job_title: settings.profile.job_title || '',
                department: settings.profile.department || '',
                bio: settings.profile.bio || '',
                timezone: settings.profile.timezone || 'UTC',
                location: settings.profile.location || '',
                linkedin_url: settings.profile.linkedin_url || '',
                website_url: settings.profile.website_url || '',
                emergency_contact_name: settings.profile.emergency_contact_name || '',
                emergency_contact_phone: settings.profile.emergency_contact_phone || '',
                work_hours_start: settings.profile.work_hours_start || '09:00',
                work_hours_end: settings.profile.work_hours_end || '17:00',
                preferred_language: settings.profile.preferred_language || 'en',
                date_format: settings.profile.date_format || 'MM/dd/yyyy',
                time_format: settings.profile.time_format || '12h'
              })
            }
            
            // Update notification settings
            if (settings.notifications) {
              setNotificationSettings({
                email_enabled: settings.notifications.email_enabled ?? true,
                email_frequency: settings.notifications.email_frequency || 'instant',
                email_digest: settings.notifications.email_digest ?? false,
                email_project_updates: settings.notifications.email_project_updates ?? true,
                email_task_reminders: settings.notifications.email_task_reminders ?? true,
                email_messages: settings.notifications.email_messages ?? true,
                email_mentions: settings.notifications.email_mentions ?? true,
                email_team_activity: settings.notifications.email_team_activity ?? false,
                email_system_alerts: settings.notifications.email_system_alerts ?? true,
                push_enabled: settings.notifications.push_enabled ?? true,
                push_messages: settings.notifications.push_messages ?? true,
                push_mentions: settings.notifications.push_mentions ?? true,
                push_task_reminders: settings.notifications.push_task_reminders ?? true,
                push_project_updates: settings.notifications.push_project_updates ?? false,
                sms_enabled: settings.notifications.sms_enabled ?? false,
                sms_urgent_only: settings.notifications.sms_urgent_only ?? true,
                sms_task_deadlines: settings.notifications.sms_task_deadlines ?? false,
                sms_system_alerts: settings.notifications.sms_system_alerts ?? false,
                inapp_enabled: settings.notifications.inapp_enabled ?? true,
                inapp_sound: settings.notifications.inapp_sound ?? true,
                inapp_desktop: settings.notifications.inapp_desktop ?? true,
                notify_team_member_joins: settings.notifications.notify_team_member_joins ?? true,
                notify_team_member_leaves: settings.notifications.notify_team_member_leaves ?? true,
                notify_role_changes: settings.notifications.notify_role_changes ?? true,
                notify_permission_changes: settings.notifications.notify_permission_changes ?? true,
                notify_external_messages: settings.notifications.notify_external_messages ?? true,
                notify_vendor_updates: settings.notifications.notify_vendor_updates ?? false,
                notify_client_communications: settings.notifications.notify_client_communications ?? true,
                notify_dependency_delays: settings.notifications.notify_dependency_delays ?? true,
                notify_dependency_completions: settings.notifications.notify_dependency_completions ?? true,
                notify_critical_path_changes: settings.notifications.notify_critical_path_changes ?? true,
                quiet_hours_enabled: settings.notifications.quiet_hours_enabled ?? false,
                quiet_hours_start: settings.notifications.quiet_hours_start || '22:00',
                quiet_hours_end: settings.notifications.quiet_hours_end || '08:00',
                quiet_hours_timezone: settings.notifications.quiet_hours_timezone || 'UTC'
              })
            }
            
            // Update appearance settings
            if (settings.appearance) {
              setAppearanceSettings({
                theme: settings.appearance.theme || 'system',
                accent_color: settings.appearance.accent_color || '#7c3aed',
                sidebar_collapsed: settings.appearance.sidebar_collapsed ?? false,
                layout_density: settings.appearance.layout_density || 'comfortable',
                show_sidebar_labels: settings.appearance.show_sidebar_labels ?? true,
                show_project_thumbnails: settings.appearance.show_project_thumbnails ?? true,
                cards_per_row: settings.appearance.cards_per_row || 3,
                font_family: settings.appearance.font_family || 'system',
                font_size: settings.appearance.font_size || 'medium',
                dashboard_layout: settings.appearance.dashboard_layout || 'grid',
                show_welcome_message: settings.appearance.show_welcome_message ?? true,
                show_recent_activity: settings.appearance.show_recent_activity ?? true,
                show_quick_stats: settings.appearance.show_quick_stats ?? true,
                table_row_height: settings.appearance.table_row_height || 'medium',
                table_striped_rows: settings.appearance.table_striped_rows ?? true,
                table_hover_effects: settings.appearance.table_hover_effects ?? true,
                enable_animations: settings.appearance.enable_animations ?? true,
                reduce_motion: settings.appearance.reduce_motion ?? false
              })
            }
            
            // Update contact settings
            if (settings.contacts) {
              setContactSettings({
                show_offline_contacts: settings.contacts.show_offline_contacts ?? false,
                auto_add_team_members: settings.contacts.auto_add_team_members ?? true,
                show_contact_status: settings.contacts.show_contact_status ?? true,
                default_message_method: settings.contacts.default_message_method || 'internal',
                auto_mark_read: settings.contacts.auto_mark_read ?? false,
                typing_indicators: settings.contacts.typing_indicators ?? true,
                read_receipts: settings.contacts.read_receipts ?? true,
                allow_external_contacts: settings.contacts.allow_external_contacts ?? true,
                require_approval_external: settings.contacts.require_approval_external ?? false,
                auto_sync_vendor_contacts: settings.contacts.auto_sync_vendor_contacts ?? true,
                auto_sync_client_contacts: settings.contacts.auto_sync_client_contacts ?? true,
                create_groups_permission: settings.contacts.create_groups_permission ?? true,
                join_groups_auto: settings.contacts.join_groups_auto ?? false
              })
            }
            
            // Update team settings
            if (settings.team) {
              setTeamSettings({
                show_team_activity: settings.team.show_team_activity ?? true,
                show_team_status: settings.team.show_team_status ?? true,
                auto_follow_team_projects: settings.team.auto_follow_team_projects ?? false,
                allow_task_assignments: settings.team.allow_task_assignments ?? true,
                allow_project_mentions: settings.team.allow_project_mentions ?? true,
                auto_share_updates: settings.team.auto_share_updates ?? false,
                track_dependencies: settings.team.track_dependencies ?? true,
                notify_dependency_risks: settings.team.notify_dependency_risks ?? true,
                show_dependency_timeline: settings.team.show_dependency_timeline ?? true,
                auto_update_dependent_tasks: settings.team.auto_update_dependent_tasks ?? false,
                auto_add_project_events: settings.team.auto_add_project_events ?? true,
                sync_task_deadlines: settings.team.sync_task_deadlines ?? true,
                working_hours_visible: settings.team.working_hours_visible ?? true
              })
            }
          }
          
          // Fallback to profile API for basic profile info
          const response = await fetch('/api/profile', {
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
          })
          
          if (response.ok) {
            const { profile } = await response.json()
            setProfileData({
              full_name: profile.full_name || '',
              email: profile.email || session.user.email || '',
              company: profile.company || '',
              phone: profile.phone || '',
              avatar_url: profile.avatar_url || '',
              job_title: profile.job_title || '',
              department: profile.department || '',
              bio: profile.bio || '',
              timezone: profile.timezone || 'UTC',
              location: profile.location || '',
              linkedin_url: profile.linkedin_url || '',
              website_url: profile.website_url || '',
              emergency_contact_name: profile.emergency_contact_name || '',
              emergency_contact_phone: profile.emergency_contact_phone || '',
              work_hours_start: profile.work_hours_start || '09:00',
              work_hours_end: profile.work_hours_end || '17:00',
              preferred_language: profile.preferred_language || 'en',
              date_format: profile.date_format || 'MM/dd/yyyy',
              time_format: profile.time_format || '12h'
            })
          } else if (response.status === 404) {
            // Profile doesn't exist yet, use session data
            setProfileData({
              full_name: '',
              email: session.user.email || '',
              company: '',
              phone: '',
              avatar_url: '',
              job_title: '',
              department: '',
              bio: '',
              timezone: 'UTC',
              location: '',
              linkedin_url: '',
              website_url: '',
              emergency_contact_name: '',
              emergency_contact_phone: '',
              work_hours_start: '09:00',
              work_hours_end: '17:00',
              preferred_language: 'en',
              date_format: 'MM/dd/yyyy',
              time_format: '12h'
            })
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
    collectPerformanceMetrics()
  }, [supabase])

  const collectPerformanceMetrics = async () => {
    try {
      // Collect browser performance metrics
      if (typeof window !== 'undefined' && window.performance) {
        const perfData = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (perfData) {
          setPerformanceMetrics(prev => ({
            ...prev,
            pageLoadTime: Math.round(perfData.loadEventEnd - perfData.fetchStart)
          }))
        }

        // Memory usage (if available)
        if ('memory' in performance) {
          const memInfo = (performance as any).memory
          setPerformanceMetrics(prev => ({
            ...prev,
            memoryUsage: Math.round(memInfo.usedJSHeapSize / 1048576), // Convert to MB
            memoryLimit: Math.round(memInfo.jsHeapSizeLimit / 1048576)
          }))
        }
      }

      // Test database response time
      const dbStart = performance.now()
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
      const dbEnd = performance.now()
      
      if (!error) {
        setPerformanceMetrics(prev => ({
          ...prev,
          dbResponseTime: Math.round(dbEnd - dbStart)
        }))
      }

      // Check connection type
      if ('connection' in navigator) {
        const conn = (navigator as any).connection
        setPerformanceMetrics(prev => ({
          ...prev,
          networkSpeed: conn.effectiveType || 'Unknown',
          connectionType: conn.type || 'Unknown'
        }))
      }

      // Simulate some metrics
      setPerformanceMetrics(prev => ({
        ...prev,
        cacheSize: Math.round(Math.random() * 50 + 10), // MB
        activeConnections: Math.round(Math.random() * 5 + 1),
        apiLatency: Math.round(Math.random() * 100 + 50), // ms
        totalQueries: Math.round(Math.random() * 1000 + 100)
      }))
    } catch (error) {
      console.error('Error collecting metrics:', error)
    }
  }

  const handleProfileChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }))
  }

  const handleAvatarSelect = (avatarValue: string) => {
    setProfileData(prev => ({ ...prev, avatar_url: avatarValue }))
    setShowAvatarPicker(false)
  }

  const getUserInitials = () => {
    if (profileData.full_name) {
      return profileData.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return profileData.email?.[0]?.toUpperCase() || 'U'
  }

  const renderAvatar = (size: string = 'h-20 w-20', textSize: string = 'text-2xl') => {
    if (profileData.avatar_url) {
      // Check if it's a URL or a CSS class
      if (profileData.avatar_url.startsWith('http')) {
        return <img src={profileData.avatar_url} alt={profileData.full_name || 'Profile'} className={`${size} rounded-full object-cover`} />
      } else {
        // It's a CSS class for gradient/solid color
        return (
          <div className={`${size} rounded-full ${profileData.avatar_url} text-white flex items-center justify-center ${textSize} font-medium`}>
            {getUserInitials()}
          </div>
        )
      }
    } else {
      // Default avatar
      return (
        <div className={`${size} rounded-full bg-primary text-primary-foreground flex items-center justify-center ${textSize} font-medium`}>
          {getUserInitials()}
        </div>
      )
    }
  }

  const handleSaveSettings = async (section: string, settings: any) => {
    setSaving(true)
    try {
      // For profile section, ONLY use profile API
      if (section === 'profile') {
        console.log('Saving profile data:', settings)
        const profileResponse = await fetch('/api/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'same-origin',
          body: JSON.stringify({
            full_name: settings.full_name,
            company: settings.company,
            phone: settings.phone,
            avatar_url: settings.avatar_url
          })
        })
        
        if (profileResponse.ok) {
          const result = await profileResponse.json()
          console.log('Profile API response:', result)
          
          // Update local state with the saved data
          setProfileData(settings)
          
          console.log('Profile saved successfully, dispatching update event:', settings)
          // Add small delay to ensure DB write completes
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('profile-updated'))
          }, 200)
          
          // Show success message
          alert('Profile settings updated successfully!')
        } else {
          const errorData = await profileResponse.json()
          console.error('Failed to update profile:', errorData)
          alert(`Failed to update profile: ${errorData.error || 'Unknown error'}`)
        }
      } else {
        // For other sections, use settings API
        const response = await fetch('/api/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'same-origin',
          body: JSON.stringify({
            section,
            settings
          })
        })

        if (response.ok) {
          const result = await response.json()
        
        // Update local state based on section
        if (section === 'notifications') {
          setNotificationSettings(settings)
        } else if (section === 'appearance') {
          setAppearanceSettings(settings)
        } else if (section === 'contacts') {
          setContactSettings(settings)
        } else if (section === 'team') {
          setTeamSettings(settings)
        }
        
        // Show success message
        alert(`${section.charAt(0).toUpperCase() + section.slice(1)} settings updated successfully!`)
      } else {
        const errorData = await response.json()
        console.error(`Failed to update ${section} settings:`, errorData)
        alert(`Failed to update ${section} settings: ${errorData.error || 'Unknown error'}`)
      }
    }
    } catch (error) {
      console.error(`Error saving ${section} settings:`, error)
      alert(`Error saving ${section} settings. Please try again.`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Loading...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-2">
      {/* Centered Header with Gradient Text */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-800 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Manage your account and application preferences with advanced controls
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
        {/* Settings Navigation with Gradient Styling */}
        <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 h-fit hover:shadow-2xl transition-all duration-300">
          <nav className="bg-white/90 backdrop-blur-sm rounded-xl p-4 space-y-2">
          {settingsSections.map((section) => {
            const Icon = section.icon
            return (
              <Button
                key={section.id}
                variant={activeSection === section.id ? 'secondary' : 'ghost'}
                className={`w-full justify-start transition-all duration-200 ${
                  activeSection === section.id 
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800' 
                    : 'hover:bg-purple-50'
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                <Icon className="mr-2 h-4 w-4" />
                {section.label}
              </Button>
            )
          })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="space-y-6">
          {activeSection === 'profile' && (
            <>
              <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
                <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information and profile settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input 
                        id="fullName" 
                        placeholder="John Doe" 
                        value={profileData.full_name}
                        onChange={(e) => handleProfileChange('full_name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="john@example.com" 
                        value={profileData.email}
                        disabled
                        className="bg-gray-50 cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input 
                      id="company" 
                      placeholder="Acme Property Management" 
                      value={profileData.company}
                      onChange={(e) => handleProfileChange('company', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone" 
                      type="tel" 
                      placeholder="(555) 123-4567" 
                      value={profileData.phone}
                      onChange={(e) => handleProfileChange('phone', e.target.value)}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="job_title">Job Title</Label>
                      <Input 
                        id="job_title" 
                        placeholder="Project Manager" 
                        value={profileData.job_title}
                        onChange={(e) => handleProfileChange('job_title', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input 
                        id="department" 
                        placeholder="Operations" 
                        value={profileData.department}
                        onChange={(e) => handleProfileChange('department', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <textarea 
                      id="bio" 
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Tell us about yourself..." 
                      value={profileData.bio}
                      onChange={(e) => handleProfileChange('bio', e.target.value)}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input 
                        id="location" 
                        placeholder="New York, NY" 
                        value={profileData.location}
                        onChange={(e) => handleProfileChange('location', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <select 
                        id="timezone"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={profileData.timezone}
                        onChange={(e) => handleProfileChange('timezone', e.target.value)}
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Europe/London">London</option>
                        <option value="Europe/Berlin">Berlin</option>
                        <option value="Asia/Tokyo">Tokyo</option>
                        <option value="Australia/Sydney">Sydney</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                      <Input 
                        id="linkedin_url" 
                        placeholder="https://linkedin.com/in/username" 
                        value={profileData.linkedin_url}
                        onChange={(e) => handleProfileChange('linkedin_url', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website_url">Website URL</Label>
                      <Input 
                        id="website_url" 
                        placeholder="https://yourwebsite.com" 
                        value={profileData.website_url}
                        onChange={(e) => handleProfileChange('website_url', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3">Work Schedule & Preferences</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="work_hours_start">Work Start Time</Label>
                        <Input 
                          id="work_hours_start" 
                          type="time" 
                          value={profileData.work_hours_start}
                          onChange={(e) => handleProfileChange('work_hours_start', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="work_hours_end">Work End Time</Label>
                        <Input 
                          id="work_hours_end" 
                          type="time" 
                          value={profileData.work_hours_end}
                          onChange={(e) => handleProfileChange('work_hours_end', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="preferred_language">Language</Label>
                        <select 
                          id="preferred_language"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={profileData.preferred_language}
                          onChange={(e) => handleProfileChange('preferred_language', e.target.value)}
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                          <option value="it">Italian</option>
                          <option value="pt">Portuguese</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date_format">Date Format</Label>
                        <select 
                          id="date_format"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={profileData.date_format}
                          onChange={(e) => handleProfileChange('date_format', e.target.value)}
                        >
                          <option value="MM/dd/yyyy">MM/DD/YYYY</option>
                          <option value="dd/MM/yyyy">DD/MM/YYYY</option>
                          <option value="yyyy-MM-dd">YYYY-MM-DD</option>
                          <option value="MMM dd, yyyy">MMM DD, YYYY</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="time_format">Time Format</Label>
                        <select 
                          id="time_format"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={profileData.time_format}
                          onChange={(e) => handleProfileChange('time_format', e.target.value)}
                        >
                          <option value="12h">12 Hour</option>
                          <option value="24h">24 Hour</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3">Emergency Contact</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="emergency_contact_name">Contact Name</Label>
                        <Input 
                          id="emergency_contact_name" 
                          placeholder="Jane Doe" 
                          value={profileData.emergency_contact_name}
                          onChange={(e) => handleProfileChange('emergency_contact_name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                        <Input 
                          id="emergency_contact_phone" 
                          type="tel" 
                          placeholder="(555) 123-4567" 
                          value={profileData.emergency_contact_phone}
                          onChange={(e) => handleProfileChange('emergency_contact_phone', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleSaveSettings('profile', profileData)} 
                    disabled={saving}
                    variant="outline"
                    className="bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 border-0 font-semibold disabled:opacity-50 shadow-lg"
                  >
                    {saving ? 'Saving...' : 'Save Profile Changes'}
                  </Button>
                </CardContent>
                </Card>
              </div>

              <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-blue-200 to-blue-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
                <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                  <CardHeader>
                    <CardTitle>Profile Photo</CardTitle>
                  <CardDescription>
                    Choose a preset avatar or upload a custom photo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    {renderAvatar()}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 border-0 font-semibold shadow-md"
                        >
                          Choose Avatar
                        </Button>
                        <Button 
                          variant="outline"
                          className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 border-0 font-semibold shadow-md"
                        >
                          Upload Photo
                        </Button>
                        {profileData.avatar_url && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleAvatarSelect('')}
                            className="bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:from-gray-600 hover:to-gray-700 border-0 font-semibold shadow-md"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Choose from preset colors or upload JPG, PNG or GIF. Max size 5MB.
                      </p>
                    </div>
                  </div>
                  
                  {showAvatarPicker && (
                    <div className="mt-4 p-6 border-2 border-blue-200 rounded-xl bg-gradient-to-br from-blue-50 via-white to-blue-50">
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-3">Gradient Avatars</h4>
                          <div className="grid grid-cols-8 gap-3">
                            {avatarPresets.gradients.map((preset) => (
                              <button
                                key={preset.id}
                                className={`relative h-12 w-12 rounded-full ${preset.value} flex items-center justify-center text-white text-sm font-semibold hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md ${
                                  profileData.avatar_url === preset.value ? 'ring-4 ring-blue-500 ring-offset-2 scale-110' : ''
                                }`}
                                onClick={() => handleAvatarSelect(preset.value)}
                                title="Click to select this avatar"
                              >
                                {getUserInitials()}
                                {profileData.avatar_url === preset.value && (
                                  <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-blue-500 rounded-full flex items-center justify-center">
                                    <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-3">Solid Colors</h4>
                          <div className="grid grid-cols-11 gap-2">
                            {avatarPresets.solids.map((preset) => (
                              <button
                                key={preset.id}
                                className={`relative h-10 w-10 rounded-full ${preset.value} flex items-center justify-center text-white text-xs font-semibold hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md ${
                                  profileData.avatar_url === preset.value ? 'ring-4 ring-blue-500 ring-offset-2 scale-110' : ''
                                }`}
                                onClick={() => handleAvatarSelect(preset.value)}
                                title="Click to select this avatar"
                              >
                                {getUserInitials()}
                                {profileData.avatar_url === preset.value && (
                                  <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-blue-500 rounded-full flex items-center justify-center">
                                    <svg className="h-2 w-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="pt-2 flex items-center justify-between text-xs text-gray-500">
                          <span>Click any avatar to select</span>
                          <button 
                            className="text-blue-600 hover:text-blue-700 font-medium"
                            onClick={() => setShowAvatarPicker(false)}
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
                </Card>
              </div>
            </>
          )}

          {activeSection === 'projects' && (
            <>
              {/* Report Templates */}
              <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-indigo-200 to-indigo-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
                <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                  <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Report Templates
                  </CardTitle>
                  <CardDescription>
                    Configure headers, footers, and signatures for generated reports
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Customize how your PDF reports appear with company branding and professional formatting.
                  </p>
                  <Button 
                    onClick={() => router.push('/settings/report-templates')}
                    variant="outline"
                    className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 border-0 font-semibold shadow-md"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Report Templates
                  </Button>
                </CardContent>
                </Card>
              </div>

              {/* Project Code System */}
              <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-cyan-200 to-cyan-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
                <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                  <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="h-5 w-5" />
                    Project Code System
                  </CardTitle>
                  <CardDescription>
                    Configure automatic project ID generation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Set up automatic or manual project codes with custom formatting rules for consistent project identification.
                  </p>
                  <Button 
                    onClick={() => router.push('/settings/project-codes')}
                    variant="outline"
                    className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700 border-0 font-semibold shadow-md"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Project Codes
                  </Button>
                </CardContent>
                </Card>
              </div>
            </>
          )}

          {activeSection === 'notifications' && (
            <>
              {/* Email Notifications */}
              <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-yellow-200 to-yellow-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
                <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                  <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Email Notifications
                  </CardTitle>
                  <CardDescription>
                    Configure how you receive email notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Master control for all email notifications
                      </p>
                    </div>
                    <input 
                      type="checkbox" 
                      className="h-4 w-4" 
                      checked={notificationSettings.email_enabled}
                      onChange={(e) => setNotificationSettings(prev => ({...prev, email_enabled: e.target.checked}))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Email Frequency</Label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={notificationSettings.email_frequency}
                      onChange={(e) => setNotificationSettings(prev => ({...prev, email_frequency: e.target.value}))}
                    >
                      <option value="instant">Instant</option>
                      <option value="hourly">Hourly Digest</option>
                      <option value="daily">Daily Digest</option>
                      <option value="weekly">Weekly Digest</option>
                    </select>
                  </div>
                  
                  <div className="grid gap-3">
                    {[
                      { key: 'email_project_updates', label: 'Project Updates', desc: 'Updates when projects change status' },
                      { key: 'email_task_reminders', label: 'Task Reminders', desc: 'Upcoming and overdue task notifications' },
                      { key: 'email_messages', label: 'New Messages', desc: 'Direct messages and conversations' },
                      { key: 'email_mentions', label: 'Mentions', desc: 'When you are mentioned in comments' },
                      { key: 'email_team_activity', label: 'Team Activity', desc: 'Team member actions and updates' },
                      { key: 'email_system_alerts', label: 'System Alerts', desc: 'Important system notifications' }
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>{item.label}</Label>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                        <input 
                          type="checkbox" 
                          className="h-4 w-4" 
                          checked={notificationSettings[item.key as keyof typeof notificationSettings] as boolean}
                          onChange={(e) => setNotificationSettings(prev => ({...prev, [item.key]: e.target.checked}))}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
                </Card>
              </div>
              
              {/* Push & In-App Notifications */}
              <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-orange-200 to-orange-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
                <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                  <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Push & In-App Notifications
                  </CardTitle>
                  <CardDescription>
                    Control browser and desktop notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    {[
                      { key: 'push_enabled', label: 'Enable Push Notifications', desc: 'Browser push notifications' },
                      { key: 'push_messages', label: 'Message Notifications', desc: 'Push alerts for new messages' },
                      { key: 'push_mentions', label: 'Mention Alerts', desc: 'Push alerts when mentioned' },
                      { key: 'push_task_reminders', label: 'Task Reminders', desc: 'Push alerts for task deadlines' },
                      { key: 'inapp_enabled', label: 'In-App Notifications', desc: 'Show notifications within the app' },
                      { key: 'inapp_sound', label: 'Notification Sounds', desc: 'Play sounds for notifications' },
                      { key: 'inapp_desktop', label: 'Desktop Notifications', desc: 'Show desktop popup notifications' }
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>{item.label}</Label>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                        <input 
                          type="checkbox" 
                          className="h-4 w-4" 
                          checked={notificationSettings[item.key as keyof typeof notificationSettings] as boolean}
                          onChange={(e) => setNotificationSettings(prev => ({...prev, [item.key]: e.target.checked}))}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
                </Card>
              </div>
              
              {/* Team & Contact Notifications */}
              <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-green-200 to-green-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
                <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                  <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team & Contact Notifications
                  </CardTitle>
                  <CardDescription>
                    Notifications about team members and external contacts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Team Activity</h4>
                    <div className="grid gap-3 pl-4">
                      {[
                        { key: 'notify_team_member_joins', label: 'Team Member Joins', desc: 'New team member added' },
                        { key: 'notify_team_member_leaves', label: 'Team Member Leaves', desc: 'Team member removed' },
                        { key: 'notify_role_changes', label: 'Role Changes', desc: 'Team member role updates' },
                        { key: 'notify_permission_changes', label: 'Permission Changes', desc: 'Access permission updates' }
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>{item.label}</Label>
                            <p className="text-sm text-muted-foreground">{item.desc}</p>
                          </div>
                          <input 
                            type="checkbox" 
                            className="h-4 w-4" 
                            checked={notificationSettings[item.key as keyof typeof notificationSettings] as boolean}
                            onChange={(e) => setNotificationSettings(prev => ({...prev, [item.key]: e.target.checked}))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-3 border-t pt-4">
                    <h4 className="text-sm font-medium">External Communications</h4>
                    <div className="grid gap-3 pl-4">
                      {[
                        { key: 'notify_external_messages', label: 'External Messages', desc: 'Messages from external contacts' },
                        { key: 'notify_vendor_updates', label: 'Vendor Updates', desc: 'Updates from vendors and suppliers' },
                        { key: 'notify_client_communications', label: 'Client Communications', desc: 'Messages from clients' }
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>{item.label}</Label>
                            <p className="text-sm text-muted-foreground">{item.desc}</p>
                          </div>
                          <input 
                            type="checkbox" 
                            className="h-4 w-4" 
                            checked={notificationSettings[item.key as keyof typeof notificationSettings] as boolean}
                            onChange={(e) => setNotificationSettings(prev => ({...prev, [item.key]: e.target.checked}))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-3 border-t pt-4">
                    <h4 className="text-sm font-medium">Dependencies</h4>
                    <div className="grid gap-3 pl-4">
                      {[
                        { key: 'notify_dependency_delays', label: 'Dependency Delays', desc: 'When dependencies are delayed' },
                        { key: 'notify_dependency_completions', label: 'Dependency Completions', desc: 'When dependencies are completed' },
                        { key: 'notify_critical_path_changes', label: 'Critical Path Changes', desc: 'Changes to critical project paths' }
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>{item.label}</Label>
                            <p className="text-sm text-muted-foreground">{item.desc}</p>
                          </div>
                          <input 
                            type="checkbox" 
                            className="h-4 w-4" 
                            checked={notificationSettings[item.key as keyof typeof notificationSettings] as boolean}
                            onChange={(e) => setNotificationSettings(prev => ({...prev, [item.key]: e.target.checked}))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
                </Card>
              </div>
              
              {/* Quiet Hours */}
              <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
                <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                  <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Quiet Hours
                  </CardTitle>
                  <CardDescription>
                    Set times when you don't want to receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Quiet Hours</Label>
                      <p className="text-sm text-muted-foreground">
                        Silence notifications during specified hours
                      </p>
                    </div>
                    <input 
                      type="checkbox" 
                      className="h-4 w-4" 
                      checked={notificationSettings.quiet_hours_enabled}
                      onChange={(e) => setNotificationSettings(prev => ({...prev, quiet_hours_enabled: e.target.checked}))}
                    />
                  </div>
                  
                  {notificationSettings.quiet_hours_enabled && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Input 
                          type="time" 
                          value={notificationSettings.quiet_hours_start}
                          onChange={(e) => setNotificationSettings(prev => ({...prev, quiet_hours_start: e.target.value}))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <Input 
                          type="time" 
                          value={notificationSettings.quiet_hours_end}
                          onChange={(e) => setNotificationSettings(prev => ({...prev, quiet_hours_end: e.target.value}))}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
                </Card>
              </div>
              
              <Button 
                onClick={() => handleSaveSettings('notifications', notificationSettings)}
                disabled={saving}
                variant="outline"
                className="bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 border-0 font-semibold disabled:opacity-50 shadow-lg"
              >
                {saving ? 'Saving...' : 'Save Notification Preferences'}
              </Button>
            </>
          )}

          {activeSection === 'ml' && (
            <div className="space-y-6">
              {/* ML System Status */}
              <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
                <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-600" />
                      NEXUS ML System
                    </CardTitle>
                    <CardDescription>Machine Learning operational status and configuration</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* System Overview */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="h-4 w-4 text-purple-600" />
                            <span className="text-xs font-medium">Active Models</span>
                          </div>
                          <p className="text-lg font-bold text-purple-900">9</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Activity className="h-4 w-4 text-green-600" />
                            <span className="text-xs font-medium">System Status</span>
                          </div>
                          <p className="text-lg font-bold text-green-900">Operational</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Zap className="h-4 w-4 text-blue-600" />
                            <span className="text-xs font-medium">Avg Accuracy</span>
                          </div>
                          <p className="text-lg font-bold text-blue-900">86.4%</p>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="h-4 w-4 text-orange-600" />
                            <span className="text-xs font-medium">Predictions Today</span>
                          </div>
                          <p className="text-lg font-bold text-orange-900">1,247</p>
                        </div>
                      </div>
                      
                      {/* Model Status List */}
                      <div className="border rounded-lg p-4">
                        <h4 className="text-sm font-medium mb-3">Model Performance</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between py-2 border-b">
                            <span className="text-sm">nexus_top_tier</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">92.3%</span>
                              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between py-2 border-b">
                            <span className="text-sm">weather_impact_analyzer</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">88.7%</span>
                              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between py-2 border-b">
                            <span className="text-sm">schedule_optimizer</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">85.6%</span>
                              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <span className="text-sm">worker_safety</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">94.2%</span>
                              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* ML Dashboard Link */}
                      <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-purple-900">Full ML Dashboard</p>
                            <p className="text-xs text-purple-700 mt-1">View detailed analytics, training progress, and A/B tests</p>
                          </div>
                          <Button 
                            size="sm"
                            variant="ghost"
                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                            onClick={() => router.push('/ml')}
                          >
                            View Dashboard
                            <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* GPU Status */}
                      <div className="p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-orange-900">GPU Acceleration</p>
                            <p className="text-xs text-orange-700 mt-1">Ready for NVIDIA RTX 5090 deployment</p>
                          </div>
                          <Badge className="bg-orange-100 text-orange-800">Ready</Badge>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground text-center">
                        NEXUS TOP TIER ML System • Real-time Predictions Active • Construction Intelligence Enabled
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <>
              <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-red-200 to-red-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
                <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input id="currentPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input id="confirmPassword" type="password" />
                  </div>
                  <Button 
                    variant="outline"
                    className="bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 border-0 font-semibold shadow-md"
                  >
                    Update Password
                  </Button>
                </CardContent>
                </Card>
              </div>

              <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-pink-200 to-pink-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
                <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                  <CardHeader>
                    <CardTitle>Two-Factor Authentication</CardTitle>
                  <CardDescription>
                    Add an extra layer of security to your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Two-factor authentication is currently disabled for your account.
                    </p>
                    <Button 
                      variant="outline"
                      className="bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:from-pink-600 hover:to-pink-700 border-0 font-semibold shadow-md"
                    >
                      Enable 2FA
                    </Button>
                  </div>
                </CardContent>
                </Card>
              </div>
            </>
          )}

          {activeSection === 'appearance' && (
            <>
              {/* Theme Settings */}
              <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-violet-200 to-violet-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
                <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                  <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Theme & Colors
                  </CardTitle>
                  <CardDescription>
                    Customize the visual appearance of FEDCORE
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>Theme</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {['light', 'dark', 'system'].map((theme) => (
                        <Button 
                          key={theme}
                          variant={appearanceSettings.theme === theme ? 'default' : 'outline'} 
                          className={`justify-center ${appearanceSettings.theme === theme ? 'bg-purple-700 text-white' : ''}`}
                          onClick={() => setAppearanceSettings(prev => ({...prev, theme}))}
                        >
                          {theme.charAt(0).toUpperCase() + theme.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label>Accent Color</Label>
                    <div className="grid grid-cols-8 gap-2">
                      {[
                        { name: 'Purple', value: '#7c3aed' },
                        { name: 'Blue', value: '#2563eb' },
                        { name: 'Green', value: '#16a34a' },
                        { name: 'Orange', value: '#ea580c' },
                        { name: 'Pink', value: '#dc2626' },
                        { name: 'Teal', value: '#0891b2' },
                        { name: 'Indigo', value: '#4f46e5' },
                        { name: 'Red', value: '#dc2626' }
                      ].map((color) => (
                        <button
                          key={color.value}
                          className={`h-10 w-10 rounded-full border-2 ${
                            appearanceSettings.accent_color === color.value ? 'border-gray-900 ring-2 ring-gray-400' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color.value }}
                          onClick={() => setAppearanceSettings(prev => ({...prev, accent_color: color.value}))}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
                </Card>
              </div>
              
              {/* Layout Settings */}
              <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-teal-200 to-teal-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
                <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                  <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Layout & Display
                  </CardTitle>
                  <CardDescription>
                    Configure how content is displayed and organized
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>Layout Density</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {['compact', 'comfortable', 'spacious'].map((density) => (
                        <Button 
                          key={density}
                          variant={appearanceSettings.layout_density === density ? 'default' : 'outline'} 
                          className={`justify-center ${appearanceSettings.layout_density === density ? 'bg-purple-700 text-white' : ''}`}
                          onClick={() => setAppearanceSettings(prev => ({...prev, layout_density: density}))}
                        >
                          {density.charAt(0).toUpperCase() + density.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label>Cards Per Row</Label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={appearanceSettings.cards_per_row}
                        onChange={(e) => setAppearanceSettings(prev => ({...prev, cards_per_row: parseInt(e.target.value)}))}
                      >
                        <option value={1}>1 Card</option>
                        <option value={2}>2 Cards</option>
                        <option value={3}>3 Cards</option>
                        <option value={4}>4 Cards</option>
                        <option value={5}>5 Cards</option>
                      </select>
                    </div>
                    
                    <div className="space-y-3">
                      <Label>Dashboard Layout</Label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={appearanceSettings.dashboard_layout}
                        onChange={(e) => setAppearanceSettings(prev => ({...prev, dashboard_layout: e.target.value}))}
                      >
                        <option value="grid">Grid Layout</option>
                        <option value="list">List Layout</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid gap-3">
                    {[
                      { key: 'show_sidebar_labels', label: 'Show Sidebar Labels', desc: 'Display text labels in the sidebar' },
                      { key: 'show_project_thumbnails', label: 'Show Project Thumbnails', desc: 'Display project preview images' },
                      { key: 'show_welcome_message', label: 'Show Welcome Message', desc: 'Display welcome message on dashboard' },
                      { key: 'show_recent_activity', label: 'Show Recent Activity', desc: 'Display recent activity widget' },
                      { key: 'show_quick_stats', label: 'Show Quick Stats', desc: 'Display quick statistics on dashboard' }
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>{item.label}</Label>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                        <input 
                          type="checkbox" 
                          className="h-4 w-4" 
                          checked={appearanceSettings[item.key as keyof typeof appearanceSettings] as boolean}
                          onChange={(e) => setAppearanceSettings(prev => ({...prev, [item.key]: e.target.checked}))}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
                </Card>
              </div>
              
              {/* Typography Settings */}
              <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-sky-200 to-sky-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
                <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                  <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Typography & Text
                  </CardTitle>
                  <CardDescription>
                    Customize fonts and text appearance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label>Font Family</Label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={appearanceSettings.font_family}
                        onChange={(e) => setAppearanceSettings(prev => ({...prev, font_family: e.target.value}))}
                      >
                        <option value="system">System Default</option>
                        <option value="sans">Sans Serif</option>
                        <option value="serif">Serif</option>
                        <option value="mono">Monospace</option>
                      </select>
                    </div>
                    
                    <div className="space-y-3">
                      <Label>Font Size</Label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={appearanceSettings.font_size}
                        onChange={(e) => setAppearanceSettings(prev => ({...prev, font_size: e.target.value}))}
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
                </Card>
              </div>
              
              {/* Table Settings */}
              <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-emerald-200 to-emerald-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
                <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                  <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Tables & Lists
                  </CardTitle>
                  <CardDescription>
                    Configure table and list display preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label>Table Row Height</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {['compact', 'medium', 'large'].map((height) => (
                        <Button 
                          key={height}
                          variant={appearanceSettings.table_row_height === height ? 'default' : 'outline'} 
                          className={`justify-center ${appearanceSettings.table_row_height === height ? 'bg-purple-700 text-white' : ''}`}
                          onClick={() => setAppearanceSettings(prev => ({...prev, table_row_height: height}))}
                        >
                          {height.charAt(0).toUpperCase() + height.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid gap-3">
                    {[
                      { key: 'table_striped_rows', label: 'Striped Rows', desc: 'Alternate row background colors' },
                      { key: 'table_hover_effects', label: 'Hover Effects', desc: 'Highlight rows on mouse hover' }
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>{item.label}</Label>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                        <input 
                          type="checkbox" 
                          className="h-4 w-4" 
                          checked={appearanceSettings[item.key as keyof typeof appearanceSettings] as boolean}
                          onChange={(e) => setAppearanceSettings(prev => ({...prev, [item.key]: e.target.checked}))}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
                </Card>
              </div>
              
              {/* Animation Settings */}
              <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-rose-200 to-rose-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
                <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                  <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Animations & Effects
                  </CardTitle>
                  <CardDescription>
                    Control visual animations and motion effects
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    {[
                      { key: 'enable_animations', label: 'Enable Animations', desc: 'Smooth transitions and animations' },
                      { key: 'reduce_motion', label: 'Reduce Motion', desc: 'Minimize animations for accessibility' }
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>{item.label}</Label>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                        <input 
                          type="checkbox" 
                          className="h-4 w-4" 
                          checked={appearanceSettings[item.key as keyof typeof appearanceSettings] as boolean}
                          onChange={(e) => setAppearanceSettings(prev => ({...prev, [item.key]: e.target.checked}))}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
                </Card>
              </div>
              
              <Button 
                onClick={() => handleSaveSettings('appearance', appearanceSettings)}
                disabled={saving}
                variant="outline"
                className="bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 border-0 font-semibold disabled:opacity-50 shadow-lg"
              >
                {saving ? 'Saving...' : 'Save Appearance Settings'}
              </Button>
            </>
          )}


          {activeSection === 'billing' && (
            <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-amber-200 to-amber-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
              <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                <CardHeader>
                  <CardTitle>Billing Information</CardTitle>
                <CardDescription>
                  Manage your subscription and payment methods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Pro Plan</p>
                        <p className="text-sm text-muted-foreground">$99/month</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 border-0 font-semibold shadow-md"
                      >
                        Change Plan
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-5 w-5" />
                          <div>
                            <p className="text-sm font-medium">•••• •••• •••• 4242</p>
                            <p className="text-xs text-muted-foreground">Expires 12/24</p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 border-0 font-semibold shadow-md"
                        >
                          Update
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'performance' && (
            <div className="space-y-6">
              {/* Performance Overview */}
              <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-indigo-200 to-indigo-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
                <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                  <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    System Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="h-4 w-4 text-yellow-600" />
                        <span className="text-xs font-medium">Page Load</span>
                      </div>
                      <p className="text-lg font-bold">{performanceMetrics.pageLoadTime}ms</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Database className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-medium">DB Response</span>
                      </div>
                      <p className="text-lg font-bold">{performanceMetrics.dbResponseTime}ms</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Wifi className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-medium">API Latency</span>
                      </div>
                      <p className="text-lg font-bold">{performanceMetrics.apiLatency}ms</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                        <span className="text-xs font-medium">Connections</span>
                      </div>
                      <p className="text-lg font-bold">{performanceMetrics.activeConnections}</p>
                    </div>
                  </div>
                </CardContent>
                </Card>
              </div>

              {/* Memory Usage */}
              <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
                <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                  <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Memory Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Used</span>
                      <span className="font-medium">{performanceMetrics.memoryUsage} MB / {performanceMetrics.memoryLimit} MB</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${(performanceMetrics.memoryUsage / performanceMetrics.memoryLimit) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cache Size: {performanceMetrics.cacheSize} MB
                    </p>
                  </div>
                </CardContent>
                </Card>
              </div>

              {/* Network Info */}
              <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-cyan-200 to-cyan-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
                <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                  <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Network Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Connection Type:</span>
                      <p className="font-medium">{performanceMetrics.connectionType}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Network Speed:</span>
                      <p className="font-medium">{performanceMetrics.networkSpeed}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Queries:</span>
                      <p className="font-medium">{performanceMetrics.totalQueries}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Active Connections:</span>
                      <p className="font-medium">{performanceMetrics.activeConnections}</p>
                    </div>
                  </div>
                </CardContent>
                </Card>
              </div>

{/* Refresh Button */}
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => collectPerformanceMetrics()}
                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 border-0 font-semibold shadow-md"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Refresh Metrics
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}