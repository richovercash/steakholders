'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Notification } from '@/types/database'

interface UseRealtimeNotificationsOptions {
  userId: string | null
  onNewNotification?: (notification: Notification) => void
  onNotificationUpdate?: (notification: Notification) => void
  enabled?: boolean
}

export function useRealtimeNotifications({
  userId,
  onNewNotification,
  onNotificationUpdate,
  enabled = true,
}: UseRealtimeNotificationsOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(createClient())

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabaseRef.current.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!enabled || !userId) {
      cleanup()
      return
    }

    const supabase = supabaseRef.current

    // Subscribe to notifications for this user
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Realtime] New notification:', payload.new)
          onNewNotification?.(payload.new as Notification)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Realtime] Notification updated:', payload.new)
          onNotificationUpdate?.(payload.new as Notification)
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Notification subscription status:', status)
      })

    channelRef.current = channel

    return cleanup
  }, [userId, enabled, onNewNotification, onNotificationUpdate, cleanup])

  return {
    unsubscribe: cleanup,
  }
}
