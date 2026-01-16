import type { CutSheetHistoryEntry, Json } from '@/types/database'

// ============================================
// Types
// ============================================

export interface ChangeDiff {
  field: string
  label: string
  before: string | null
  after: string | null
}

// ============================================
// Diff Generation
// ============================================

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

  // Get all unique keys from both states
  const allKeys = Array.from(new Set([
    ...Object.keys(prev),
    ...Object.keys(next),
  ]))

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
