"use client"

import { useState, useEffect } from 'react'
import { Check, Users, Building2, Mail, Phone, Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { useTeamMembers } from '@/lib/hooks/use-team-members'
import { useVendors } from '@/lib/hooks/use-vendors'
import { cn } from '@/lib/utils'

interface ProjectAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  projectId: string
  selectedUserIds?: string[]
  selectedVendorIds?: string[]
  onAssign: (userIds: string[], vendorIds: string[]) => void
  mode?: 'project' | 'task' | 'event' | 'update_log'
}

const vendorTypeLabels = {
  design_professional: 'Design Professional',
  contractor: 'Contractor',
  supplier: 'Vendor/Supplier',
  consultant: 'Consultant'
}

export function ProjectAssignmentDialog({
  open,
  onOpenChange,
  title = "Manage Project Team & Vendors",
  description = "Assign team members and vendors who can receive notifications",
  projectId,
  selectedUserIds = [],
  selectedVendorIds = [],
  onAssign,
  mode = 'project'
}: ProjectAssignmentDialogProps) {
  const { data: teamMembers, isLoading: loadingTeam } = useTeamMembers()
  const { data: vendorsData, isLoading: loadingVendors } = useVendors()
  
  const vendors = vendorsData?.data || []
  
  const [selectedUsers, setSelectedUsers] = useState<string[]>(selectedUserIds)
  const [selectedVendors, setSelectedVendors] = useState<string[]>(selectedVendorIds)
  const [userNotifications, setUserNotifications] = useState<Record<string, boolean>>({})
  const [vendorNotifications, setVendorNotifications] = useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('team')
  
  useEffect(() => {
    setSelectedUsers(selectedUserIds)
    setSelectedVendors(selectedVendorIds)
    
    // Initialize notification settings (default to true)
    const userNotifs: Record<string, boolean> = {}
    selectedUserIds.forEach(id => {
      userNotifs[id] = true
    })
    setUserNotifications(userNotifs)
    
    const vendorNotifs: Record<string, boolean> = {}
    selectedVendorIds.forEach(id => {
      vendorNotifs[id] = true
    })
    setVendorNotifications(vendorNotifs)
  }, [selectedUserIds, selectedVendorIds])
  
  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => {
      const newSelection = prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
      
      // Set default notification to true when adding
      if (!prev.includes(userId)) {
        setUserNotifications(prev => ({ ...prev, [userId]: true }))
      }
      
      return newSelection
    })
  }
  
  const toggleVendor = (vendorId: string) => {
    setSelectedVendors(prev => {
      const newSelection = prev.includes(vendorId)
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
      
      // Set default notification to true when adding
      if (!prev.includes(vendorId)) {
        setVendorNotifications(prev => ({ ...prev, [vendorId]: true }))
      }
      
      return newSelection
    })
  }
  
  const toggleUserNotification = (userId: string, enabled: boolean) => {
    setUserNotifications(prev => ({ ...prev, [userId]: enabled }))
  }
  
  const toggleVendorNotification = (vendorId: string, enabled: boolean) => {
    setVendorNotifications(prev => ({ ...prev, [vendorId]: enabled }))
  }
  
  const handleAssign = () => {
    onAssign(selectedUsers, selectedVendors)
    onOpenChange(false)
  }
  
  const filteredTeamMembers = teamMembers?.filter(member =>
    member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []
  
  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  // Group vendors by category
  const vendorsByCategory = {
    design_professional: filteredVendors.filter(v => 
      v.category?.name?.toLowerCase().includes('design') || 
      v.category?.name?.toLowerCase().includes('architect') ||
      v.category?.name?.toLowerCase().includes('engineer')
    ),
    contractor: filteredVendors.filter(v => 
      v.category?.name?.toLowerCase().includes('contractor') ||
      v.category?.name?.toLowerCase().includes('construction')
    ),
    supplier: filteredVendors.filter(v => 
      !v.category?.name?.toLowerCase().includes('design') &&
      !v.category?.name?.toLowerCase().includes('architect') &&
      !v.category?.name?.toLowerCase().includes('engineer') &&
      !v.category?.name?.toLowerCase().includes('contractor') &&
      !v.category?.name?.toLowerCase().includes('construction')
    )
  }
  
  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div>
            <Input
              placeholder="Search by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="team" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Directory ({selectedUsers.length})
              </TabsTrigger>
              <TabsTrigger value="vendors" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Vendors ({selectedVendors.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="team" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                {loadingTeam ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Loading team members...
                  </div>
                ) : filteredTeamMembers.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No team members found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTeamMembers.map(member => (
                      <div
                        key={member.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border",
                          selectedUsers.includes(member.id) && "bg-muted border-primary"
                        )}
                      >
                        <Checkbox
                          checked={selectedUsers.includes(member.id)}
                          onCheckedChange={() => toggleUser(member.id)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback>
                            {getInitials(member.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium">
                            {member.full_name || member.email}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {member.email}
                            </span>
                            {member.mobile_phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {member.mobile_phone}
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedUsers.includes(member.id) && mode === 'project' && (
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`notif-${member.id}`} className="text-sm">
                              Notifications
                            </Label>
                            <Switch
                              id={`notif-${member.id}`}
                              checked={userNotifications[member.id] ?? true}
                              onCheckedChange={(checked) => toggleUserNotification(member.id, checked)}
                            />
                          </div>
                        )}
                        {member.role && (
                          <Badge variant="secondary">{member.role}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="vendors" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                {loadingVendors ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Loading vendors...
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Design Professionals */}
                    {vendorsByCategory.design_professional.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">
                          Design Professionals
                        </h4>
                        <div className="space-y-2">
                          {vendorsByCategory.design_professional.map(vendor => (
                            <VendorItem
                              key={vendor.id}
                              vendor={vendor}
                              selected={selectedVendors.includes(vendor.id)}
                              notificationsEnabled={vendorNotifications[vendor.id] ?? true}
                              onToggle={() => toggleVendor(vendor.id)}
                              onToggleNotifications={(enabled) => toggleVendorNotification(vendor.id, enabled)}
                              showNotifications={mode === 'project'}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Contractors */}
                    {vendorsByCategory.contractor.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">
                          Contractors
                        </h4>
                        <div className="space-y-2">
                          {vendorsByCategory.contractor.map(vendor => (
                            <VendorItem
                              key={vendor.id}
                              vendor={vendor}
                              selected={selectedVendors.includes(vendor.id)}
                              notificationsEnabled={vendorNotifications[vendor.id] ?? true}
                              onToggle={() => toggleVendor(vendor.id)}
                              onToggleNotifications={(enabled) => toggleVendorNotification(vendor.id, enabled)}
                              showNotifications={mode === 'project'}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Vendors & Suppliers */}
                    {vendorsByCategory.supplier.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">
                          Vendors & Suppliers
                        </h4>
                        <div className="space-y-2">
                          {vendorsByCategory.supplier.map(vendor => (
                            <VendorItem
                              key={vendor.id}
                              vendor={vendor}
                              selected={selectedVendors.includes(vendor.id)}
                              notificationsEnabled={vendorNotifications[vendor.id] ?? true}
                              onToggle={() => toggleVendor(vendor.id)}
                              onToggleNotifications={(enabled) => toggleVendorNotification(vendor.id, enabled)}
                              showNotifications={mode === 'project'}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {filteredVendors.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        No vendors found
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
          
          {/* Summary */}
          {mode === 'project' && (
            <div className="pt-2 border-t text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span>
                  Team members and vendors with notifications enabled will receive updates about this project
                </span>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign}>
            Assign {selectedUsers.length + selectedVendors.length} Recipients
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Vendor item component
function VendorItem({
  vendor,
  selected,
  notificationsEnabled,
  onToggle,
  onToggleNotifications,
  showNotifications
}: {
  vendor: any
  selected: boolean
  notificationsEnabled: boolean
  onToggle: () => void
  onToggleNotifications: (enabled: boolean) => void
  showNotifications: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border",
        selected && "bg-muted border-primary"
      )}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={onToggle}
      />
      <Avatar className="h-8 w-8">
        <AvatarFallback>
          {vendor.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="font-medium">{vendor.name}</div>
        <div className="text-sm text-muted-foreground flex items-center gap-3">
          {vendor.contact_email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {vendor.contact_email}
            </span>
          )}
          {vendor.contact_phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {vendor.contact_phone}
            </span>
          )}
        </div>
      </div>
      {selected && showNotifications && (
        <div className="flex items-center gap-2">
          <Label htmlFor={`vendor-notif-${vendor.id}`} className="text-sm">
            Notifications
          </Label>
          <Switch
            id={`vendor-notif-${vendor.id}`}
            checked={notificationsEnabled}
            onCheckedChange={onToggleNotifications}
          />
        </div>
      )}
      {vendor.category?.name && (
        <Badge variant="outline">{vendor.category.name}</Badge>
      )}
    </div>
  )
}