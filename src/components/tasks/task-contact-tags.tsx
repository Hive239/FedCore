"use client"

import { useState, useEffect } from 'react'
import { X, Plus, Building2, HardHat, Truck, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import { useContacts, type ContactType } from '@/lib/hooks/use-contacts'
import { ContactTag } from '@/lib/types'

interface TaskContactTagsProps {
  contactTags: ContactTag[]
  onChange: (tags: ContactTag[]) => void
  label?: string
}

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

export function TaskContactTags({ contactTags = [], onChange, label = "Tagged Contacts" }: TaskContactTagsProps) {
  const [open, setOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<ContactType>('vendor')
  const [searchValue, setSearchValue] = useState('')
  
  const { data: contacts = [], isLoading } = useContacts(selectedType)
  
  const handleAddContact = (contact: any) => {
    const newTag: ContactTag = {
      contact_id: contact.id,
      contact_type: selectedType,
      contact_name: contact.name
    }
    
    // Check if already added
    if (!contactTags.find(t => t.contact_id === contact.id)) {
      onChange([...contactTags, newTag])
    }
    setOpen(false)
    setSearchValue('')
  }
  
  const handleRemoveContact = (contactId: string) => {
    onChange(contactTags.filter(t => t.contact_id !== contactId))
  }
  
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    contact.contact_email?.toLowerCase().includes(searchValue.toLowerCase())
  )
  
  const availableContacts = filteredContacts.filter(
    contact => !contactTags.find(t => t.contact_id === contact.id)
  )
  
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      <div className="flex flex-wrap gap-2">
        {contactTags.map((tag) => {
          const config = contactTypeConfig[tag.contact_type]
          const Icon = config.icon
          
          return (
            <Badge
              key={tag.contact_id}
              variant="secondary"
              className="pl-2 pr-1 py-1 flex items-center gap-1"
            >
              <Icon className="h-3 w-3" />
              <span className="text-xs">{tag.contact_name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ml-1 hover:bg-destructive/20"
                onClick={() => handleRemoveContact(tag.contact_id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )
        })}
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Contact
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-2 border-b">
              <div className="flex gap-1">
                {(Object.entries(contactTypeConfig) as [ContactType, typeof contactTypeConfig[ContactType]][]).map(([type, config]) => {
                  const Icon = config.icon
                  return (
                    <Button
                      key={type}
                      variant={selectedType === type ? "default" : "ghost"}
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => setSelectedType(type)}
                    >
                      <Icon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {contactTypeConfig[selectedType].description}
              </p>
            </div>
            
            <Command>
              <CommandInput 
                placeholder={`Search ${contactTypeConfig[selectedType].label.toLowerCase()}s...`}
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandEmpty>
                {isLoading ? 'Loading...' : 'No contacts found.'}
              </CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                {availableContacts.map((contact) => (
                  <CommandItem
                    key={contact.id}
                    onSelect={() => handleAddContact(contact)}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{contact.name}</span>
                      {contact.contact_email && (
                        <span className="text-xs text-muted-foreground">
                          {contact.contact_email}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      
      {contactTags.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No contacts tagged. Add vendors, design professionals, or contractors to this task.
        </p>
      )}
    </div>
  )
}