'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Send, Building2, Warehouse } from 'lucide-react'
import type { Message } from '@/types/database'
import {
  sendMessage as sendMessageAction,
  markMessagesAsRead,
  getNewMessages,
} from '@/lib/actions/messages'
import { MESSAGE_POLL_INTERVAL_MS } from '@/lib/constants'

interface MessageWithSender extends Message {
  sender: { full_name: string } | null
}

interface ConversationClientProps {
  partnerOrgId: string
  partnerOrgName: string
  partnerOrgType: string
  myOrgId: string
  userId: string
  initialMessages: MessageWithSender[]
}

export default function ConversationClient({
  partnerOrgId,
  partnerOrgName,
  partnerOrgType,
  myOrgId,
  userId,
  initialMessages,
}: ConversationClientProps) {
  const [messages, setMessages] = useState<MessageWithSender[]>(initialMessages)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastMessageTimeRef = useRef<string>(
    initialMessages.length > 0
      ? initialMessages[initialMessages.length - 1].created_at
      : new Date().toISOString()
  )

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Mark messages as read on mount
  useEffect(() => {
    markMessagesAsRead(partnerOrgId, myOrgId)
  }, [partnerOrgId, myOrgId])

  // Poll for new messages
  const pollForMessages = useCallback(async () => {
    try {
      const newMsgs = await getNewMessages(myOrgId, partnerOrgId, lastMessageTimeRef.current)
      if (newMsgs.length > 0) {
        setMessages(prev => {
          // Filter out duplicates based on message id
          const existingIds = new Set(prev.map(m => m.id))
          const uniqueNewMsgs = newMsgs.filter(m => !existingIds.has(m.id))
          if (uniqueNewMsgs.length > 0) {
            // Update the last message timestamp
            lastMessageTimeRef.current = uniqueNewMsgs[uniqueNewMsgs.length - 1].created_at
            return [...prev, ...uniqueNewMsgs]
          }
          return prev
        })
      }
    } catch (err) {
      console.error('Polling error:', err)
    }
  }, [myOrgId, partnerOrgId])

  // Set up polling interval
  useEffect(() => {
    const intervalId = setInterval(pollForMessages, MESSAGE_POLL_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [pollForMessages])

  const handleSend = async () => {
    if (!newMessage.trim()) return

    setSending(true)
    setError(null)
    try {
      const insertedMsg = await sendMessageAction(userId, myOrgId, partnerOrgId, newMessage)

      if (!insertedMsg) {
        setError('Failed to send message')
        return
      }

      setMessages(prev => [...prev, insertedMsg])
      lastMessageTimeRef.current = insertedMsg.created_at
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

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Link href="/dashboard/messages" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            partnerOrgType === 'producer' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {partnerOrgType === 'producer' ? <Building2 className="h-5 w-5" /> : <Warehouse className="h-5 w-5" />}
          </div>
          <div>
            <h1 className="text-xl font-bold">{partnerOrgName}</h1>
            <p className="text-sm text-gray-500 capitalize">{partnerOrgType}</p>
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
