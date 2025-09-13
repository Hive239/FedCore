"use client"

import { use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useProject, useUpdateProject } from '@/lib/hooks/use-projects'
import { ProjectForm } from '@/components/projects/project-form'
import { Button } from '@/components/ui/button'
import type { ProjectFormData } from '@/lib/types'

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const { data: project, isLoading, error } = useProject(id)
  const updateProject = useUpdateProject()

  const handleSubmit = async (data: ProjectFormData) => {
    try {
      await updateProject.mutateAsync({ id, data })
      router.push(`/projects/${id}`)
    } catch (error) {
      console.error('Failed to update project:', error)
      // TODO: Show error toast
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-destructive">Project not found</p>
        <Button asChild variant="outline">
          <Link href="/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Project</h1>
          <p className="text-muted-foreground">
            Update project details
          </p>
        </div>
      </div>

      <ProjectForm 
        project={project}
        onSubmit={handleSubmit}
        isLoading={updateProject.isPending}
      />
    </div>
  )
}