'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { AnimalType } from '@/types/database'

// Types
export interface WaitlistEntry {
  id: string
  created_at: string
  producer_id: string
  processor_id: string
  preferred_date: string
  flexible_range_days: number
  animal_type: AnimalType
  livestock_id: string | null
  is_active: boolean
  notified_at: string | null
  converted_to_order_id: string | null
  notes: string | null
}

export interface WaitlistEntryWithDetails extends WaitlistEntry {
  processor?: {
    id: string
    name: string
  }
  producer?: {
    id: string
    name: string
  }
  livestock?: {
    id: string
    name: string | null
    tag_number: string | null
  }
}

export interface CreateWaitlistEntryInput {
  processor_id: string
  preferred_date: string
  flexible_range_days?: number
  animal_type: AnimalType
  livestock_id?: string | null
  notes?: string | null
}

// Helper to get current user's org ID
async function getCurrentUserOrgId(): Promise<string | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile, error } = await supabase
    .from('users')
    .select('organization_id')
    .eq('auth_id', user.id)
    .single()

  if (error || !profile) return null
  return (profile as { organization_id: string | null }).organization_id
}

// Helper to get current user's org type
async function getCurrentUserOrgType(): Promise<'producer' | 'processor' | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('organization_id')
    .eq('auth_id', user.id)
    .single()

  if (profileError || !profile) return null
  const orgId = (profile as { organization_id: string | null }).organization_id
  if (!orgId) return null

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('type')
    .eq('id', orgId)
    .single()

  if (orgError || !org) return null
  return (org as { type: string }).type as 'producer' | 'processor'
}

/**
 * Create a new waitlist entry (Producer only)
 */
export async function createWaitlistEntry(
  input: CreateWaitlistEntryInput
): Promise<{ success: boolean; error?: string; entry?: WaitlistEntry }> {
  const supabase = await createClient()

  const producerId = await getCurrentUserOrgId()
  if (!producerId) {
    return { success: false, error: 'Not authenticated' }
  }

  const orgType = await getCurrentUserOrgType()
  if (orgType !== 'producer') {
    return { success: false, error: 'Only producers can join the waitlist' }
  }

  // Validate processor exists
  const { data: processor } = await supabase
    .from('organizations')
    .select('id, type')
    .eq('id', input.processor_id)
    .eq('type', 'processor')
    .single()

  if (!processor) {
    return { success: false, error: 'Processor not found' }
  }

  // Check if already on waitlist for this processor/date/animal combo
  const { data: existing } = await supabase
    .from('waitlist_entries')
    .select('id')
    .eq('producer_id', producerId)
    .eq('processor_id', input.processor_id)
    .eq('preferred_date', input.preferred_date)
    .eq('animal_type', input.animal_type)
    .eq('is_active', true)
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'Already on waitlist for this date and animal type' }
  }

  // Create the entry
  const { data: entry, error } = await supabase
    .from('waitlist_entries')
    .insert({
      producer_id: producerId,
      processor_id: input.processor_id,
      preferred_date: input.preferred_date,
      flexible_range_days: input.flexible_range_days ?? 7,
      animal_type: input.animal_type,
      livestock_id: input.livestock_id || null,
      notes: input.notes || null,
      is_active: true,
    } as never)
    .select()
    .single()

  if (error) {
    console.error('Error creating waitlist entry:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/waitlist')
  return { success: true, entry: entry as WaitlistEntry }
}

/**
 * Get waitlist entries for the current producer
 */
export async function getProducerWaitlistEntries(): Promise<WaitlistEntryWithDetails[]> {
  const supabase = await createClient()

  const producerId = await getCurrentUserOrgId()
  if (!producerId) return []

  const { data, error } = await supabase
    .from('waitlist_entries')
    .select(`
      *,
      processor:organizations!processor_id(id, name),
      livestock:livestock!livestock_id(id, name, tag_number)
    `)
    .eq('producer_id', producerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching producer waitlist entries:', error)
    return []
  }

  return (data || []) as WaitlistEntryWithDetails[]
}

/**
 * Get waitlist entries for a processor (their incoming waitlist)
 */
