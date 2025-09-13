"use client"

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { memo, useCallback } from 'react'
import { MoreVertical, Edit, Trash, Eye, FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDeleteProject } from '@/lib/hooks/use-projects'
import type { ProjectWithRelations, Project } from '@/lib/types'
import { useStableCallback } from '@/lib/performance/react-optimizations'

const statusColors: Record<string, string> = {
  'new': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  'planning': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
  'in-progress': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  'on-hold': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
  'completed': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  'delayed': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
}

const statusLabels: Record<string, string> = {
  'new': 'New',
  'planning': 'Planning',
  'in-progress': 'In Progress',
  'on-hold': 'On Hold',
  'completed': 'Completed',
  'cancelled': 'Cancelled',
  'delayed': 'Delayed'
}

interface ProjectCardProps {
  project: any // Temporarily use any to avoid build issues
}

function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter()
  const deleteProject = useDeleteProject()

  const handleDelete = useStableCallback(async () => {
    if (typeof window !== 'undefined' && window.confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject.mutateAsync(project.id)
      } catch (error) {
        console.error('Failed to delete project:', error)
      }
    }
  }, [project.id, deleteProject], 'handleDelete')

  // CoreIQ style: Grid layout shows Name, File Count, Address
  // Status and dates are hidden in grid view as per spec
  const handleCardClick = useCallback(() => {
    router.push(`/projects/${project.id}`)
  }, [router, project.id])

  return (
    <div className="coreiq-card cursor-pointer transition-all hover:shadow-lg" onClick={handleCardClick}>
      <div className="card-header">
        <h3 className="card-title line-clamp-1">
          {project.name}
        </h3>
        <div className="card-actions">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation()
                router.push(`/projects/${project.id}`)
              }}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation()
                router.push(`/projects/${project.id}/edit`)
              }}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete()
                }}
                className="text-red-600 focus:text-red-600"
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="card-body space-y-3">
        {/* File Count */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FileText className="h-4 w-4" />
          <span>{project.documents_count || 0} Files</span>
        </div>
        
        {/* Address/Client */}
        <div className="text-sm text-gray-700">
          {project.association ? (
            <>
              <p className="font-medium">{project.association.name}</p>
              {project.association.address && (
                <p className="text-gray-500 text-xs mt-1">{project.association.address}</p>
              )}
            </>
          ) : (
            <p className="text-gray-500">No client assigned</p>
          )}
        </div>
        
        {/* Status and Budget - keep responsive improvements from collaborator */}
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[project?.status as keyof typeof statusColors] || ''}`}>
            {statusLabels[project?.status as keyof typeof statusLabels] || 'Unknown'}
          </span>
          
          {project.budget && (
            <span className="text-sm font-medium">
              ${project.budget.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// Export memoized component with custom comparison
export default memo(ProjectCard, (prevProps, nextProps) => {
  const prev = prevProps.project
  const next = nextProps.project
  
  return (
    prev.id === next.id &&
    prev.name === next.name &&
    prev.status === next.status &&
    prev.budget === next.budget &&
    prev.documents_count === next.documents_count &&
    prev.association?.name === next.association?.name &&
    prev.association?.address === next.association?.address
  )
})