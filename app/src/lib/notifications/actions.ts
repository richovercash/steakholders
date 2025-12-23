'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sendBulkNotificationEmails } from '@/lib/email'
import type { NotificationType, NotificationWithRelations, Json } from '@/types/database'

interface NotificationPreferences {
  email_order_updates?: boolean
  email_messages?: boolean
  email_system?: boolean
}

function getDefaultPreferences(): NotificationPreferences {
  return {
    email_order_updates: true,
    email_messages: true,
    email_system: false,
  }
}

function shouldSendEmail(type: NotificationType, preferences: Json | null): boolean {
  const prefs = (preferences as NotificationPreferences) || getDefaultPreferences()

  if (type.startsWith('order_')) {
    return prefs.email_order_updates !== false
  }
  if (type === 'new_message') {
    return prefs.email_messages !== false
  }
  if (type === 'slot_available') {
    return prefs.email_order_updates !== false
  }
  // system notifications
  return prefs.email_system === true
}

export async function getNotifications(limit = 10): Promise<NotificationWithRelations[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Get user's internal ID
  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single() as { data: { id: string } | null }

  if (!profile) return []

  const { data: notifications } = await supabase
    .from('notifications')
    .select(`
      *,
      processing_order:processing_orders(*)
    `)
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (notifications || []) as NotificationWithRelations[]
}

export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single() as { data: { id: string } | null }

  if (!profile) return 0

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', profile.id)
    .is('read_at', null)

  return count || 0
}

export async function markAsRead(notificationId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() } as never)
    .eq('id', notificationId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard', 'layout')
  return {}
}

export async function markAllAsRead(): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single() as { data: { id: string } | null }

  if (!profile) return { error: 'User not found' }

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() } as never)
    .eq('user_id', profile.id)
    .is('read_at', null)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard', 'layout')
  return {}
}

export async function deleteNotification(notificationId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard', 'layout')
  return {}
}

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  body?: string
  processingOrderId?: string
  messageId?: string
}

export async function createNotification(params: CreateNotificationParams): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      body: params.body || null,
      processing_order_id: params.processingOrderId || null,
      message_id: params.messageId || null,
    } as never)

  if (error) {
    return { error: error.message }
  }

  return {}
}

// Helper to create notifications for all users in an organization
export async function notifyOrganization(
  organizationId: string,
  type: NotificationType,
  title: string,
  body?: string,
  processingOrderId?: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Get all users in the organization with email and preferences
  const { data: users } = await supabase
    .from('users')
    .select('id, email, full_name, notification_preferences')
    .eq('organization_id', organizationId)
    .eq('is_active', true) as { data: { id: string; email: string; full_name: string | null; notification_preferences: Json | null }[] | null }

  if (!users || users.length === 0) {
    return { error: 'No users found in organization' }
  }

  // Create notifications for all users
  const notifications = users.map(user => ({
    user_id: user.id,
    type,
    title,
    body: body || null,
    processing_order_id: processingOrderId || null,
  }))

  const { error } = await supabase
    .from('notifications')
    .insert(notifications as never)

  if (error) {
    return { error: error.message }
  }

  // Send emails to users who have email notifications enabled
  const emailRecipients = users
    .filter(user => shouldSendEmail(type, user.notification_preferences))
    .map(user => ({
      email: user.email,
      name: user.full_name || undefined,
    }))

  if (emailRecipients.length > 0) {
    // Send emails in the background (don't await)
    sendBulkNotificationEmails({
      recipients: emailRecipients,
      type,
      title,
      body: body || '',
      orderId: processingOrderId,
    }).catch(err => {
      console.error('[Notifications] Failed to send emails:', err)
    })
  }

  return {}
}

// Order status change notification helper
interface OrderNotificationParams {
  orderId: string
  orderNumber: number
  newStatus: string
  processingStage?: string
  producerOrgId: string
  processorOrgId: string
  animalType?: string
}

