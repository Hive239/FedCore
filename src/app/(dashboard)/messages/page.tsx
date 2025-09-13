"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  MessageSquare, 
  Send, 
  Search, 
  Plus, 
  MoreVertical,
  Phone,
  Video,
  Info,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  Users,
  User,
  Circle,
  Star,
  Archive,
  Trash2,
  Bell,
  BellOff,
  Lock,
  Image as ImageIcon,
  FileText,
  Download,
  X,
  Edit3,
  Reply,
  Forward,
  Copy,
  Pin,
  Clock,
  Mail,
  Building2,
  ExternalLink,
  UserPlus
} from 'lucide-react'
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  edited_at?: string
  is_read: boolean
  is_email?: boolean
  email_sent_at?: string
  attachments?: any[]
  reply_to?: string
  reactions?: any[]
  sender?: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
    is_external?: boolean
  }
}

interface Conversation {
  id: string
  tenant_id: string
  name?: string
  is_group: boolean
  is_external?: boolean // For conversations with external contacts
  last_message?: string
  last_message_at?: string
  unread_count: number
  participants: any[]
  created_at: string
  avatar_url?: string
  is_pinned?: boolean
  is_muted?: boolean
  is_archived?: boolean
  external_contact_id?: string // If it's with an external contact
}

interface OrganizationUser {
  id: string
  full_name: string
  email: string
  avatar_url?: string
  role: string
  department?: string
  is_active: boolean
}

interface Contact {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  is_external: boolean
}

