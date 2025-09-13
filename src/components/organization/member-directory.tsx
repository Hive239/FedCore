"use client"

import { useState } from 'react'
import { Search, Mail, Phone, MessageSquare, UserPlus, Filter, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTeamMembers, type TeamMember } from '@/lib/hooks/use-team-members'

interface MemberDirectoryProps {
  onStartMessage?: (member: TeamMember) => void
}

export function MemberDirectory({ onStartMessage }: MemberDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const { data: organizationMembers = [], isLoading } = useTeamMembers()

  const departments = ['all', 'General'] // Simplified for current TeamMember structure
  
  const filteredMembers = organizationMembers.filter(member => {
    const matchesSearch = searchQuery === '' || 
      (member.full_name && member.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.role && member.role.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const memberDepartment = 'General' // Since current TeamMember interface doesn't have department
    const matchesDepartment = selectedDepartment === 'all' || memberDepartment === selectedDepartment
    
    return matchesSearch && matchesDepartment
  })

  const getStatusColor = (status: TeamMember['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      case 'busy': return 'bg-red-500'
      case 'offline': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  const getStatusLabel = (status: TeamMember['status']) => {
    switch (status) {
      case 'online': return 'Online'
      case 'away': return 'Away'
      case 'busy': return 'Busy'
      case 'offline': return 'Offline'
      default: return 'Offline'
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Directory</CardTitle>
              <CardDescription>
                {organizationMembers.length} team members in your organization
              </CardDescription>
            </div>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-input bg-background"
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>
                  {dept === 'all' ? 'All Departments' : dept}
                </option>
              ))}
            </select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Members Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMembers.map((member) => (
              <Card key={member.id} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary text-white">
                            {member.full_name || member.email.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${getStatusColor(member.status)}`} />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{member.full_name || member.email}</h4>
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="text-xs truncate">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span className="text-xs">{member.phone}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {member.department}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {getStatusLabel(member.status)}
                      </Badge>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => onStartMessage && onStartMessage(member)}
                      className="h-8"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredMembers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No team members found matching your search.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Organization Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{organizationMembers.length}</div>
            <p className="text-xs text-muted-foreground">Total Members</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {organizationMembers.filter(m => m.status === 'online').length}
            </div>
            <p className="text-xs text-muted-foreground">Online Now</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {new Set(organizationMembers.map(m => m.department)).size}
            </div>
            <p className="text-xs text-muted-foreground">Departments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {new Set(organizationMembers.map(m => m.role)).size}
            </div>
            <p className="text-xs text-muted-foreground">Unique Roles</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}