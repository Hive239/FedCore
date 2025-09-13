"use client"

import { useState } from 'react'
import { X, Search, Users, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useTeamMembers, type TeamMember } from '@/lib/hooks/use-team-members'

interface NewMessageModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectRecipients: (recipients: TeamMember[]) => void
}

export function NewMessageModal({ isOpen, onClose, onSelectRecipients }: NewMessageModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<TeamMember[]>([])
  const { data: organizationMembers = [], isLoading } = useTeamMembers()

  if (!isOpen) return null

  const filteredMembers = organizationMembers.filter(member => {
    const matchesSearch = searchQuery === '' || 
      (member.full_name && member.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.role && member.role.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const notSelected = !selectedMembers.find(m => m.id === member.id)
    
    return matchesSearch && notSelected
  })

  const handleSelectMember = (member: TeamMember) => {
    setSelectedMembers([...selectedMembers, member])
  }

  const handleRemoveMember = (memberId: string) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== memberId))
  }

  const handleStartConversation = () => {
    if (selectedMembers.length > 0) {
      onSelectRecipients(selectedMembers)
      setSelectedMembers([])
      setSearchQuery('')
      onClose()
    }
  }

  const getStatusColor = (status: TeamMember['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      case 'busy': return 'bg-red-500'
      case 'offline': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">New Message</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Selected Recipients */}
        {selectedMembers.length > 0 && (
          <div className="px-6 py-3 border-b border-gray-200">
            <div className="flex flex-wrap gap-2">
              {selectedMembers.map(member => (
                <Badge key={member.id} variant="secondary" className="pl-2 pr-1 py-1">
                  {member.full_name || member.email}
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search team members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          <div className="space-y-1">
            {filteredMembers.map(member => (
              <div
                key={member.id}
                onClick={() => handleSelectMember(member)}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
              >
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-white text-sm">
                      {member.full_name || member.email.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${getStatusColor(member.status)}`} />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{member.full_name || member.email}</div>
                  <div className="text-xs text-muted-foreground">{member.role} • {member.department}</div>
                </div>
              </div>
            ))}
          </div>

          {filteredMembers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No team members found.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {selectedMembers.length > 0 ? (
              <span>{selectedMembers.length} recipient{selectedMembers.length > 1 ? 's' : ''} selected</span>
            ) : (
              <span>Select recipients to start a conversation</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={handleStartConversation}
              disabled={selectedMembers.length === 0}
            >
              {selectedMembers.length > 1 ? (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Start Group Chat
                </>
              ) : (
                <>
                  <User className="h-4 w-4 mr-2" />
                  Start Conversation
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}