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
// History Diff Generation
// ============================================

export interface ChangeDiff {
  field: string
  label: string
  before: string | null
  after: string | null
}

/**
 * Generate human-readable diff from history entry
 */
export function generateDiffFromEntry(entry: CutSheetHistoryEntry): ChangeDiff[] {
  const diffs: ChangeDiff[] = []

  if (!entry.previous_state && !entry.new_state) {
    return diffs
  }

  const prev = (entry.previous_state || {}) as Record<string, Json>
  const next = (entry.new_state || {}) as Record<string, Json>

  // Get all keys from both states
  const allKeys = new Set([
    ...Object.keys(prev),
    ...Object.keys(next),
  ])

  for (const key of allKeys) {
    const prevValue = prev[key]
    const nextValue = next[key]

    // Skip if values are the same
    if (JSON.stringify(prevValue) === JSON.stringify(nextValue)) {
      continue
    }

    diffs.push({
      field: key,
      label: formatFieldLabel(key),
      before: formatValue(prevValue),
      after: formatValue(nextValue),
    })
  }

  return diffs
}

/**
 * Format field name to human-readable label
 */
function formatFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    thickness: 'Thickness',
    pieces_per_package: 'Pieces per Package',
    processor_notes: 'Processor Notes',
    processor_modifications: 'Cut Modifications',
    removed_cuts: 'Removed Cuts',
    added_cuts: 'Added Cuts',
    hanging_weight_lbs: 'Hanging Weight',
    final_weight_lbs: 'Final Weight',
    actual_weight_lbs: 'Package Weight',
    produced_packages: 'Produced Packages',
  }

  return labels[field] || field.split('_').map(w =>
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ')
}

/**
 * Format a value for display
 */
function formatValue(value: Json | undefined): string | null {
  if (value === undefined || value === null) {
    return null
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number') {
    return value.toString()
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'None'
    }
    // For arrays of objects, try to extract names
    if (typeof value[0] === 'object' && value[0] !== null) {
      const items = value.map(item => {
        const obj = item as Record<string, Json>
        return obj.cut_name || obj.name || JSON.stringify(item)
      })
      return items.join(', ')
    }
    return value.join(', ')
  }

  if (typeof value === 'object') {
    // For modification objects, format nicely
    const obj = value as Record<string, Json>
    const parts: string[] = []
    for (const [k, v] of Object.entries(obj)) {
      if (v !== null && v !== undefined) {
        parts.push(`${formatFieldLabel(k)}: ${formatValue(v)}`)
      }
    }
    return parts.join(', ') || 'Empty'
  }

  return JSON.stringify(value)
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
