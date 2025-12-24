'use server'

import { createClient } from '@/lib/supabase/server'
import type { Organization, Message } from '@/types/database'

interface MessageWithSender extends Message {
  sender: { full_name: string } | null
}

export async function getOrganizationById(orgId: string): Promise<Organization | null> {
  const supabase = await createClient()

  console.log('[getOrganizationById] Looking up org:', orgId)

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()

  if (error) {
    console.error('[getOrganizationById] Error:', error.message, error.code, error.details)
    // Try without .single() to see if the issue is multiple or no results
    const { data: allData, error: allError } = await supabase
      .from('organizations')
      .select('id, name, type')
      .limit(10)
    console.log('[getOrganizationById] Available orgs sample:', allData, allError?.message)
    return null
  }

  const org = data as Organization
  console.log('[getOrganizationById] Found:', org?.name)
  return org
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
  if (!user) {
    console.log('[getUserProfile] No user found')
    return null
  }

  console.log('[getUserProfile] Auth user id:', user.id)

  const { data, error } = await supabase
    .from('users')
    .select('id, organization_id')
    .eq('auth_id', user.id)
    .single() as { data: { id: string; organization_id: string | null } | null; error: Error | null }

  console.log('[getUserProfile] Profile data:', data, 'Error:', error?.message)

  if (error || !data?.organization_id) {
    console.error('[getUserProfile] Error fetching user profile:', error)
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

export async function getNewMessages(
  myOrgId: string,
  partnerOrgId: string,
  afterTimestamp: string
): Promise<MessageWithSender[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:users!sender_id(full_name)
    `)
    .or(`and(sender_org_id.eq.${myOrgId},recipient_org_id.eq.${partnerOrgId}),and(sender_org_id.eq.${partnerOrgId},recipient_org_id.eq.${myOrgId})`)
    .gt('created_at', afterTimestamp)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching new messages:', error)
    return []
  }

  const messages = (data || []) as MessageWithSender[]

  // Mark incoming messages as read
  if (messages.length > 0) {
    const incomingMessageIds = messages
      .filter(msg => msg.sender_org_id === partnerOrgId && !msg.read_at)
      .map(msg => msg.id)

    if (incomingMessageIds.length > 0) {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() } as never)
        .in('id', incomingMessageIds)
    }
  }

  return messages
}
