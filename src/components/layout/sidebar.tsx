"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  LayoutDashboard, 
  FolderKanban, 
  CheckSquare, 
  FileText, 
  Calendar, 
  Users, 
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Map,
  FileEdit,
  BarChart3,
  Activity,
  Shield,
  ChevronDown,
  Brain,
  LogOut,
  Building,
  CreditCard,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface NavItem {
  title: string
  href?: string
  icon: React.ReactNode
  children?: NavItem[]
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />
  },
  {
    title: 'Projects',
    href: '/projects',
    icon: <FolderKanban className="h-5 w-5" />
  },
  {
    title: 'Tasks',
    href: '/tasks',
    icon: <CheckSquare className="h-5 w-5" />
  },
  {
    title: 'Calendar',
    href: '/calendar',
    icon: <Calendar className="h-5 w-5" />
  },
  {
    title: 'Contacts',
    href: '/contacts',
    icon: <Users className="h-5 w-5" />
  },
  {
    title: 'Map View',
    href: '/map',
    icon: <Map className="h-5 w-5" />
  },
  {
    title: 'Update Log',
    href: '/updates',
    icon: <FileEdit className="h-5 w-5" />
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: <BarChart3 className="h-5 w-5" />
  },
  {
    title: 'Organization',
    icon: <Building className="h-5 w-5" />,
    children: [
      {
        title: 'Team',
        href: '/organization/team',
        icon: <Users className="h-5 w-5" />
      },
      {
        title: 'Messages',
        href: '/messages',
        icon: <MessageSquare className="h-5 w-5" />
      },
      {
        title: 'Billing',
        href: '/organization/billing',
        icon: <CreditCard className="h-5 w-5" />
      }
    ]
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: <Settings className="h-5 w-5" />
  },
  {
    title: 'Performance',
    href: '/performance',
    icon: <Activity className="h-5 w-5" />
  },
  {
    title: 'Security',
    href: '/security',
    icon: <Shield className="h-5 w-5" />
  },
  {
    title: 'Architecture Analysis',
    href: '/architecture-analysis',
    icon: <Brain className="h-5 w-5" />
  },
  {
    title: 'ML Dashboard',
    href: '/ml',
    icon: <Sparkles className="h-5 w-5" />
  }
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>(['Performance'])
  const [userProfile, setUserProfile] = useState<{
    full_name: string
    email: string
    initials: string
    avatar_url?: string
    timestamp?: number
  } | null>(null)
  const [projectStats, setProjectStats] = useState({
    activeProjects: 0,
    pendingTasks: 0
  })

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Always fetch fresh data from profiles table
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name, email, company, phone, avatar_url')
            .eq('id', user.id)
            .single()
          
          console.log('Fetched profile from database:', profile, 'Error:', error)
          
          // If profile exists, use it - otherwise use defaults
          if (profile && !error) {
            const email = profile.email || user.email || ''
            const fullName = profile.full_name || email.split('@')[0] || 'User'
            
            // Generate initials from full name
            const initials = fullName
              .split(/\s+/)
              .filter(part => part.length > 0)
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'U'
            
            console.log('Setting user profile:', {
              full_name: fullName,
              email: email,
              initials: initials,
              avatar_url: profile.avatar_url
            })
            
            setUserProfile({
              full_name: fullName,
              email: email,
              initials: initials,
              avatar_url: profile.avatar_url || null,
              timestamp: Date.now()
            })
          } else {
            // Fallback if no profile exists
            const email = user.email || ''
            const fullName = email.split('@')[0] || 'User'
            const initials = fullName.slice(0, 2).toUpperCase() || 'U'
            
            setUserProfile({
              full_name: fullName,
              email: email,
              initials: initials,
              avatar_url: null,
              timestamp: Date.now()
            })
          }
          
          // Fetch project and task stats
          const { data: userTenant } = await supabase
            .from('user_tenants')
            .select('tenant_id')
            .eq('user_id', user.id)
            .single()
          
          if (userTenant) {
            // Count active projects
            const { count: projectCount } = await supabase
              .from('projects')
              .select('*', { count: 'exact', head: true })
              .eq('tenant_id', userTenant.tenant_id)
              .in('status', ['new', 'planning', 'on-track', 'delayed'])
            
            // Count pending tasks
            const { count: taskCount } = await supabase
              .from('tasks')
              .select('*', { count: 'exact', head: true })
              .eq('tenant_id', userTenant.tenant_id)
              .in('status', ['todo', 'in-progress'])
            
            setProjectStats({
              activeProjects: projectCount || 0,
              pendingTasks: taskCount || 0
            })
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
      }
    }

    fetchUserProfile()
    
    // Listen for profile updates from settings page
    const handleProfileUpdate = () => {
      console.log('Profile update event received - refreshing sidebar profile')
      fetchUserProfile()
    }
    window.addEventListener('profile-updated', handleProfileUpdate)
    
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserProfile()
    })
    
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate)
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }

  const isItemActive = (item: NavItem): boolean => {
    if (item.href && (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)))) {
      return true
    }
    if (item.children) {
      return item.children.some(child => isItemActive(child))
    }
    return false
  }

  const renderNavItem = (item: NavItem, depth = 0) => {
    const isActive = isItemActive(item)
    const isExpanded = expandedItems.includes(item.title)
    const hasChildren = item.children && item.children.length > 0

    return (
      <div key={item.title}>
        {hasChildren ? (
          <button
            className={cn(
              "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              "hover:bg-white/10",
              isActive ? "bg-white/20 text-white" : "text-purple-100",
              isCollapsed && "justify-center",
              depth > 0 && "ml-4"
            )}
            onClick={() => {
              if (!isCollapsed) {
                toggleExpanded(item.title)
              }
            }}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left">{item.title}</span>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  isExpanded && "rotate-180"
                )} />
              </>
            )}
          </button>
        ) : (
          <Link
            href={item.href!}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              "hover:bg-white/10",
              isActive ? "bg-white/20 text-white" : "text-purple-100",
              isCollapsed && "justify-center",
              depth > 0 && "ml-4 text-xs"
            )}
            onClick={() => setIsMobileOpen(false)}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!isCollapsed && <span>{item.title}</span>}
          </Link>
        )}
        
        {hasChildren && isExpanded && !isCollapsed && (
          <div className="ml-2 space-y-1">
            {item.children!.map(child => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-40 h-screen gradient-primary transition-all duration-300",
        isCollapsed ? "w-16" : "w-[224px]",
        isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex h-full flex-col">
          {/* Logo Section */}
          <div className="flex h-16 items-center justify-between px-6">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="relative h-10 w-10 flex-shrink-0">
                <Image
                  src="/assets/logos/Project Pro Logo.svg"
                  alt="Project Pro"
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-white">Project Pro</span>
                  <span className="text-xs text-purple-200">Beta</span>
                </div>
              )}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex text-white hover:bg-white/10"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => renderNavItem(item))}
          </nav>

          {/* User Section */}
          <div className="border-t border-white/20 p-4">
            <div className={cn(
              "flex items-center gap-3 cursor-pointer hover:bg-white/10 rounded-lg p-2 transition-colors",
              isCollapsed && "justify-center"
            )}>
              {userProfile?.avatar_url ? (
                userProfile.avatar_url.startsWith('http') ? (
                  <img 
                    src={userProfile.avatar_url} 
                    alt={userProfile.full_name || 'Profile'} 
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className={`h-8 w-8 rounded-full ${userProfile.avatar_url} flex items-center justify-center text-white font-semibold text-sm`}>
                    {userProfile?.initials || 'U'}
                  </div>
                )
              ) : (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                  {userProfile?.initials || 'U'}
                </div>
              )}
              {!isCollapsed && userProfile && (
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-medium text-white">{userProfile.full_name}</span>
                  <span className="text-xs text-purple-200">{userProfile.email}</span>
                </div>
              )}
            </div>
            {isCollapsed ? (
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="icon"
                className="w-full mt-2 text-white hover:bg-white/10"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <div className="mt-2 pt-2 border-t border-white/10">
                  <div className="text-xs text-purple-200">
                    <div className="flex justify-between mb-1">
                      <span>Active Projects</span>
                      <span>{projectStats.activeProjects}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pending Tasks</span>
                      <span>{projectStats.pendingTasks}</span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  className="w-full mt-3 justify-start text-white hover:bg-white/10 hover:text-white"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}