const STATUS_MESSAGES: Record<string, { producer: { title: string; body: string }; processor?: { title: string; body: string } }> = {
  submitted: {
    producer: { title: 'Order Submitted', body: 'Your order has been submitted and is awaiting confirmation.' },
    processor: { title: 'New Order Received', body: 'A new processing order has been submitted.' },
  },
  confirmed: {
    producer: { title: 'Order Confirmed', body: 'Your order has been confirmed by the processor.' },
  },
  in_progress: {
    producer: { title: 'Processing Started', body: 'Your order is now being processed.' },
  },
  ready: {
    producer: { title: 'Order Ready', body: 'Your order is ready for pickup!' },
  },
  complete: {
    producer: { title: 'Order Complete', body: 'Your order has been completed and picked up.' },
    processor: { title: 'Order Completed', body: 'The order has been marked as complete.' },
  },
  cancelled: {
    producer: { title: 'Order Cancelled', body: 'Your order has been cancelled.' },
    processor: { title: 'Order Cancelled', body: 'The order has been cancelled.' },
  },
}

export async function notifyOrderStatusChange(params: OrderNotificationParams): Promise<{ error?: string }> {
  const messages = STATUS_MESSAGES[params.newStatus]
  if (!messages) return {}

  const results: { error?: string }[] = []

  // Notify producer
  if (messages.producer) {
    const title = `Order #${params.orderNumber}: ${messages.producer.title}`
    const body = messages.producer.body + (params.animalType ? ` (${params.animalType})` : '')

    const result = await notifyOrganization(
      params.producerOrgId,
      params.newStatus === 'ready' ? 'order_ready' :
      params.newStatus === 'complete' ? 'order_complete' :
      params.newStatus === 'submitted' ? 'order_submitted' :
      params.newStatus === 'confirmed' ? 'order_confirmed' :
      'order_status_update',
      title,
      body,
      params.orderId
    )
    results.push(result)
  }

  // Notify processor
  if (messages.processor) {
    const title = `Order #${params.orderNumber}: ${messages.processor.title}`
    const body = messages.processor.body + (params.animalType ? ` (${params.animalType})` : '')

    const result = await notifyOrganization(
      params.processorOrgId,
      params.newStatus === 'submitted' ? 'order_submitted' : 'order_status_update',
      title,
      body,
      params.orderId
    )
    results.push(result)
  }

  const errors = results.filter(r => r.error).map(r => r.error)
  return errors.length > 0 ? { error: errors.join(', ') } : {}
}

// Processing stage notification
export async function notifyProcessingStageChange(
  orderId: string,
  orderNumber: number,
  producerOrgId: string,
  newStage: string,
  animalType?: string
): Promise<{ error?: string }> {
  const stageLabels: Record<string, string> = {
    pending: 'Pending',
    received: 'Received at Facility',
    hanging: 'Hanging/Aging',
    cutting: 'Being Cut',
    wrapping: 'Being Wrapped',
    freezing: 'In Freezer',
    ready: 'Ready for Pickup',
    picked_up: 'Picked Up',
  }

  const label = stageLabels[newStage] || newStage
  const title = `Order #${orderNumber}: Processing Update`
  const body = `Your order is now in "${label}" stage.` + (animalType ? ` (${animalType})` : '')

  return notifyOrganization(
    producerOrgId,
    'order_status_update',
    title,
    body,
    orderId
  )
}

// New message notification
export async function notifyNewMessage(
  senderOrgId: string,
  receiverOrgId: string,
  senderOrgName: string,
  messagePreview: string,
  orderId?: string
): Promise<{ error?: string }> {
  const title = `New message from ${senderOrgName}`
  const body = messagePreview.length > 100 ? messagePreview.substring(0, 100) + '...' : messagePreview

  return notifyOrganization(
    receiverOrgId,
    'new_message',
    title,
    body,
    orderId
  )
}
