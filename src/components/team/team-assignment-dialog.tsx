"use client"

import { useState, useEffect } from 'react'
import { Check, Users, Mail, Phone, X } from 'lucide-react'
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
import { useTeamMembers, useContacts, useCreateContact } from '@/lib/hooks/use-team-members'
import { cn } from '@/lib/utils'

interface TeamAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  selectedUserIds?: string[]
  selectedContactIds?: string[]
  onAssign: (userIds: string[], contactIds: string[]) => void
  allowContacts?: boolean
  notificationEnabled?: boolean
  onNotificationChange?: (enabled: boolean) => void
}

export function TeamAssignmentDialog({
  open,
  onOpenChange,
  title = "Assign Team Members",
  description = "Select team members and contacts to assign",
  selectedUserIds = [],
  selectedContactIds = [],
  onAssign,
  allowContacts = true,
  notificationEnabled = true,
  onNotificationChange,
}: TeamAssignmentDialogProps) {
  const { data: teamMembers, isLoading: loadingTeam } = useTeamMembers()
  const { data: contacts, isLoading: loadingContacts } = useContacts()
  const createContactMutation = useCreateContact()
  
  const [selectedUsers, setSelectedUsers] = useState<string[]>(selectedUserIds)
  const [selectedContacts, setSelectedContacts] = useState<string[]>(selectedContactIds)
  const [searchTerm, setSearchTerm] = useState('')
  const [sendNotifications, setSendNotifications] = useState(notificationEnabled)
  const [activeTab, setActiveTab] = useState('team')
  
  // New contact form
  const [showNewContact, setShowNewContact] = useState(false)
  const [newContact, setNewContact] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    title: ''
  })
  
  useEffect(() => {
    setSelectedUsers(selectedUserIds)
    setSelectedContacts(selectedContactIds)
  }, [selectedUserIds, selectedContactIds])
  
  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }
  
  const toggleContact = (contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }
  
  const handleAssign = () => {
    onAssign(selectedUsers, selectedContacts)
    if (onNotificationChange) {
      onNotificationChange(sendNotifications)
    }
    onOpenChange(false)
  }
  
  const handleCreateContact = async () => {
    if (!newContact.first_name || !newContact.last_name) return
    
    try {
      const created = await createContactMutation.mutateAsync(newContact)
      setSelectedContacts([...selectedContacts, created.id])
      setNewContact({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company: '',
        title: ''
      })
      setShowNewContact(false)
    } catch (error) {
      console.error('Failed to create contact:', error)
    }
  }
  
  const filteredTeamMembers = teamMembers?.filter(member =>
    member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []
  
  const filteredContacts = contacts?.filter(contact =>
    `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.company?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []
  
  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
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
              <TabsTrigger value="team">
                Team Members ({selectedUsers.length})
              </TabsTrigger>
              {allowContacts && (
                <TabsTrigger value="contacts">
                  Contacts ({selectedContacts.length})
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="team" className="mt-4">
              <ScrollArea className="h-[300px] pr-4">
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
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50",
                          selectedUsers.includes(member.id) && "bg-muted border-primary"
                        )}
                        onClick={() => toggleUser(member.id)}
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
                          <div className="text-sm text-muted-foreground">
                            {member.email}
                          </div>
                        </div>
                        {member.role && (
                          <Badge variant="secondary">{member.role}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            {allowContacts && (
              <TabsContent value="contacts" className="mt-4">
                <div className="space-y-4">
                  {!showNewContact && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewContact(true)}
                      className="w-full"
                    >
                      Add New Contact
                    </Button>
                  )}
                  
                  {showNewContact && (
                    <div className="space-y-3 p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">New Contact</h4>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowNewContact(false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="first_name">First Name*</Label>
                          <Input
                            id="first_name"
                            value={newContact.first_name}
                            onChange={(e) => setNewContact({
                              ...newContact,
                              first_name: e.target.value
                            })}
                            placeholder="John"
                          />
                        </div>
                        <div>
                          <Label htmlFor="last_name">Last Name*</Label>
                          <Input
                            id="last_name"
                            value={newContact.last_name}
                            onChange={(e) => setNewContact({
                              ...newContact,
                              last_name: e.target.value
                            })}
                            placeholder="Doe"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newContact.email}
                          onChange={(e) => setNewContact({
                            ...newContact,
                            email: e.target.value
                          })}
                          placeholder="john.doe@example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={newContact.phone}
                          onChange={(e) => setNewContact({
                            ...newContact,
                            phone: e.target.value
                          })}
                          placeholder="555-0123"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="company">Company</Label>
                          <Input
                            id="company"
                            value={newContact.company}
                            onChange={(e) => setNewContact({
                              ...newContact,
                              company: e.target.value
                            })}
                            placeholder="ABC Corp"
                          />
                        </div>
                        <div>
                          <Label htmlFor="title">Title</Label>
                          <Input
                            id="title"
                            value={newContact.title}
                            onChange={(e) => setNewContact({
                              ...newContact,
                              title: e.target.value
                            })}
                            placeholder="Manager"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={handleCreateContact}
                        disabled={!newContact.first_name || !newContact.last_name || createContactMutation.isPending}
                        className="w-full"
                      >
                        Create Contact
                      </Button>
                    </div>
                  )}
                  
                  <ScrollArea className="h-[250px] pr-4">
                    {loadingContacts ? (
                      <div className="text-center py-4 text-muted-foreground">
                        Loading contacts...
                      </div>
                    ) : filteredContacts.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No contacts found
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredContacts.map(contact => (
                          <div
                            key={contact.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50",
                              selectedContacts.includes(contact.id) && "bg-muted border-primary"
                            )}
                            onClick={() => toggleContact(contact.id)}
                          >
                            <Checkbox
                              checked={selectedContacts.includes(contact.id)}
                              onCheckedChange={() => toggleContact(contact.id)}
                            />
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {contact.first_name[0]}{contact.last_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="font-medium">
                                {contact.first_name} {contact.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                {contact.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {contact.email}
                                  </span>
                                )}
                                {contact.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {contact.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                            {contact.company && (
                              <Badge variant="outline">{contact.company}</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>
            )}
          </Tabs>
          
          {/* Notification option */}
          {onNotificationChange && (
            <div className="flex items-center space-x-2 pt-2 border-t">
              <Checkbox
                id="notifications"
                checked={sendNotifications}
                onCheckedChange={(checked) => setSendNotifications(!!checked)}
              />
              <Label htmlFor="notifications" className="text-sm">
                Send email notifications to assigned members
              </Label>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign}>
            Assign {selectedUsers.length + selectedContacts.length} Members
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}