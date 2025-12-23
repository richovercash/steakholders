'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Check, CheckCheck, Package, MessageSquare, Calendar, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '@/lib/notifications/actions'
import { useRealtimeNotifications } from '@/lib/notifications/useRealtimeNotifications'
import type { NotificationWithRelations, NotificationType, Notification } from '@/types/database'

function getNotificationIcon(type: string) {
  switch (type as NotificationType) {
    case 'order_submitted':
    case 'order_confirmed':
    case 'order_status_update':
    case 'order_ready':
    case 'order_complete':
      return <Package className="h-4 w-4" />
    case 'new_message':
      return <MessageSquare className="h-4 w-4" />
    case 'slot_available':
      return <Calendar className="h-4 w-4" />
    default:
      return <Info className="h-4 w-4" />
  }
}

function getNotificationLink(notification: NotificationWithRelations): string | null {
  if (notification.processing_order_id) {
    return `/dashboard/orders/${notification.processing_order_id}`
  }
  if (notification.message_id) {
    return '/dashboard/messages'
  }
  return null
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return date.toLocaleDateString()
}

interface NotificationBellProps {
  initialCount?: number
  initialNotifications?: NotificationWithRelations[]
  userId?: string | null
}

export function NotificationBell({ initialCount = 0, initialNotifications = [], userId = null }: NotificationBellProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [unreadCount, setUnreadCount] = useState(initialCount)
  const [notifications, setNotifications] = useState<NotificationWithRelations[]>(initialNotifications)
  const [isOpen, setIsOpen] = useState(false)

  // Handle new realtime notifications
  const handleNewNotification = useCallback((notification: Notification) => {
    // Add to list and increment count
    setNotifications(prev => [notification as NotificationWithRelations, ...prev.slice(0, 9)])
    setUnreadCount(prev => prev + 1)
  }, [])

  // Handle realtime notification updates (e.g., marked as read)
  const handleNotificationUpdate = useCallback((notification: Notification) => {
    setNotifications(prev =>
      prev.map(n => n.id === notification.id ? { ...n, ...notification } as NotificationWithRelations : n)
    )
    // Recalculate unread count
    if (notification.read_at) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }, [])

  // Subscribe to realtime notifications
  useRealtimeNotifications({
    userId,
    onNewNotification: handleNewNotification,
    onNotificationUpdate: handleNotificationUpdate,
    enabled: !!userId,
  })

  // Refresh notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      startTransition(async () => {
        const [notifs, count] = await Promise.all([
          getNotifications(10),
          getUnreadCount()
        ])
        setNotifications(notifs)
        setUnreadCount(count)
      })
    }
  }, [isOpen])

  // Periodic refresh of unread count (fallback if realtime not working)
  useEffect(() => {
    const interval = setInterval(async () => {
      const count = await getUnreadCount()
      setUnreadCount(count)
    }, 60000) // Every 60 seconds (increased since we have realtime)

    return () => clearInterval(interval)
  }, [])

  const handleMarkAsRead = async (notificationId: string) => {
    startTransition(async () => {
      await markAsRead(notificationId)
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    })
  }

  const handleMarkAllAsRead = async () => {
    startTransition(async () => {
      await markAllAsRead()
      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      )
      setUnreadCount(0)
    })
  }

  const handleNotificationClick = async (notification: NotificationWithRelations) => {
    // Mark as read if not already
    if (!notification.read_at) {
      await handleMarkAsRead(notification.id)
    }

    // Navigate to related page
    const link = getNotificationLink(notification)
    if (link) {
      setIsOpen(false)
      router.push(link)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="notification-bell">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs"
              onClick={handleMarkAllAsRead}
              disabled={isPending}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            No notifications yet
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex items-start gap-3 p-3 cursor-pointer ${
                  !notification.read_at ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className={`mt-0.5 ${!notification.read_at ? 'text-blue-600' : 'text-gray-400'}`}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!notification.read_at ? 'font-medium' : ''}`}>
                    {notification.title}
                  </p>
                  {notification.body && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {notification.body}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {formatTimeAgo(notification.created_at)}
                  </p>
                </div>
                {!notification.read_at && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMarkAsRead(notification.id)
                    }}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                )}
              </DropdownMenuItem>
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="justify-center">
          <Link href="/dashboard/notifications" className="text-sm text-blue-600">
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
