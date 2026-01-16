'use server'

import { createClient } from '@/lib/supabase/server'
import type { CutSheetHistoryEntry, Json } from '@/types/database'

// ============================================
// History Retrieval
// ============================================

/**
 * Get full history for a cut sheet
 */
export async function getCutSheetHistory(
  cutSheetId: string
): Promise<CutSheetHistoryEntry[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cut_sheet_history')
    .select('*')
    .eq('cut_sheet_id', cutSheetId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching cut sheet history:', error)
    return []
  }

  return (data || []) as CutSheetHistoryEntry[]
}

/**
 * Get history filtered by category
 */
export async function getHistoryByCategory(
  cutSheetId: string,
  category: string
): Promise<CutSheetHistoryEntry[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cut_sheet_history')
    .select('*')
    .eq('cut_sheet_id', cutSheetId)
    .eq('change_category', category)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching cut sheet history:', error)
    return []
  }

  return (data || []) as CutSheetHistoryEntry[]
}

/**
 * Get history filtered by role (producer or processor)
 */
export async function getHistoryByRole(
  cutSheetId: string,
  role: 'producer' | 'processor'
): Promise<CutSheetHistoryEntry[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cut_sheet_history')
    .select('*')
    .eq('cut_sheet_id', cutSheetId)
    .eq('changed_by_role', role)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching cut sheet history:', error)
    return []
  }

  return (data || []) as CutSheetHistoryEntry[]
}

// ============================================
// History Summary
// ============================================

/**
 * Get summary statistics for cut sheet history
 */
export async function getHistorySummary(cutSheetId: string): Promise<{
  totalChanges: number
  producerChanges: number
  processorChanges: number
  lastModified: string | null
  lastModifiedBy: 'producer' | 'processor' | null
}> {
  const supabase = await createClient()

  // Get total count and latest
  const { data, error } = await supabase
    .from('cut_sheet_history')
    .select('changed_by_role, created_at')
    .eq('cut_sheet_id', cutSheetId)
    .order('created_at', { ascending: false })

  if (error || !data) {
    return {
      totalChanges: 0,
      producerChanges: 0,
      processorChanges: 0,
      lastModified: null,
      lastModifiedBy: null,
    }
  }

  const entries = data as { changed_by_role: string; created_at: string }[]

  return {
    totalChanges: entries.length,
    producerChanges: entries.filter(e => e.changed_by_role === 'producer').length,
    processorChanges: entries.filter(e => e.changed_by_role === 'processor').length,
    lastModified: entries.length > 0 ? entries[0].created_at : null,
    lastModifiedBy: entries.length > 0
      ? (entries[0].changed_by_role as 'producer' | 'processor')
      : null,
  }
}

/**
 * Get the initial (producer-created) version of the cut sheet
 */
export async function getOriginalCutSheetState(
  cutSheetId: string
): Promise<Json | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cut_sheet_history')
    .select('new_state')
    .eq('cut_sheet_id', cutSheetId)
    .eq('change_type', 'created')
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return (data as { new_state: Json }).new_state
}
