"use client"

import { useState, useEffect } from 'react'
import { Search, Users, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'

interface Conversation {
  id: string
  name: string
  lastMessage: string
  lastMessageTime: Date
  unreadCount: number
  avatar?: string
  isGroup: boolean
  participants: string[]
}

interface ConversationListProps {
  conversations: Conversation[]
  selectedId?: string
  onSelectConversation: (id: string) => void
}

export function ConversationList({ 
  conversations, 
  selectedId, 
  onSelectConversation 
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  
  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-50 border-gray-200"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.map((conversation) => (
          <div
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={`flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors ${
              selectedId === conversation.id ? 'bg-blue-50' : ''
            }`}
          >
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={conversation.avatar} />
                <AvatarFallback className="bg-primary text-white">
                  {conversation.isGroup ? (
                    <Users className="h-6 w-6" />
                  ) : (
                    conversation.name.slice(0, 2).toUpperCase()
                  )}
                </AvatarFallback>
              </Avatar>
              {conversation.unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                  {conversation.unreadCount}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium text-gray-900 truncate">
                  {conversation.name}
                </h4>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(conversation.lastMessageTime, { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-gray-600 truncate">
                {conversation.lastMessage}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}