'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Send, Building2, Warehouse } from 'lucide-react'
import type { Message, Organization } from '@/types/database'
import {
  getOrganizationById,
  getConversationMessages,
  getUserProfile,
  sendMessage as sendMessageAction,
  markMessagesAsRead,
} from '@/lib/actions/messages'

interface MessageWithSender extends Message {
  sender: { full_name: string } | null
}

export default function ConversationPage() {
  const params = useParams()
  const orgId = params.orgId as string
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [partnerOrg, setPartnerOrg] = useState<Organization | null>(null)
  const [myOrgId, setMyOrgId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  // Memoize supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), [])

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load conversation data using server actions
  useEffect(() => {
    async function loadConversation() {
      setLoading(true)
      try {
        // Get user's profile and org via server action
        const profile = await getUserProfile()

        if (!profile) {
          router.push('/login')
          return
        }

        setMyOrgId(profile.organization_id)
        setUserId(profile.id)

        // Get partner organization via server action
        const partner = await getOrganizationById(orgId)

        if (!partner) {
          setError('Organization not found')
          return
        }

        setPartnerOrg(partner)

        // Fetch messages between the two orgs via server action
        const msgs = await getConversationMessages(profile.organization_id, orgId)
        setMessages(msgs)

        // Mark messages as read via server action
        await markMessagesAsRead(orgId, profile.organization_id)

      } catch (err) {
        console.error('Load error:', err)
        setError('Failed to load conversation')
      } finally {
        setLoading(false)
      }
    }

    loadConversation()
  }, [orgId, router])

  // Set up real-time subscription
  useEffect(() => {
    if (!myOrgId) return

    const channel = supabase
      .channel(`messages:${myOrgId}:${orgId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_org_id=eq.${myOrgId}`,
        },
        async (payload) => {
          // Only add if it's from this conversation partner
          if (payload.new.sender_org_id === orgId) {
            // Fetch the full message with sender info
            const { data: newMsg } = await supabase
              .from('messages')
              .select(`
                *,
                sender:users!sender_id(full_name)
              `)
              .eq('id', payload.new.id)
              .single() as { data: MessageWithSender | null }

            if (newMsg) {
              setMessages(prev => [...prev, newMsg])

              // Mark as read
              await supabase
                .from('messages')
                .update({ read_at: new Date().toISOString() } as never)
                .eq('id', newMsg.id)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [myOrgId, orgId, supabase])

  const handleSend = async () => {
    if (!newMessage.trim() || !myOrgId || !userId) return

    setSending(true)
    try {
      // Use server action to send message
      const insertedMsg = await sendMessageAction(userId, myOrgId, orgId, newMessage)

      if (!insertedMsg) {
        setError('Failed to send message')
        return
      }

      setMessages(prev => [...prev, insertedMsg])
      setNewMessage('')
    } catch (err) {
      console.error('Send error:', err)
      setError('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
        ' ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (error && !partnerOrg) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard/messages" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Messages
          </Link>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-600">{error}</p>
            <Link href="/dashboard/messages">
              <Button className="mt-4" variant="outline">
                Return to Messages
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Link href="/dashboard/messages" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            partnerOrg?.type === 'producer' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {partnerOrg?.type === 'producer' ? <Building2 className="h-5 w-5" /> : <Warehouse className="h-5 w-5" />}
          </div>
          <div>
            <h1 className="text-xl font-bold">{partnerOrg?.name}</h1>
            <p className="text-sm text-gray-500 capitalize">{partnerOrg?.type}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <p>No messages yet.</p>
              <p className="text-sm mt-1">Start the conversation below!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_org_id === myOrgId
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-4 py-2 ${
                      isMe
                        ? 'bg-green-700 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {!isMe && msg.sender?.full_name && (
                      <p className="text-xs font-medium mb-1 opacity-75">
                        {msg.sender.full_name}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${isMe ? 'text-green-200' : 'text-gray-400'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input */}
        <CardHeader className="border-t p-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-2 rounded-md text-sm mb-2">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className="resize-none"
              disabled={sending}
            />
            <Button
              className="bg-green-700 hover:bg-green-800 shrink-0"
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </CardHeader>
      </Card>
    </div>
  )
}
