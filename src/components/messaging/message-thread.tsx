"use client"

import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, MoreVertical, Phone, Video, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { format } from 'date-fns'

interface Message {
  id: string
  content: string
  senderId: string
  senderName: string
  senderAvatar?: string
  timestamp: Date
  isOwn: boolean
  status?: 'sent' | 'delivered' | 'read'
}

interface MessageThreadProps {
  conversationName: string
  conversationAvatar?: string
  messages: Message[]
  onSendMessage: (content: string) => void
  currentUserId: string
}

export function MessageThread({
  conversationName,
  conversationAvatar,
  messages,
  onSendMessage,
  currentUserId
}: MessageThreadProps) {
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim())
      setNewMessage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = format(message.timestamp, 'yyyy-MM-dd')
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(message)
    return groups
  }, {} as Record<string, Message[]>)

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={conversationAvatar} />
            <AvatarFallback className="bg-primary text-white">
              {conversationName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-gray-900">{conversationName}</h3>
            <p className="text-xs text-gray-500">Active now</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date Separator */}
            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-500 font-medium">
                {format(new Date(date), 'MMMM d, yyyy')}
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Messages for this date */}
            <div className="space-y-3">
              {dateMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-2 max-w-[70%] ${message.isOwn ? 'flex-row-reverse' : ''}`}>
                    {!message.isOwn && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={message.senderAvatar} />
                        <AvatarFallback className="bg-gray-300 text-gray-700 text-xs">
                          {message.senderName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      {!message.isOwn && (
                        <p className="text-xs text-gray-500 mb-1">{message.senderName}</p>
                      )}
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          message.isOwn
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <p className={`text-xs text-gray-500 mt-1 ${message.isOwn ? 'text-right' : ''}`}>
                        {format(message.timestamp, 'h:mm a')}
                        {message.isOwn && message.status && (
                          <span className="ml-2">
                            {message.status === 'read' && '✓✓'}
                            {message.status === 'delivered' && '✓'}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={handleSend} size="icon" className="bg-primary hover:bg-primary-dark">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}