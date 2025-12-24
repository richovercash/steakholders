'use server'

import { createClient } from '@/lib/supabase/server'
import type { Organization, Message } from '@/types/database'

interface MessageWithSender extends Message {
  sender: { full_name: string } | null
}

export async function getOrganizationById(orgId: string): Promise<Organization | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()

  if (error) {
    console.error('Error fetching organization:', error)
    return null
  }

  return data as Organization
}

export async function getConversationMessages(
  myOrgId: string,
  partnerOrgId: string
): Promise<MessageWithSender[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:users!sender_id(full_name)
    `)
    .or(`and(sender_org_id.eq.${myOrgId},recipient_org_id.eq.${partnerOrgId}),and(sender_org_id.eq.${partnerOrgId},recipient_org_id.eq.${myOrgId})`)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching messages:', error)
    return []
  }

  return (data || []) as MessageWithSender[]
}

export async function getUserProfile(): Promise<{ id: string; organization_id: string } | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('users')
    .select('id, organization_id')
    .eq('auth_id', user.id)
    .single() as { data: { id: string; organization_id: string | null } | null; error: Error | null }

  if (error || !data?.organization_id) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return { id: data.id, organization_id: data.organization_id }
}

export async function sendMessage(
  senderId: string,
  senderOrgId: string,
  recipientOrgId: string,
  content: string
): Promise<MessageWithSender | null> {
  const supabase = await createClient()

  const messageData = {
    sender_id: senderId,
    sender_org_id: senderOrgId,
    recipient_org_id: recipientOrgId,
    content: content.trim(),
  }

  const { data, error } = await supabase
    .from('messages')
    .insert(messageData as never)
    .select(`
      *,
      sender:users!sender_id(full_name)
    `)
    .single() as { data: MessageWithSender | null; error: Error | null }

  if (error) {
    console.error('Error sending message:', error)
    return null
  }

  return data
}

export async function markMessagesAsRead(
  senderOrgId: string,
  recipientOrgId: string
): Promise<void> {
  const supabase = await createClient()

  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() } as never)
    .eq('sender_org_id', senderOrgId)
    .eq('recipient_org_id', recipientOrgId)
    .is('read_at', null)
}