export async function getProcessorWaitlistEntries(
  options?: {
    date?: string
    animalType?: AnimalType
    activeOnly?: boolean
  }
): Promise<WaitlistEntryWithDetails[]> {
  const supabase = await createClient()

  const processorId = await getCurrentUserOrgId()
  if (!processorId) return []

  let query = supabase
    .from('waitlist_entries')
    .select(`
      *,
      producer:organizations!producer_id(id, name),
      livestock:livestock!livestock_id(id, name, tag_number)
    `)
    .eq('processor_id', processorId)

  if (options?.date) {
    // Find entries where preferred_date +/- flexible_range includes the target date
    query = query
      .lte('preferred_date', options.date)
      .gte('preferred_date', options.date)
  }

  if (options?.animalType) {
    query = query.eq('animal_type', options.animalType)
  }

  if (options?.activeOnly !== false) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query.order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching processor waitlist entries:', error)
    return []
  }

  return (data || []) as WaitlistEntryWithDetails[]
}

/**
 * Get waitlist count for a specific processor/date/animal combo
 */
export async function getWaitlistCount(
  processorId: string,
  date: string,
  animalType: AnimalType
): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('waitlist_entries')
    .select('*', { count: 'exact', head: true })
    .eq('processor_id', processorId)
    .eq('preferred_date', date)
    .eq('animal_type', animalType)
    .eq('is_active', true)

  if (error) {
    console.error('Error counting waitlist entries:', error)
    return 0
  }

  return count || 0
}

/**
 * Update a waitlist entry (Producer can update their own)
 */
