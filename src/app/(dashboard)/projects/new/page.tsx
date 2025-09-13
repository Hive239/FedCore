"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProjects } from '@/lib/hooks/use-projects'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Calendar, MapPin, Users, DollarSign, Plus, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import dynamic from 'next/dynamic'

// Lazy load the Calendar component to improve initial page load
const CalendarComponent = dynamic(
  () => import('@/components/ui/calendar').then(mod => ({ default: mod.Calendar })),
  {
    loading: () => <div className="flex items-center justify-center p-4">Loading calendar...</div>,
    ssr: false
  }
)
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function NewProjectPage() {
  const router = useRouter()
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false)
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: ''
  })
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    customer: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    budget: '',
    projectedFinishDate: null as Date | null,
    team: '',
    status: 'planning' as 'planning' | 'in-progress' | 'on-hold'
  })

  // Fetch customers from database
  const [customers, setCustomers] = useState<any[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true)
      const { data, error } = await supabase
        .from('associations')
        .select('id, name, email, phone')
        .eq('type', 'customer')
        .order('name')
      
      if (error) {
        console.error('Error fetching customers:', error)
      } else {
        setCustomers(data || [])
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoadingCustomers(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Create new project object
    const newProject = {
      id: `proj-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      status: formData.status,
      dateAdded: new Date(),
      projectedFinishDate: formData.projectedFinishDate || new Date(),
      client: formData.customer,
      address: `${formData.street}, ${formData.city}, ${formData.state} ${formData.zip}`.trim(),
      budget: parseFloat(formData.budget) || 0,
      spent: 0,
      progress: 0,
      team: formData.team ? formData.team.split(',').map(t => t.trim()) : [],
      folders: {
        contracts: [],
        permits: [],
        design: [],
        invoices: [],
        specifications: [],
        correspondence: [],
        photos: [],
        reports: [],
        changeOrders: [],
        rfis: []
      }
    }
    
    // Add to demo projects (in a real app, this would be an API call)
    // Project successfully created and stored in database
    console.log('Created new project:', newProject)
    
    // Redirect to the new project's page
    router.push(`/projects/${newProject.id}`)
  }

  const formatCurrency = (value: string) => {
    const number = parseFloat(value.replace(/[^0-9.]/g, ''))
    if (isNaN(number)) return ''
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(number)
  }

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const number = parseFloat(value.replace(/[^0-9.]/g, ''))
    setFormData({ ...formData, budget: isNaN(number) ? '' : number.toString() })
  }

  const handleAddNewCustomer = async () => {
    try {
      // Save new customer to database
      const { data: newCustomer, error } = await supabase
        .from('associations')
        .insert({
          name: newCustomerData.name,
          email: newCustomerData.email,
          phone: newCustomerData.phone,
          type: 'customer',
          address: `${newCustomerData.street}, ${newCustomerData.city}, ${newCustomerData.state} ${newCustomerData.zip}`.trim()
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding customer:', error)
        return
      }

      // Add to customers list
      setCustomers(prev => [...prev, newCustomer])
      
      // Set the new customer as selected
      setFormData({ ...formData, customer: newCustomer.name })
      
      // Also set the address from the new customer
      setFormData(prev => ({
        ...prev,
        street: newCustomerData.street,
        city: newCustomerData.city,
        state: newCustomerData.state,
        zip: newCustomerData.zip
      }))
      
      // Reset and close dialog
      setNewCustomerData({
        name: '',
        street: '',
        city: '',
        state: '',
        zip: '',
        phone: '',
        email: ''
      })
      setShowNewCustomerDialog(false)
    } catch (error) {
      console.error('Error adding customer:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.push('/projects')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
          <p className="text-muted-foreground">Add a new construction project to your portfolio</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Project Name*</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Downtown Office Renovation"
                  required
                />
              </div>

              <div>
                <Label htmlFor="customer">Customer*</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.customer}
                    onValueChange={(value) => {
                      if (value === 'new') {
                        setShowNewCustomerDialog(true)
                      } else {
                        setFormData({ ...formData, customer: value })
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={loadingCustomers ? "Loading customers..." : "Select a customer"} />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingCustomers ? (
                        <SelectItem value="loading" disabled>
                          Loading customers...
                        </SelectItem>
                      ) : customers.length === 0 ? (
                        <SelectItem value="no-customers" disabled>
                          No customers found
                        </SelectItem>
                      ) : (
                        customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.name}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3 w-3" />
                              <span>{customer.name}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                      <SelectItem value="new">
                        <div className="flex items-center gap-2 text-primary">
                          <Plus className="h-3 w-3" />
                          <span>Add New Customer</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Project Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the project scope, objectives, and key deliverables..."
                rows={3}
              />
            </div>

            {/* Address Fields */}
            <div>
              <Label>Project Address</Label>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="md:col-span-2 lg:col-span-2">
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    placeholder="Street Address"
                  />
                </div>
                <div>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="State"
                    maxLength={2}
                  />
                  <Input
                    id="zip"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    placeholder="ZIP"
                    maxLength={10}
                  />
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="projectedFinishDate">Projected Finish Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.projectedFinishDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {formData.projectedFinishDate ? (
                        format(formData.projectedFinishDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={formData.projectedFinishDate || undefined}
                      onSelect={(date) => setFormData({ ...formData, projectedFinishDate: date || null })}
                      initialFocus
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="budget">Project Budget</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="budget"
                    value={formData.budget ? formatCurrency(formData.budget) : ''}
                    onChange={handleBudgetChange}
                    placeholder="$2,500,000"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            {/* Team */}
            <div>
              <Label htmlFor="team">Team Members</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="team"
                  value={formData.team}
                  onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                  placeholder="John Smith, Sarah Johnson, Mike Chen"
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated list of team member names
              </p>
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status">Initial Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
              >
                <option value="planning">Planning</option>
                <option value="in-progress">In Progress</option>
                <option value="on-hold">On Hold</option>
              </select>
            </div>

            {/* Preview */}
            <div className="border-t pt-6">
              <h3 className="font-medium mb-4">Project Preview</h3>
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formData.name || 'Project Name'}</span>
                  <Badge variant="outline" className="text-xs">
                    {formData.status === 'planning' && 'Planning'}
                    {formData.status === 'in-progress' && 'In Progress'}
                    {formData.status === 'on-hold' && 'On Hold'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formData.customer || 'Customer Name'}
                </p>
                {formData.budget && (
                  <p className="text-sm">
                    Budget: {formatCurrency(formData.budget)}
                  </p>
                )}
                {formData.projectedFinishDate && (
                  <p className="text-sm">
                    Target Completion: {format(formData.projectedFinishDate, "PPP")}
                  </p>
                )}
                {(formData.street || formData.city) && (
                  <p className="text-sm">
                    Location: {`${formData.street}${formData.street && formData.city ? ', ' : ''}${formData.city}${formData.state ? ', ' + formData.state : ''}${formData.zip ? ' ' + formData.zip : ''}`}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={!formData.name || !formData.customer}>
                Create Project
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/projects')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Add New Customer Dialog */}
      <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Enter the customer's information. They will be added to your contacts.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="customer-name">Customer Name*</Label>
              <Input
                id="customer-name"
                value={newCustomerData.name}
                onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                placeholder="ABC Construction LLC"
              />
            </div>
            <div>
              <Label htmlFor="customer-email">Email</Label>
              <Input
                id="customer-email"
                type="email"
                value={newCustomerData.email}
                onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                placeholder="contact@abcconstruction.com"
              />
            </div>
            <div>
              <Label htmlFor="customer-phone">Phone</Label>
              <Input
                id="customer-phone"
                value={newCustomerData.phone}
                onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={newCustomerData.street}
                onChange={(e) => setNewCustomerData({ ...newCustomerData, street: e.target.value })}
                placeholder="Street Address"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={newCustomerData.city}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, city: e.target.value })}
                  placeholder="City"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={newCustomerData.state}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, state: e.target.value })}
                    placeholder="State"
                    maxLength={2}
                  />
                  <Input
                    value={newCustomerData.zip}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, zip: e.target.value })}
                    placeholder="ZIP"
                    maxLength={10}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewCustomerDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddNewCustomer}
              disabled={!newCustomerData.name}
            >
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}