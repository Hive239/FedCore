"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, DollarSign, Building } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Project, ProjectFormData, ProjectWithRelations } from '@/lib/types'

interface ProjectFormProps {
  project?: Project | ProjectWithRelations
  onSubmit: (data: ProjectFormData) => Promise<void>
  isLoading?: boolean
}

export function ProjectForm({ project, onSubmit, isLoading }: ProjectFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    status: 'new',
    budget: undefined,
    start_date: '',
    end_date: '',
    association_id: ''
  })

  useEffect(() => {
    if (project) {
      const proj = project as any
      setFormData({
        name: proj.name,
        description: proj.description || '',
        status: proj.status,
        budget: proj.budget || undefined,
        start_date: proj.start_date || '',
        end_date: proj.end_date || '',
        association_id: proj.association_id || ''
      })
    }
  }, [project])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.name.trim()) {
      alert('Project name is required')
      return
    }
    
    if (formData.budget && parseFloat(formData.budget) < 0) {
      alert('Budget must be a positive number')
      return
    }
    
    if (formData.start_date && formData.end_date) {
      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        alert('End date must be after start date')
        return
      }
    }
    
    await onSubmit(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'budget' ? (value ? parseFloat(value) : undefined) : value
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
          <CardDescription>
            Basic details about your project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter project name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the project..."
              className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background"
              >
                <option value="new">New</option>
                <option value="on-track">On Track</option>
                <option value="delayed">Delayed</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Budget</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="budget"
                  name="budget"
                  type="number"
                  value={formData.budget || ''}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="pl-9"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline & Assignment</CardTitle>
          <CardDescription>
            Schedule and property association
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={handleChange}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="association_id">Property/Association</Label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                id="association_id"
                name="association_id"
                value={formData.association_id}
                onChange={handleChange}
                className="w-full h-10 pl-9 pr-3 py-2 text-sm rounded-md border border-input bg-background"
              >
                <option value="">Select a property...</option>
                {/* TODO: Load associations from API */}
                <option value="1">Sunset Ridge HOA</option>
                <option value="2">Oak Park Condos</option>
                <option value="3">Riverside Apartments</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : (project ? 'Update Project' : 'Create Project')}
        </Button>
      </div>
    </form>
  )
}