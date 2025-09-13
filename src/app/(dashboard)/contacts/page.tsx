"use client"

import { useState, useEffect } from 'react'
import { Plus, Search, Users, Building2, Truck, HardHat, MoreVertical, Mail, Phone, MapPin, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'

type ContactType = 'vendor' | 'design_professional' | 'contractor' | 'customer'

const contactTypeConfig = {
  vendor: { 
    label: 'Vendor', 
    icon: Truck, 
    color: 'bg-blue-500',
    description: 'Suppliers and service providers'
  },
  design_professional: { 
    label: 'Design Professional', 
    icon: Building2, 
    color: 'bg-purple-500',
    description: 'Architects, engineers, designers'
  },
  contractor: { 
    label: 'Contractor', 
    icon: HardHat, 
    color: 'bg-orange-500',
    description: 'General and specialty contractors'
  },
  customer: { 
    label: 'Customer', 
    icon: Users, 
    color: 'bg-green-500',
    description: 'Clients and property owners'
  }
}

interface Contact {
  id: string
  name: string
  contact_type: ContactType
  contact_email?: string
  contact_phone?: string
  company_name?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  status?: string
  created_at?: string
  created_by?: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<ContactType | 'all'>('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [newContact, setNewContact] = useState({
    name: '',
    contact_type: 'vendor' as ContactType,
    contact_email: '',
    contact_phone: '',
    company_name: '',
    address: '',
    city: '',
    state: '',
    zip: ''
  })

  const supabase = createClient()

  // Load contacts from Supabase
  const loadContacts = async () => {
    try {
      setLoading(true)
      
      // Get current user first
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.error('User not authenticated when loading contacts')
        setContacts([])
        setFilteredContacts([])
        setLoading(false)
        return
      }

      // Get user's tenant
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()
      
      if (!userTenant) {
        console.error('No tenant found for user')
        setContacts([])
        setFilteredContacts([])
        setLoading(false)
        return
      }
      
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('tenant_id', userTenant.tenant_id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading contacts:', error)
        // If table doesn't exist or RLS issue, show helpful message
        if (error.code === '42P01') {
          toast({
            title: 'Database Setup Required',
            description: 'Please run the database migration to create the vendors table',
            variant: 'destructive'
          })
        } else if (error.code === '42501') {
          toast({
            title: 'Permission Issue',
            description: 'Please check your database permissions',
            variant: 'destructive'
          })
        }
        setContacts([])
        setFilteredContacts([])
      } else {
        setContacts(data || [])
        setFilteredContacts(data || [])
      }
    } catch (error) {
      console.error('Failed to load contacts:', error)
      setContacts([])
      setFilteredContacts([])
    } finally {
      setLoading(false)
    }
  }

  // Add or update contact
  const handleSaveContact = async () => {
    if (!newContact.name) {
      toast({
        title: 'Error',
        description: 'Contact name is required',
        variant: 'destructive'
      })
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to manage contacts',
          variant: 'destructive'
        })
        return
      }

      if (editingContact) {
        // Update existing contact
        const { error } = await supabase
          .from('vendors')
          .update({
            ...newContact,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingContact.id)

        if (error) {
          console.error('Error updating contact:', error)
          toast({
            title: 'Error',
            description: 'Failed to update contact',
            variant: 'destructive'
          })
          return
        }

        toast({
          title: 'Success',
          description: 'Contact updated successfully',
        })
      } else {
        // Add new contact
        const insertData = {
          name: newContact.name,
          contact_type: newContact.contact_type,
          contact_email: newContact.contact_email || null,
          contact_phone: newContact.contact_phone || null,
          company_name: newContact.company_name || null,
          address: newContact.address || null,
          city: newContact.city || null,
          state: newContact.state || null,
          zip: newContact.zip || null,
          created_by: user.id,
          status: 'active'
        }
        console.log('Attempting to insert:', insertData)
        
        const { data, error } = await supabase
          .from('vendors')
          .insert([insertData])
          .select()

        console.log('Insert response:', { data, error })

        if (error) {
          console.error('Error adding contact - Full error object:', JSON.stringify(error, null, 2))
          toast({
            title: 'Error',
            description: error.message || 'Failed to add contact. Check console for details.',
            variant: 'destructive'
          })
          return
        }

        if (!data || data.length === 0) {
          console.error('No data returned from insert')
          toast({
            title: 'Error',
            description: 'Contact may have been created but no data returned',
            variant: 'destructive'
          })
          return
        }

        toast({
          title: 'Success',
          description: 'Contact added successfully',
        })
      }

      // Reset form and reload
      setNewContact({
        name: '',
        contact_type: 'vendor',
        contact_email: '',
        contact_phone: '',
        company_name: '',
        address: '',
        city: '',
        state: '',
        zip: ''
      })
      setEditingContact(null)
      setIsAddModalOpen(false)
      loadContacts()
    } catch (error) {
      console.error('Failed to save contact:', error)
      toast({
        title: 'Error',
        description: 'Failed to save contact',
        variant: 'destructive'
      })
    }
  }

  // Delete contact
  const handleDeleteContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting contact:', error)
        toast({
          title: 'Error',
          description: 'Failed to delete contact',
          variant: 'destructive'
        })
        return
      }

      toast({
        title: 'Success',
        description: 'Contact deleted successfully',
      })
      loadContacts()
    } catch (error) {
      console.error('Failed to delete contact:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete contact',
        variant: 'destructive'
      })
    }
  }

  // Edit contact
  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact)
    setNewContact({
      name: contact.name,
      contact_type: contact.contact_type,
      contact_email: contact.contact_email || '',
      contact_phone: contact.contact_phone || '',
      company_name: contact.company_name || '',
      address: contact.address || '',
      city: contact.city || '',
      state: contact.state || '',
      zip: contact.zip || ''
    })
    setIsAddModalOpen(true)
  }

  // Filter contacts
  useEffect(() => {
    let filtered = [...contacts]
    
    if (selectedType !== 'all') {
      filtered = filtered.filter(c => c.contact_type === selectedType)
    }
    
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contact_email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    setFilteredContacts(filtered)
  }, [contacts, selectedType, searchTerm])

  // Load on mount
  useEffect(() => {
    loadContacts()
  }, [])

  // Reset form when modal closes
  useEffect(() => {
    if (!isAddModalOpen) {
      setEditingContact(null)
      setNewContact({
        name: '',
        contact_type: 'vendor',
        contact_email: '',
        contact_phone: '',
        company_name: '',
        address: '',
        city: '',
        state: '',
        zip: ''
      })
    }
  }, [isAddModalOpen])

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="text-center flex-1">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">Contacts</h1>
          <p className="text-gray-600 text-lg">Manage vendors, contractors, design professionals, and customers</p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-2xl transition-all duration-300">
              <Button 
                variant="outline"
                className="bg-white/90 backdrop-blur-sm border-0 text-purple-700 hover:bg-purple-50 font-semibold rounded-xl">
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingContact ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
              <DialogDescription>
                {editingContact ? 'Update contact information' : 'Add a vendor, contractor, design professional, or customer'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="type">Contact Type *</Label>
                <Select 
                  value={newContact.contact_type} 
                  onValueChange={(v) => setNewContact({...newContact, contact_type: v as ContactType})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(contactTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {contactTypeConfig[newContact.contact_type].description}
                </p>
              </div>
              
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newContact.name}
                  onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                  placeholder="John Smith"
                />
              </div>
              
              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={newContact.company_name}
                  onChange={(e) => setNewContact({...newContact, company_name: e.target.value})}
                  placeholder="ABC Construction"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newContact.contact_email}
                    onChange={(e) => setNewContact({...newContact, contact_email: e.target.value})}
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newContact.contact_phone}
                    onChange={(e) => setNewContact({...newContact, contact_phone: e.target.value})}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              
              <div>
                <AddressAutocomplete
                  label="Address"
                  placeholder="123 Main St, City, State..."
                  value={newContact.address || ''}
                  onChange={(address) => setNewContact({...newContact, address})}
                  className="w-full"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={newContact.city}
                    onChange={(e) => setNewContact({...newContact, city: e.target.value})}
                    placeholder="New York"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={newContact.state}
                    onChange={(e) => setNewContact({...newContact, state: e.target.value})}
                    placeholder="NY"
                    maxLength={2}
                  />
                </div>
                <div>
                  <Label htmlFor="zip">ZIP</Label>
                  <Input
                    id="zip"
                    value={newContact.zip}
                    onChange={(e) => setNewContact({...newContact, zip: e.target.value})}
                    placeholder="10001"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button onClick={handleSaveContact}>
                  {editingContact ? 'Update Contact' : 'Add Contact'}
                </Button>
                <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        {Object.entries(contactTypeConfig).map(([key, config]) => {
          const Icon = config.icon
          const count = contacts.filter(c => c.contact_type === key).length
          
          return (
            <div key={key} className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <Card 
                className="cursor-pointer bg-white/80 backdrop-blur-sm border-0 rounded-xl h-full"
                onClick={() => setSelectedType(key as ContactType)}
              >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {config.label}s
                </CardTitle>
                <div className={`p-2 rounded-lg ${config.color} text-white`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
                <p className="text-xs text-muted-foreground">
                  {config.description}
                </p>
              </CardContent>
              </Card>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-6">
        <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 flex-1 max-w-sm">
          <div className="relative bg-white/80 backdrop-blur-sm rounded-xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-transparent border-0 focus:ring-2 focus:ring-purple-300"
            />
          </div>
        </div>
        <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600">
          <Select value={selectedType} onValueChange={(v) => setSelectedType(v as ContactType | 'all')}>
            <SelectTrigger className="w-48 bg-white/80 backdrop-blur-sm border-0 rounded-xl">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(contactTypeConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
          </Select>
        </div>
      </div>

      {/* Contacts Grid */}
      {loading ? (
        <div className="text-center py-12">Loading contacts...</div>
      ) : filteredContacts.length === 0 ? (
        <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600">
          <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || selectedType !== 'all' 
                  ? 'No contacts found matching your filters' 
                  : 'No contacts yet. Click "Add Contact" to get started.'}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredContacts.map((contact) => {
            const typeConfig = contactTypeConfig[contact.contact_type] || contactTypeConfig.vendor
            const Icon = typeConfig.icon
            
            return (
              <div key={contact.id} className="p-[1px] rounded-lg bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-lg h-full">
                <CardHeader className="pb-2 px-3 pt-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1.5 rounded-md ${typeConfig.color} text-white flex-shrink-0`}>
                        <Icon className="h-3 w-3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm font-semibold truncate">{contact.name}</CardTitle>
                        {contact.company_name && (
                          <p className="text-xs text-muted-foreground truncate">{contact.company_name}</p>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditContact(contact)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDeleteContact(contact.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 px-3 pb-3">
                  <Badge variant="secondary" className="text-xs py-0">
                    {typeConfig.label}
                  </Badge>
                  
                  {contact.contact_email && (
                    <div className="flex items-center gap-1 text-xs">
                      <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{contact.contact_email}</span>
                    </div>
                  )}
                  
                  {contact.contact_phone && (
                    <div className="flex items-center gap-1 text-xs">
                      <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{contact.contact_phone}</span>
                    </div>
                  )}
                  
                  {(contact.city || contact.state) && (
                    <div className="flex items-center gap-1 text-xs">
                      <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">
                        {[contact.city, contact.state].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}