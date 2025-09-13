"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Mail, Phone, Building, User } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface ExternalContact {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  type: string
}

interface ExternalContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectContact: (contact: ExternalContact) => void
}

export function ExternalContactDialog({
  open,
  onOpenChange,
  onSelectContact
}: ExternalContactDialogProps) {
  const [contacts, setContacts] = useState<ExternalContact[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState<'customer' | 'vendor'>('customer')
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  })
  const [showNewForm, setShowNewForm] = useState(false)
  const supabase = createClient()

  const loadContacts = async (type: 'customer' | 'vendor') => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('contact_type', type)
        .order('name')
      
      if (error) throw error
      
      if (data) {
        setContacts(data.map(c => ({
          id: c.id,
          name: c.name,
          email: c.contact_email,
          phone: c.contact_phone,
          company: c.company,
          type: c.contact_type
        })))
      }
    } catch (error) {
      console.error('Error loading contacts:', error)
      toast({
        title: 'Error',
        description: 'Failed to load contacts',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const createNewContact = async () => {
    if (!newContact.name || !newContact.email) {
      toast({
        title: 'Error',
        description: 'Name and email are required',
        variant: 'destructive'
      })
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('vendors')
        .insert({
          name: newContact.name,
          contact_email: newContact.email,
          contact_phone: newContact.phone,
          company: newContact.company,
          contact_type: selectedType,
          created_by: user.id
        })
        .select()
        .single()
      
      if (error) throw error
      
      if (data) {
        const contact: ExternalContact = {
          id: data.id,
          name: data.name,
          email: data.contact_email,
          phone: data.contact_phone,
          company: data.company,
          type: data.contact_type
        }
        
        onSelectContact(contact)
        onOpenChange(false)
        setNewContact({ name: '', email: '', phone: '', company: '' })
        setShowNewForm(false)
      }
    } catch (error) {
      console.error('Error creating contact:', error)
      toast({
        title: 'Error',
        description: 'Failed to create contact',
        variant: 'destructive'
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Message External Contact</DialogTitle>
          <DialogDescription>
            Send messages to customers and vendors via email
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={selectedType} onValueChange={(v) => {
          setSelectedType(v as 'customer' | 'vendor')
          loadContacts(v as 'customer' | 'vendor')
        }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="customer">Customers</TabsTrigger>
            <TabsTrigger value="vendor">Vendors</TabsTrigger>
          </TabsList>
          
          <TabsContent value={selectedType} className="space-y-4">
            {showNewForm ? (
              <div className="space-y-4">
                <h3 className="font-medium">Add New {selectedType === 'customer' ? 'Customer' : 'Vendor'}</h3>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={newContact.company}
                      onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                      placeholder="ABC Construction"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNewForm(false)
                      setNewContact({ name: '', email: '', phone: '', company: '' })
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createNewContact}
                    className="bg-purple-700 hover:bg-purple-800 text-white"
                  >
                    Create & Message
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Select a contact to send them an email message
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setShowNewForm(true)}
                    className="bg-purple-700 hover:bg-purple-800 text-white"
                  >
                    Add New
                  </Button>
                </div>
                
                <ScrollArea className="h-96">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading contacts...
                    </div>
                  ) : contacts.length === 0 ? (
                    <div className="text-center py-8">
                      <User className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground mb-4">
                        No {selectedType}s found
                      </p>
                      <Button
                        onClick={() => setShowNewForm(true)}
                        className="bg-purple-700 hover:bg-purple-800 text-white"
                      >
                        Add First {selectedType === 'customer' ? 'Customer' : 'Vendor'}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {contacts.map((contact) => (
                        <div
                          key={contact.id}
                          onClick={() => {
                            onSelectContact(contact)
                            onOpenChange(false)
                          }}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                        >
                          <Avatar>
                            <AvatarFallback>
                              {contact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{contact.name}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                              {contact.company && (
                                <span className="flex items-center gap-1">
                                  <Building className="h-3 w-3" />
                                  {contact.company}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}