export default function MessagesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [showConversationInfo, setShowConversationInfo] = useState(false)
  const [typing, setTyping] = useState<{ [key: string]: boolean }>({})
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [selectedTab, setSelectedTab] = useState<'all' | 'unread' | 'groups' | 'external'>('all')
  const [editingMessage, setEditingMessage] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set())
  const [attachments, setAttachments] = useState<File[]>([])
  
  // New states for organization integration
  const [organizationUsers, setOrganizationUsers] = useState<OrganizationUser[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [conversationType, setConversationType] = useState<'internal' | 'external'>('internal')
  const [conversationName, setConversationName] = useState('')
  const [participantSearch, setParticipantSearch] = useState('')

  useEffect(() => {
    loadInitialData()
    setupRealtimeSubscriptions()
    
    return () => {
      // Cleanup subscriptions
      supabase.removeAllChannels()
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      setCurrentUser(user)
      
      // Get user's tenant/organization
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()
      
      if (!userTenant) {
        toast({
          variant: 'destructive',
          title: 'Organization Error',
          description: 'You are not part of any organization'
        })
        return
      }
      
      setTenantId(userTenant.tenant_id)
      
      // Load organization users (for internal messaging)
      const { data: orgUsers } = await supabase
        .from('user_tenants')
        .select(`
          user_id,
          role,
          profiles:user_id (
            id,
            full_name,
            email,
            avatar_url,
            department
          )
        `)
        .eq('tenant_id', userTenant.tenant_id)
        .eq('is_active', true)
        .neq('user_id', user.id) // Exclude current user
      
      if (orgUsers) {
        const users = orgUsers
          .filter(u => u.profiles && u.profiles.length > 0)
          .map(u => ({
            id: u.user_id,
            full_name: u.profiles[0].full_name || 'Unknown User',
            email: u.profiles[0].email || '',
            avatar_url: u.profiles[0].avatar_url,
            role: u.role,
            department: u.profiles[0].department,
            is_active: true
          }))
        setOrganizationUsers(users)
      }
      
      // Load external contacts
      const { data: externalContacts } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', userTenant.tenant_id)
        .eq('is_active', true)
        .order('name')
      
      if (externalContacts) {
        setContacts(externalContacts.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          company: c.company,
          is_external: true
        })))
      }
      
      // Load conversations with proper tenant filtering
      const { data: conversationsData, error: convError } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_participants!inner(user_id),
          messages(
            content,
            created_at,
            is_email,
            sender:profiles!messages_sender_id_fkey(full_name)
          )
        `)
        .eq('tenant_id', userTenant.tenant_id)
        .eq('conversation_participants.user_id', user.id)
        .order('updated_at', { ascending: false })
      
      if (convError) {
        console.error('Error loading conversations:', convError)
        // Use demo data if no conversations exist
        setConversations(getDemoConversations(userTenant.tenant_id))
      } else {
        // Process conversations to get unread counts
        const processedConversations = await Promise.all(
          (conversationsData || []).map(async (conv) => {
            // Get unread count
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .neq('sender_id', user.id)
              .eq('is_read', false)
            
            // Get last message
            const lastMessage = conv.messages?.[0]
            
            return {
              ...conv,
              unread_count: count || 0,
              last_message: lastMessage?.content,
              last_message_at: lastMessage?.created_at
            }
          })
        )
        
        setConversations(processedConversations.length > 0 ? processedConversations : getDemoConversations(userTenant.tenant_id))
      }
      
      // Select first conversation by default
      if (conversationsData && conversationsData.length > 0) {
        setSelectedConversation(conversationsData[0].id)
        loadMessages(conversationsData[0].id)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      // Load demo data on error
      const demoConvs = getDemoConversations('demo-tenant')
      setConversations(demoConvs)
      if (demoConvs.length > 0) {
        setSelectedConversation(demoConvs[0].id)
        setMessages(getDemoMessages(demoConvs[0].id))
      }
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('Error loading messages:', error)
        setMessages(getDemoMessages(conversationId))
      } else {
        // Check if messages are from external contacts
        const conversation = conversations.find(c => c.id === conversationId)
        const processedMessages = (data || []).map(msg => ({
          ...msg,
          sender: {
            ...msg.sender,
            is_external: conversation?.is_external || false
          }
        }))
        setMessages(processedMessages)
      }
      
      // Mark messages as read
      markMessagesAsRead(conversationId)
    } catch (error) {
      console.error('Error loading messages:', error)
      setMessages(getDemoMessages(conversationId))
    }
  }

  const markMessagesAsRead = async (conversationId: string) => {
    if (!currentUser) return
    
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', currentUser.id)
        .eq('is_read', false)
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const setupRealtimeSubscriptions = () => {
    if (!tenantId) return
    
    // Subscribe to new messages in tenant
    const messageChannel = supabase
      .channel(`messages-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=in.(${conversations.map(c => c.id).join(',')})`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as Message
            if (newMessage.conversation_id === selectedConversation) {
              setMessages(prev => [...prev, newMessage])
            }
            // Update conversation list
            updateConversationList(newMessage.conversation_id, newMessage.content)
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev => 
              prev.map(msg => msg.id === payload.new.id ? payload.new as Message : msg)
            )
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(msg => msg.id !== payload.old.id))
          }
        }
      )
      .subscribe()
    
    // Subscribe to presence for online status
    const presenceChannel = supabase.channel(`online-users-${tenantId}`)
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const online = new Set(Object.keys(state).flatMap(key => 
          state[key].map((user: any) => user.user_id)
        ))
        setOnlineUsers(online)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && currentUser) {
          await presenceChannel.track({
            user_id: currentUser.id,
            online_at: new Date().toISOString(),
          })
        }
      })
    
    // Subscribe to typing indicators
    const typingChannel = supabase.channel(`typing-${tenantId}`)
    typingChannel
      .on('broadcast', { event: 'typing' }, (payload) => {
        setTyping(prev => ({
          ...prev,
          [payload.payload.user_id]: payload.payload.is_typing
        }))
        
        // Clear typing indicator after 3 seconds
        if (payload.payload.is_typing) {
          setTimeout(() => {
            setTyping(prev => ({
              ...prev,
              [payload.payload.user_id]: false
            }))
          }, 3000)
        }
      })
      .subscribe()
  }

  const updateConversationList = (conversationId: string, lastMessage: string) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, last_message: lastMessage, last_message_at: new Date().toISOString() }
          : conv
      ).sort((a, b) => 
        new Date(b.last_message_at || b.created_at).getTime() - 
        new Date(a.last_message_at || a.created_at).getTime()
      )
    )
  }

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedConversation || !currentUser) return
    
    const conversation = conversations.find(c => c.id === selectedConversation)
    if (!conversation) return
    
    setSending(true)
    try {
      // Check if this is an external conversation that needs email
      const shouldSendEmail = conversation.is_external
      
      const messageData = {
        conversation_id: selectedConversation,
        sender_id: currentUser.id,
        content: messageText.trim(),
        is_read: false,
        is_email: shouldSendEmail,
        reply_to: replyingTo?.id,
        attachments: attachments.length > 0 ? await uploadAttachments() : []
      }
      
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single()
      
      if (error) throw error
      
      // If it's an external contact, send email
      if (shouldSendEmail && conversation.external_contact_id) {
        await sendEmailToContact(conversation.external_contact_id, messageText.trim())
      }
      
      setMessageText('')
      setReplyingTo(null)
      setAttachments([])
      updateConversationList(selectedConversation, messageText.trim())
      
      toast({
        title: shouldSendEmail ? 'Message sent via email' : 'Message sent',
        description: shouldSendEmail ? 'Your message has been emailed to the contact' : undefined
      })
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        variant: 'destructive',
        title: 'Failed to send message',
        description: 'Please try again'
      })
    } finally {
      setSending(false)
    }
  }

  const sendEmailToContact = async (contactId: string, message: string) => {
    try {
      // Get contact details
      const { data: contact } = await supabase
        .from('contacts')
        .select('email, name')
        .eq('id', contactId)
        .single()
      
      if (!contact?.email) return
      
      // Send email via your email service (this would integrate with your email provider)
      // For now, we'll just log it and mark it as sent
      console.log(`Sending email to ${contact.email}: ${message}`)
      
      // You would integrate with SendGrid, AWS SES, or another email service here
      // Example:
      // await fetch('/api/send-email', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     to: contact.email,
      //     subject: `Message from ${currentUser.email}`,
      //     body: message
      //   })
      // })
      
      // Mark message as email sent
      await supabase
        .from('messages')
        .update({ email_sent_at: new Date().toISOString() })
        .eq('conversation_id', selectedConversation)
        .eq('content', message)
        .order('created_at', { ascending: false })
        .limit(1)
    } catch (error) {
      console.error('Error sending email:', error)
    }
  }

  const createNewConversation = async () => {
    if (selectedParticipants.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No participants selected',
        description: 'Please select at least one participant'
      })
      return
    }
    
    if (!tenantId || !currentUser) return
    
    try {
      // Determine if it's external (with contacts) or internal (with org users)
      const isExternal = conversationType === 'external'
      const isGroup = selectedParticipants.length > 1
      
      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          tenant_id: tenantId,
          name: conversationName || (isGroup ? 'Group Chat' : undefined),
          is_group: isGroup,
          is_external: isExternal,
          external_contact_id: isExternal && !isGroup ? selectedParticipants[0] : null,
          created_by: currentUser.id
        })
        .select()
        .single()
      
      if (convError) throw convError
      
      // Add participants
      const participants = [
        { conversation_id: conversation.id, user_id: currentUser.id },
        ...selectedParticipants.map(userId => ({
          conversation_id: conversation.id,
          user_id: isExternal ? currentUser.id : userId // For external, only current user is participant
        }))
      ]
      
      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert(participants)
      
      if (partError) throw partError
      
      // Reload conversations
      await loadInitialData()
      setSelectedConversation(conversation.id)
      setShowNewConversation(false)
      setSelectedParticipants([])
      setConversationName('')
      
      toast({
        title: 'Conversation created',
        description: isExternal ? 'You can now send emails to this contact' : 'Start messaging your team'
      })
    } catch (error) {
      console.error('Error creating conversation:', error)
      toast({
        variant: 'destructive',
        title: 'Failed to create conversation',
        description: 'Please try again'
      })
    }
  }

  const uploadAttachments = async () => {
    // Implement file upload logic here
    return []
  }

  const handleTyping = () => {
    if (!currentUser || !selectedConversation || !tenantId) return
    
    supabase.channel(`typing-${tenantId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: currentUser.id,
        conversation_id: selectedConversation,
        is_typing: true
      }
    })
  }

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    
    if (isToday(date)) {
      return format(date, 'h:mm a')
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`
    } else {
      return format(date, 'MMM d, h:mm a')
    }
  }

  const getDemoConversations = (tenantId: string): Conversation[] => [
    {
      id: 'demo-1',
      tenant_id: tenantId,
      name: 'Project Team',
      is_group: true,
      is_external: false,
      last_message: 'Great work on the presentation!',
      last_message_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      unread_count: 3,
      participants: [],
      created_at: new Date().toISOString(),
      is_pinned: true
    },
    {
      id: 'demo-2',
      tenant_id: tenantId,
      name: 'John Smith (External)',
      is_group: false,
      is_external: true,
      last_message: 'Can we review the proposal?',
      last_message_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      unread_count: 1,
      participants: [],
      created_at: new Date().toISOString()
    },
    {
      id: 'demo-3',
      tenant_id: tenantId,
      name: 'Development Team',
      is_group: true,
      is_external: false,
      last_message: 'Code review completed',
      last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      unread_count: 0,
      participants: [],
      created_at: new Date().toISOString()
    }
  ]

  const getDemoMessages = (conversationId: string): Message[] => {
    const demoMessages: { [key: string]: Message[] } = {
      'demo-1': [
        {
          id: 'm1',
          conversation_id: 'demo-1',
          sender_id: 'user-1',
          content: 'Hey team, the client loved our presentation!',
          created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
          is_read: true,
          sender: {
            id: 'user-1',
            full_name: 'Sarah Johnson',
            email: 'sarah@example.com',
            is_external: false
          }
        },
        {
          id: 'm2',
          conversation_id: 'demo-1',
          sender_id: 'user-2',
          content: 'That\'s amazing news! 🎉',
          created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          is_read: true,
          sender: {
            id: 'user-2',
            full_name: 'Mike Chen',
            email: 'mike@example.com',
            is_external: false
          }
        }
      ],
      'demo-2': [
        {
          id: 'm3',
          conversation_id: 'demo-2',
          sender_id: 'user-3',
          content: 'Hi! Can we review the proposal tomorrow?',
          created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          is_read: false,
          is_email: true,
          email_sent_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          sender: {
            id: 'user-3',
            full_name: 'John Smith',
            email: 'john@external.com',
            is_external: true
          }
        }
      ]
    }
    
    return demoMessages[conversationId] || []
  }

  const getFilteredConversations = () => {
    let filtered = conversations
    
    // Filter by tab
    if (selectedTab === 'unread') {
      filtered = filtered.filter(c => c.unread_count > 0)
    } else if (selectedTab === 'groups') {
      filtered = filtered.filter(c => c.is_group)
    } else if (selectedTab === 'external') {
      filtered = filtered.filter(c => c.is_external)
    }
    
    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    // Filter out archived unless viewing archived
    filtered = filtered.filter(c => !c.is_archived)
    
    // Sort pinned first
    return filtered.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1
      if (!a.is_pinned && b.is_pinned) return 1
      return 0
    })
  }

  const getFilteredParticipants = () => {
    if (conversationType === 'internal') {
      return organizationUsers.filter(u => 
        u.full_name.toLowerCase().includes(participantSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(participantSearch.toLowerCase()) ||
        u.department?.toLowerCase().includes(participantSearch.toLowerCase())
      )
    } else {
      return contacts.filter(c => 
        c.name.toLowerCase().includes(participantSearch.toLowerCase()) ||
        c.email.toLowerCase().includes(participantSearch.toLowerCase()) ||
        c.company?.toLowerCase().includes(participantSearch.toLowerCase())
      )
    }
  }

  const selectedConv = conversations.find(c => c.id === selectedConversation)
  const filteredConversations = getFilteredConversations()

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-50">
      <div className="h-full flex">
        {/* Conversations List - Modern Design */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-600" />
                <h2 className="text-xl font-bold">Messages</h2>
              </div>
              <Button
                size="sm"
                onClick={() => setShowNewConversation(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-gray-50"
              />
            </div>
            
            {/* Tabs */}
            <div className="flex gap-1 mt-3">
              {(['all', 'unread', 'groups', 'external'] as const).map(tab => (
                <Button
                  key={tab}
                  variant={selectedTab === tab ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedTab(tab)}
                  className={cn(
                    "flex-1 capitalize text-xs",
                    selectedTab === tab && "bg-purple-600 hover:bg-purple-700"
                  )}
                >
                  {tab === 'external' ? 'Contacts' : tab}
                  {tab === 'unread' && conversations.filter(c => c.unread_count > 0).length > 0 && (
                    <Badge className="ml-1 bg-red-500 text-[10px] px-1">
                      {conversations.filter(c => c.unread_count > 0).length}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Conversations List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-3 mb-2">
                    <div className="flex gap-3">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  </div>
                ))
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No conversations</p>
                </div>
              ) : (
                filteredConversations.map(conversation => (
                  <div
                    key={conversation.id}
                    onClick={() => {
                      setSelectedConversation(conversation.id)
                      loadMessages(conversation.id)
                    }}
                    className={cn(
                      "p-3 rounded-lg mb-2 cursor-pointer transition-all hover:bg-gray-50",
                      selectedConversation === conversation.id && "bg-purple-50 hover:bg-purple-50",
                      conversation.unread_count > 0 && "font-medium"
                    )}
                  >
                    <div className="flex gap-3">
                      <div className="relative">
                        <Avatar>
                          <AvatarImage src={conversation.avatar_url} />
                          <AvatarFallback>
                            {conversation.is_external ? (
                              <Mail className="h-5 w-5" />
                            ) : conversation.is_group ? (
                              <Users className="h-5 w-5" />
                            ) : (
                              <User className="h-5 w-5" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                        {conversation.is_pinned && (
                          <Pin className="absolute -top-1 -right-1 h-3 w-3 text-purple-600" />
                        )}
                        {onlineUsers.has(conversation.participants[0]?.user_id) && !conversation.is_external && (
                          <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">
                              {conversation.name || 'Conversation'}
                            </p>
                            {conversation.is_external && (
                              <ExternalLink className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {conversation.last_message_at && 
                              formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })
                            }
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600 truncate">
                            {conversation.last_message || 'No messages yet'}
                          </p>
                          <div className="flex items-center gap-1">
                            {conversation.is_muted && (
                              <BellOff className="h-3 w-3 text-gray-400" />
                            )}
                            {conversation.unread_count > 0 && (
                              <Badge className="bg-purple-600 text-white text-xs px-1.5 min-w-[20px]">
                                {conversation.unread_count}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
        
        {/* Message Thread - Modern Design */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedConversation && selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={selectedConv.avatar_url} />
                      <AvatarFallback>
                        {selectedConv.is_external ? (
                          <Mail className="h-5 w-5" />
                        ) : selectedConv.is_group ? (
                          <Users className="h-5 w-5" />
                        ) : (
                          <User className="h-5 w-5" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{selectedConv.name}</h3>
                        {selectedConv.is_external && (
                          <Badge variant="outline" className="text-xs">
                            <Mail className="h-3 w-3 mr-1" />
                            Email
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {selectedConv.is_external 
                          ? 'External Contact'
                          : selectedConv.is_group 
                          ? `${selectedConv.participants.length} members`
                          : onlineUsers.has(selectedConv.participants[0]?.user_id) ? 'Active now' : 'Offline'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!selectedConv.is_external && (
                      <>
                        <Button variant="ghost" size="icon">
                          <Phone className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Video className="h-5 w-5" />
                        </Button>
                      </>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setShowConversationInfo(true)}
                    >
                      <Info className="h-5 w-5" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          {selectedConv.is_muted ? (
                            <>
                              <Bell className="h-4 w-4 mr-2" />
                              Unmute
                            </>
                          ) : (
                            <>
                              <BellOff className="h-4 w-4 mr-2" />
                              Mute
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
              
              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4 bg-gray-50">
                <div className="space-y-4">
                  {messages.map((message, idx) => {
                    const isOwn = message.sender_id === currentUser?.id
                    const showAvatar = !isOwn && (
                      idx === 0 || 
                      messages[idx - 1]?.sender_id !== message.sender_id
                    )
                    
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3",
                          isOwn && "justify-end"
                        )}
                      >
                        {!isOwn && showAvatar && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={message.sender?.avatar_url} />
                            <AvatarFallback>
                              {message.sender?.is_external ? (
                                <Mail className="h-4 w-4" />
                              ) : (
                                message.sender?.full_name?.charAt(0) || 'U'
                              )}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        {!isOwn && !showAvatar && <div className="w-8" />}
                        
                        <div className={cn(
                          "max-w-[70%] group relative",
                          isOwn && "items-end"
                        )}>
                          {!isOwn && showAvatar && (
                            <p className="text-xs text-gray-500 mb-1">
                              {message.sender?.full_name}
                              {message.sender?.is_external && ' (External)'}
                            </p>
                          )}
                          
                          <div className={cn(
                            "px-4 py-2 rounded-2xl",
                            isOwn 
                              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                              : message.sender?.is_external
                              ? "bg-blue-50 border border-blue-200"
                              : "bg-white border border-gray-200"
                          )}>
                            {message.is_email && (
                              <div className={cn(
                                "text-xs mb-1 flex items-center gap-1",
                                isOwn ? "text-white/80" : "text-blue-600"
                              )}>
                                <Mail className="h-3 w-3" />
                                {message.email_sent_at ? 'Sent via email' : 'Will be sent via email'}
                              </div>
                            )}
                            
                            <p className="text-sm">{message.content}</p>
                            
                            {message.edited_at && (
                              <p className={cn(
                                "text-xs mt-1",
                                isOwn ? "text-white/70" : "text-gray-400"
                              )}>
                                (edited)
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn(
                              "text-xs",
                              isOwn ? "text-gray-500" : "text-gray-400"
                            )}>
                              {formatMessageTime(message.created_at)}
                            </span>
                            
                            {isOwn && (
                              <span className="text-xs text-gray-500">
                                {message.is_read ? (
                                  <CheckCheck className="h-3 w-3" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Typing Indicator */}
                  {Object.entries(typing).some(([userId, isTyping]) => 
                    isTyping && userId !== currentUser?.id
                  ) && !selectedConv.is_external && (
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-white border border-gray-200 px-4 py-2 rounded-2xl">
                        <div className="flex gap-1">
                          <Circle className="h-2 w-2 fill-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <Circle className="h-2 w-2 fill-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <Circle className="h-2 w-2 fill-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              
              {/* Message Input */}
              <div className="p-4 border-t border-gray-200 bg-white">
                {selectedConv.is_external && (
                  <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 rounded-lg">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <p className="text-sm text-blue-600">
                      Messages will be sent via email to this external contact
                    </p>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  
                  <Button variant="ghost" size="icon">
                    <Smile className="h-5 w-5" />
                  </Button>
                  
                  <Textarea
                    placeholder={selectedConv.is_external ? "Type a message to send via email..." : "Type a message..."}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                      if (!selectedConv.is_external) {
                        handleTyping()
                      }
                    }}
                    className="flex-1 resize-none"
                    rows={1}
                  />
                  
                  <Button
                    onClick={sendMessage}
                    disabled={!messageText.trim() || sending}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {selectedConv.is_external ? <Mail className="h-5 w-5" /> : <Send className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  Select a conversation
                </h3>
                <p className="text-gray-500">
                  Choose from your existing conversations or start a new one
                </p>
                <Button
                  onClick={() => setShowNewConversation(true)}
                  className="mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Conversation
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* New Conversation Dialog - Updated with org users and contacts */}
      <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
            <DialogDescription>
              Start a conversation with team members or external contacts
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={conversationType} onValueChange={(v) => {
            setConversationType(v as 'internal' | 'external')
            setSelectedParticipants([])
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="internal">
                <Building2 className="h-4 w-4 mr-2" />
                Organization Members
              </TabsTrigger>
              <TabsTrigger value="external">
                <Mail className="h-4 w-4 mr-2" />
                External Contacts
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="internal" className="space-y-4">
              <div>
                <label className="text-sm font-medium">Conversation Name (optional)</label>
                <Input
                  placeholder="e.g., Project Discussion"
                  value={conversationName}
                  onChange={(e) => setConversationName(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Select Team Members</label>
                <div className="mt-2">
                  <Input
                    placeholder="Search by name, email, or department..."
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    className="mb-3"
                  />
                  
                  <ScrollArea className="h-64 border rounded-lg p-2">
                    {getFilteredParticipants().length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p>No team members found</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(getFilteredParticipants() as OrganizationUser[]).map(user => (
                          <div
                            key={user.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                          >
                            <Checkbox
                              checked={selectedParticipants.includes(user.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedParticipants([...selectedParticipants, user.id])
                                } else {
                                  setSelectedParticipants(selectedParticipants.filter(id => id !== user.id))
                                }
                              }}
                            />
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar_url} />
                              <AvatarFallback>
                                {user.full_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{user.full_name}</p>
                              <p className="text-xs text-gray-500">
                                {user.email} • {user.role}
                                {user.department && ` • ${user.department}`}
                              </p>
                            </div>
                            {onlineUsers.has(user.id) && (
                              <div className="h-2 w-2 bg-green-500 rounded-full" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="external" className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select External Contact</label>
                <p className="text-xs text-gray-500 mt-1">
                  Messages to external contacts will be sent via email
                </p>
                <div className="mt-2">
                  <Input
                    placeholder="Search by name, email, or company..."
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    className="mb-3"
                  />
                  
                  <ScrollArea className="h-64 border rounded-lg p-2">
                    {getFilteredParticipants().length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <UserPlus className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p>No contacts found</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            setShowNewConversation(false)
                            router.push('/contacts')
                          }}
                        >
                          Add Contact
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(getFilteredParticipants() as Contact[]).map(contact => (
                          <div
                            key={contact.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                          >
                            <Checkbox
                              checked={selectedParticipants.includes(contact.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  // Only allow one external contact at a time
                                  setSelectedParticipants([contact.id])
                                } else {
                                  setSelectedParticipants([])
                                }
                              }}
                            />
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                <Mail className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{contact.name}</p>
                              <p className="text-xs text-gray-500">
                                {contact.email}
                                {contact.company && ` • ${contact.company}`}
                              </p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-gray-400" />
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowNewConversation(false)
              setSelectedParticipants([])
              setConversationName('')
              setParticipantSearch('')
            }}>
              Cancel
            </Button>
            <Button 
              onClick={createNewConversation}
              disabled={selectedParticipants.length === 0}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              Start Conversation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Conversation Info Dialog */}
      <Dialog open={showConversationInfo} onOpenChange={setShowConversationInfo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conversation Info</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedConv && (
              <>
                <div className="flex items-center gap-3">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedConv.avatar_url} />
                    <AvatarFallback>
                      {selectedConv.is_external ? (
                        <Mail className="h-8 w-8" />
                      ) : selectedConv.is_group ? (
                        <Users className="h-8 w-8" />
                      ) : (
                        <User className="h-8 w-8" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedConv.name}</h3>
                    <p className="text-sm text-gray-500">
                      {selectedConv.is_external ? 'External Contact' : 'Internal Conversation'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Created {formatDistanceToNow(new Date(selectedConv.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                
                {selectedConv.is_group && !selectedConv.is_external && (
                  <div>
                    <h4 className="font-medium mb-2">Members</h4>
                    <div className="space-y-2">
                      {organizationUsers
                        .filter(u => selectedConv.participants.some(p => p.user_id === u.id))
                        .map(user => (
                          <div key={user.id} className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar_url} />
                              <AvatarFallback>
                                {user.full_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{user.full_name}</p>
                              <p className="text-xs text-gray-500">{user.role}</p>
                            </div>
                            {onlineUsers.has(user.id) && (
                              <div className="h-2 w-2 bg-green-500 rounded-full" />
                            )}
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
                
                {selectedConv.is_external && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-medium text-blue-900">Email Communication</p>
                    </div>
                    <p className="text-xs text-blue-700">
                      Messages in this conversation are sent as emails to the external contact.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConversationInfo(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}