'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Package,
  MessageSquare,
  Calendar,
  Info,
  Check,
  CheckCheck,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '@/lib/notifications/actions'
import type { NotificationWithRelations, NotificationType } from '@/types/database'
import {
  SECONDS_PER_MINUTE,
  SECONDS_PER_HOUR,
  SECONDS_PER_DAY,
  SECONDS_PER_WEEK,
} from '@/lib/constants'

function getNotificationIcon(type: string) {
  switch (type as NotificationType) {
    case 'order_submitted':
    case 'order_confirmed':
    case 'order_status_update':
    case 'order_ready':
    case 'order_complete':
      return <Package className="h-5 w-5" />
    case 'new_message':
      return <MessageSquare className="h-5 w-5" />
    case 'slot_available':
      return <Calendar className="h-5 w-5" />
    default:
      return <Info className="h-5 w-5" />
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

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < SECONDS_PER_MINUTE) return 'just now'
  if (diffInSeconds < SECONDS_PER_HOUR) return `${Math.floor(diffInSeconds / SECONDS_PER_MINUTE)} minutes ago`
  if (diffInSeconds < SECONDS_PER_DAY) return `${Math.floor(diffInSeconds / SECONDS_PER_HOUR)} hours ago`
  if (diffInSeconds < SECONDS_PER_WEEK) return `${Math.floor(diffInSeconds / SECONDS_PER_DAY)} days ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

function getTypeLabel(type: string): string {
  switch (type as NotificationType) {
    case 'order_submitted':
      return 'New Order'
    case 'order_confirmed':
      return 'Order Confirmed'
    case 'order_status_update':
      return 'Status Update'
    case 'order_ready':
      return 'Ready for Pickup'
    case 'order_complete':
      return 'Completed'
    case 'new_message':
      return 'Message'
    case 'slot_available':
      return 'Availability'
    default:
      return 'System'
  }
}

interface NotificationsListProps {
  initialNotifications: NotificationWithRelations[]
}

export function NotificationsList({ initialNotifications }: NotificationsListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [notifications, setNotifications] = useState(initialNotifications)

  const unreadCount = notifications.filter(n => !n.read_at).length

  const handleMarkAsRead = async (notificationId: string) => {
    startTransition(async () => {
      await markAsRead(notificationId)
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        )
      )
    })
  }

  const handleMarkAllAsRead = async () => {
    startTransition(async () => {
      await markAllAsRead()
      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      )
    })
  }

  const handleDelete = async (notificationId: string) => {
    startTransition(async () => {
      await deleteNotification(notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    })
  }

  const handleClick = async (notification: NotificationWithRelations) => {
    if (!notification.read_at) {
      await handleMarkAsRead(notification.id)
    }
    const link = getNotificationLink(notification)
    if (link) {
      router.push(link)
    }
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-gray-400 mb-2">
            <Info className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No notifications</h3>
          <p className="text-gray-500 mt-1">
            You&apos;re all caught up! Check back later for updates.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((notification) => {
          const link = getNotificationLink(notification)

          return (
            <Card
              key={notification.id}
              className={`transition-colors ${
                !notification.read_at ? 'bg-blue-50 border-blue-200' : ''
              } ${link ? 'cursor-pointer hover:bg-gray-50' : ''}`}
              onClick={() => handleClick(notification)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`mt-0.5 p-2 rounded-full ${
                      !notification.read_at
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`inline-block text-xs px-2 py-0.5 rounded-full mb-1 ${
                            !notification.read_at
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {getTypeLabel(notification.type)}
                        </span>
                        <h3
                          className={`text-sm ${
                            !notification.read_at ? 'font-semibold' : 'font-medium'
                          }`}
                        >
                          {notification.title}
                        </h3>
                        {notification.body && (
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.body}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          {formatDate(notification.created_at)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!notification.read_at && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkAsRead(notification.id)
                            }}
                            disabled={isPending}
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(notification.id)
                          }}
                          disabled={isPending}
                          title="Delete notification"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {link && (
                      <div className="mt-2">
                        <span className="text-xs text-blue-600 hover:underline">
                          View details →
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