export async function updateWaitlistEntry(
  entryId: string,
  updates: {
    preferred_date?: string
    flexible_range_days?: number
    animal_type?: AnimalType
    livestock_id?: string | null
    notes?: string | null
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const producerId = await getCurrentUserOrgId()
  if (!producerId) {
    return { success: false, error: 'Not authenticated' }
  }

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('waitlist_entries')
    .select('id, producer_id')
    .eq('id', entryId)
    .single()

  if (fetchError || !existing) {
    return { success: false, error: 'Entry not found or not authorized' }
  }

  const entry = existing as { id: string; producer_id: string }
  if (entry.producer_id !== producerId) {
    return { success: false, error: 'Entry not found or not authorized' }
  }

  const { error } = await supabase
    .from('waitlist_entries')
    .update(updates as never)
    .eq('id', entryId)

  if (error) {
    console.error('Error updating waitlist entry:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/waitlist')
  return { success: true }
}

/**
 * Cancel/deactivate a waitlist entry (Producer can cancel their own)
 */
export async function cancelWaitlistEntry(
  entryId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const producerId = await getCurrentUserOrgId()
  if (!producerId) {
    return { success: false, error: 'Not authenticated' }
  }

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('waitlist_entries')
    .select('id, producer_id')
    .eq('id', entryId)
    .single()

  if (fetchError || !existing) {
    return { success: false, error: 'Entry not found or not authorized' }
  }

  const entry = existing as { id: string; producer_id: string }
  if (entry.producer_id !== producerId) {
    return { success: false, error: 'Entry not found or not authorized' }
  }

  const { error } = await supabase
    .from('waitlist_entries')
    .update({ is_active: false } as never)
    .eq('id', entryId)

  if (error) {
    console.error('Error canceling waitlist entry:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/waitlist')
  return { success: true }
}

/**
 * Notify the next person on the waitlist (called when a slot opens)
 * This is typically triggered by order cancellation
 */
export async function notifyNextInWaitlist(
  processorId: string,
  date: string,
  animalType: AnimalType
): Promise<{ success: boolean; notifiedEntryId?: string; error?: string }> {
  const supabase = await createClient()

  // Find the first active, unnotified waitlist entry matching criteria
  // FIFO order (oldest first by created_at)
  const { data: entry, error: fetchError } = await supabase
    .from('waitlist_entries')
    .select('*')
    .eq('processor_id', processorId)
    .eq('animal_type', animalType)
    .eq('is_active', true)
    .is('notified_at', null)
    .lte('preferred_date', date) // Date is within their preferred range
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (fetchError) {
    console.error('Error finding waitlist entry to notify:', fetchError)
    return { success: false, error: fetchError.message }
  }

  if (!entry) {
    return { success: true } // No one to notify, that's okay
  }

  const waitlistEntry = entry as WaitlistEntry

  // Mark as notified
  const { error: updateError } = await supabase
    .from('waitlist_entries')
    .update({ notified_at: new Date().toISOString() } as never)
    .eq('id', waitlistEntry.id)

  if (updateError) {
    console.error('Error marking waitlist entry as notified:', updateError)
    return { success: false, error: updateError.message }
  }

  // Create a notification for the producer
  const { error: notifyError } = await supabase
    .from('notifications')
    .insert({
      user_id: null, // We'll need to look up the user
      organization_id: waitlistEntry.producer_id,
      type: 'waitlist_available',
      title: 'Processing Slot Available!',
      message: `A slot has opened up for ${animalType} processing on ${date}. Claim it within 24 hours!`,
      link: `/dashboard/waitlist?claim=${waitlistEntry.id}`,
      metadata: {
        waitlist_entry_id: waitlistEntry.id,
        processor_id: processorId,
        date,
        animal_type: animalType,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    } as never)

  if (notifyError) {
    console.error('Error creating waitlist notification:', notifyError)
    // Don't fail the whole operation, notification is secondary
  }

  return { success: true, notifiedEntryId: waitlistEntry.id }
}

/**
 * Claim a waitlist slot (convert to order)
 * Called when producer responds to notification
 */
export async function claimWaitlistSlot(
  entryId: string
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  const supabase = await createClient()

  const producerId = await getCurrentUserOrgId()
  if (!producerId) {
    return { success: false, error: 'Not authenticated' }
  }

  // Fetch the entry and verify ownership + eligibility
  const { data: entry, error: fetchError } = await supabase
    .from('waitlist_entries')
    .select('*')
    .eq('id', entryId)
    .eq('producer_id', producerId)
    .eq('is_active', true)
    .single()

  if (fetchError || !entry) {
    return { success: false, error: 'Waitlist entry not found or not eligible' }
  }

  const claimEntry = entry as WaitlistEntry

  // Check if notified and within 24-hour window
  if (!claimEntry.notified_at) {
    return { success: false, error: 'This slot has not been offered to you yet' }
  }

  const notifiedAt = new Date(claimEntry.notified_at)
  const now = new Date()
  const hoursSinceNotification = (now.getTime() - notifiedAt.getTime()) / (1000 * 60 * 60)

  if (hoursSinceNotification > 24) {
    // Mark as inactive (expired) and notify next person
    await supabase
      .from('waitlist_entries')
      .update({ is_active: false } as never)
      .eq('id', entryId)

    return { success: false, error: 'The 24-hour claim window has expired' }
  }

  // Create the order
  const { data: order, error: orderError } = await supabase
    .from('processing_orders')
    .insert({
      producer_id: producerId,
      processor_id: claimEntry.processor_id,
      scheduled_date: claimEntry.preferred_date,
      animal_type: claimEntry.animal_type,
      livestock_id: claimEntry.livestock_id,
      head_count: 1,
      status: 'pending',
      notes: claimEntry.notes,
    } as never)
    .select('id')
    .single()

  if (orderError || !order) {
    console.error('Error creating order from waitlist:', orderError)
    return { success: false, error: 'Failed to create order' }
  }

  const newOrder = order as { id: string }

  // Update waitlist entry as converted
  await supabase
    .from('waitlist_entries')
    .update({
      is_active: false,
      converted_to_order_id: newOrder.id,
    } as never)
    .eq('id', entryId)

  revalidatePath('/dashboard/waitlist')
  revalidatePath('/dashboard/orders')

  return { success: true, orderId: newOrder.id }
}

/**
 * Get position in waitlist for a specific entry
 */
export async function getWaitlistPosition(entryId: string): Promise<number | null> {
  const supabase = await createClient()

  // First get the entry details
  const { data: entry, error: fetchError } = await supabase
    .from('waitlist_entries')
    .select('processor_id, preferred_date, animal_type, created_at')
    .eq('id', entryId)
    .single()

  if (fetchError || !entry) return null

  const posEntry = entry as {
    processor_id: string
    preferred_date: string
    animal_type: string
    created_at: string
  }

  // Count how many active entries were created before this one
  const { count, error } = await supabase
    .from('waitlist_entries')
    .select('*', { count: 'exact', head: true })
    .eq('processor_id', posEntry.processor_id)
    .eq('preferred_date', posEntry.preferred_date)
    .eq('animal_type', posEntry.animal_type)
    .eq('is_active', true)
    .lt('created_at', posEntry.created_at)

  if (error) {
    console.error('Error getting waitlist position:', error)
    return null
  }

  return (count || 0) + 1 // 1-indexed position
}
