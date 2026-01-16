'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  ProducedPackage,
  CutSheetHistoryEntry,
  ProcessorCutModification,
  RemovedCut,
  AddedCut,
  CutSheetChangeCategory,
} from '@/types/database'

// ============================================
// Helper Functions
// ============================================

async function getCurrentUserAndOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('id, organization_id')
    .eq('auth_id', user.id)
    .single()

  if (!userData) return null
  return {
    userId: (userData as { id: string; organization_id: string }).id,
    orgId: (userData as { id: string; organization_id: string }).organization_id,
  }
}

async function recordHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cutSheetId: string,
  processingOrderId: string | null,
  userId: string,
  orgId: string,
  changeType: 'created' | 'updated' | 'status_changed',
  changeCategory: CutSheetChangeCategory,
  changeSummary: string,
  previousState: object | null,
  newState: object,
  changedFields: string[],
  affectedCutId?: string,
  affectedPackageId?: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('cut_sheet_history').insert({
    cut_sheet_id: cutSheetId,
    processing_order_id: processingOrderId,
    changed_by_user_id: userId,
    changed_by_org_id: orgId,
    changed_by_role: 'processor',
    change_type: changeType,
    change_category: changeCategory,
    change_summary: changeSummary,
    previous_state: previousState,
    new_state: newState,
    changed_fields: changedFields,
    affected_cut_id: affectedCutId || null,
    affected_package_id: affectedPackageId || null,
  })
}

// ============================================
// Cut Sheet Modification Actions
// ============================================

/**
 * Update a cut's parameters (thickness, pieces per package, etc.)
 */
export async function updateCutParameters(
  cutSheetId: string,
  cutId: string,
  updates: ProcessorCutModification
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const userInfo = await getCurrentUserAndOrg()
  if (!userInfo) return { success: false, error: 'Not authenticated' }

  // Get current cut sheet
  const { data: cutSheet, error: fetchError } = await supabase
    .from('cut_sheets')
    .select('*, processing_order_id')
    .eq('id', cutSheetId)
    .single()

  if (fetchError || !cutSheet) {
    return { success: false, error: 'Cut sheet not found' }
  }

  // Get current modifications
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cs = cutSheet as any
  const currentMods: Record<string, ProcessorCutModification> = cs.processor_modifications || {}
  const previousMods = { ...currentMods }

  // Update modifications
  currentMods[cutId] = {
    ...currentMods[cutId],
    ...updates,
    modified_at: new Date().toISOString(),
  }

  // Save to database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('cut_sheets')
    .update({
      processor_modifications: currentMods,
      last_modified_by_role: 'processor',
      last_modified_by_user_id: userInfo.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cutSheetId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Record history
  const changedFields = Object.keys(updates)
  await recordHistory(
    supabase,
    cutSheetId,
    cs.processing_order_id,
    userInfo.userId,
    userInfo.orgId,
    'updated',
    'cut_modified',
    `Modified ${cutId}: ${changedFields.join(', ')}`,
    { processor_modifications: previousMods },
    { processor_modifications: currentMods },
    changedFields,
    cutId
  )

  revalidatePath(`/dashboard/orders/${cs.processing_order_id}`)
  return { success: true }
}

/**
 * Remove a cut from the cut sheet
 */
export async function removeCut(
  cutSheetId: string,
  cutId: string,
  cutName: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const userInfo = await getCurrentUserAndOrg()
  if (!userInfo) return { success: false, error: 'Not authenticated' }

  // Get current cut sheet
  const { data: cutSheet, error: fetchError } = await supabase
    .from('cut_sheets')
    .select('*, processing_order_id')
    .eq('id', cutSheetId)
    .single()

  if (fetchError || !cutSheet) {
    return { success: false, error: 'Cut sheet not found' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cs = cutSheet as any
  const currentRemoved: RemovedCut[] = cs.removed_cuts || []

  // Check if already removed
  if (currentRemoved.some(r => r.cut_id === cutId)) {
    return { success: true } // Already removed
  }

  // Add to removed list
  const newRemoved: RemovedCut[] = [
    ...currentRemoved,
    {
      cut_id: cutId,
      cut_name: cutName,
      reason,
      removed_at: new Date().toISOString(),
    },
  ]

  // Save to database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('cut_sheets')
    .update({
      removed_cuts: newRemoved,
      last_modified_by_role: 'processor',
      last_modified_by_user_id: userInfo.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cutSheetId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Record history
  await recordHistory(
    supabase,
    cutSheetId,
    cs.processing_order_id,
    userInfo.userId,
    userInfo.orgId,
    'updated',
    'cut_removed',
    `Removed ${cutName}: ${reason}`,
    { removed_cuts: currentRemoved },
    { removed_cuts: newRemoved },
    ['removed_cuts'],
    cutId
  )

  revalidatePath(`/dashboard/orders/${cs.processing_order_id}`)
  return { success: true }
}

/**
 * Restore a removed cut
 */
export async function restoreCut(
  cutSheetId: string,
  cutId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const userInfo = await getCurrentUserAndOrg()
  if (!userInfo) return { success: false, error: 'Not authenticated' }

  // Get current cut sheet
  const { data: cutSheet, error: fetchError } = await supabase
    .from('cut_sheets')
    .select('*, processing_order_id')
    .eq('id', cutSheetId)
    .single()

  if (fetchError || !cutSheet) {
    return { success: false, error: 'Cut sheet not found' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cs = cutSheet as any
  const currentRemoved: RemovedCut[] = cs.removed_cuts || []
  const newRemoved = currentRemoved.filter(r => r.cut_id !== cutId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('cut_sheets')
    .update({
      removed_cuts: newRemoved,
      last_modified_by_role: 'processor',
      last_modified_by_user_id: userInfo.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cutSheetId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Record history
  await recordHistory(
    supabase,
    cutSheetId,
    cs.processing_order_id,
    userInfo.userId,
    userInfo.orgId,
    'updated',
    'cut_added',
    `Restored ${cutId}`,
    { removed_cuts: currentRemoved },
    { removed_cuts: newRemoved },
    ['removed_cuts'],
    cutId
  )

  revalidatePath(`/dashboard/orders/${cs.processing_order_id}`)
  return { success: true }
}

/**
 * Add a new cut that wasn't in the original request
 */
export async function addCut(
  cutSheetId: string,
  cut: AddedCut
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const userInfo = await getCurrentUserAndOrg()
  if (!userInfo) return { success: false, error: 'Not authenticated' }

  // Get current cut sheet
  const { data: cutSheet, error: fetchError } = await supabase
    .from('cut_sheets')
    .select('*, processing_order_id')
    .eq('id', cutSheetId)
    .single()

  if (fetchError || !cutSheet) {
    return { success: false, error: 'Cut sheet not found' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cs = cutSheet as any
  const currentAdded: AddedCut[] = cs.added_cuts || []

  // Check if already added
  if (currentAdded.some(a => a.cut_id === cut.cut_id)) {
    return { success: false, error: 'Cut already added' }
  }

  // Add with timestamp
  const newCut: AddedCut = {
    ...cut,
    added_at: new Date().toISOString(),
  }
  const newAdded = [...currentAdded, newCut]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('cut_sheets')
    .update({
      added_cuts: newAdded,
      last_modified_by_role: 'processor',
      last_modified_by_user_id: userInfo.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cutSheetId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Record history
  await recordHistory(
    supabase,
    cutSheetId,
    cs.processing_order_id,
    userInfo.userId,
    userInfo.orgId,
    'updated',
    'cut_added',
    `Added ${cut.cut_name}`,
    { added_cuts: currentAdded },
    { added_cuts: newAdded },
    ['added_cuts'],
    cut.cut_id
  )

  revalidatePath(`/dashboard/orders/${cs.processing_order_id}`)
  return { success: true }
}

/**
 * Update processor notes on the cut sheet
 */
export async function updateProcessorNotes(
  cutSheetId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const userInfo = await getCurrentUserAndOrg()
  if (!userInfo) return { success: false, error: 'Not authenticated' }

  // Get current cut sheet
  const { data: cutSheet, error: fetchError } = await supabase
    .from('cut_sheets')
    .select('processor_notes, processing_order_id')
    .eq('id', cutSheetId)
    .single()

  if (fetchError || !cutSheet) {
    return { success: false, error: 'Cut sheet not found' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cs = cutSheet as any
  const previousNotes = cs.processor_notes

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('cut_sheets')
    .update({
      processor_notes: notes,
      last_modified_by_role: 'processor',
      last_modified_by_user_id: userInfo.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cutSheetId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Record history
  await recordHistory(
    supabase,
    cutSheetId,
    cs.processing_order_id,
    userInfo.userId,
    userInfo.orgId,
    'updated',
    'notes_updated',
    'Updated processor notes',
    { processor_notes: previousNotes },
    { processor_notes: notes },
    ['processor_notes']
  )

  revalidatePath(`/dashboard/orders/${cs.processing_order_id}`)
  return { success: true }
}

/**
 * Update hanging weight on cut sheet
 */
export async function updateHangingWeight(
  cutSheetId: string,
  weight: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const userInfo = await getCurrentUserAndOrg()
  if (!userInfo) return { success: false, error: 'Not authenticated' }

  // Get current cut sheet
  const { data: cutSheet, error: fetchError } = await supabase
    .from('cut_sheets')
    .select('hanging_weight_lbs, processing_order_id')
    .eq('id', cutSheetId)
    .single()

  if (fetchError || !cutSheet) {
    return { success: false, error: 'Cut sheet not found' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cs = cutSheet as any
  const previousWeight = cs.hanging_weight_lbs

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('cut_sheets')
    .update({
      hanging_weight_lbs: weight,
      last_modified_by_role: 'processor',
      last_modified_by_user_id: userInfo.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cutSheetId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Record history
  await recordHistory(
    supabase,
    cutSheetId,
    cs.processing_order_id,
    userInfo.userId,
    userInfo.orgId,
    'updated',
    'weight_entered',
    `Updated hanging weight: ${previousWeight || 'none'} → ${weight} lbs`,
    { hanging_weight_lbs: previousWeight },
    { hanging_weight_lbs: weight },
    ['hanging_weight_lbs']
  )

  revalidatePath(`/dashboard/orders/${cs.processing_order_id}`)
  return { success: true }
}

// ============================================
// Produced Package Actions
// ============================================

/**
 * Create a new produced package record
 */
export async function createProducedPackage(
  cutSheetId: string,
  packageData: {
    cut_id: string
    cut_name: string
    primal_id?: string
    package_number?: number
    quantity_in_package?: number
    actual_weight_lbs?: number
    thickness?: string
    processing_style?: string
    processor_added?: boolean
    processor_notes?: string
    livestock_tracking_id?: string
  }
): Promise<{ success: boolean; error?: string; packageId?: string }> {
  const supabase = await createClient()
  const userInfo = await getCurrentUserAndOrg()
  if (!userInfo) return { success: false, error: 'Not authenticated' }

  // Get cut sheet to find processing_order_id
  const { data: cutSheet, error: fetchError } = await supabase
    .from('cut_sheets')
    .select('processing_order_id')
    .eq('id', cutSheetId)
    .single()

  if (fetchError || !cutSheet) {
    return { success: false, error: 'Cut sheet not found' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cs = cutSheet as any

  // Determine next package number if not provided
  let packageNumber = packageData.package_number
  if (!packageNumber) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingPackages } = await (supabase as any)
      .from('produced_packages')
      .select('package_number')
      .eq('cut_sheet_id', cutSheetId)
      .eq('cut_id', packageData.cut_id)
      .order('package_number', { ascending: false })
      .limit(1)

    packageNumber = existingPackages?.length > 0
      ? (existingPackages[0] as { package_number: number }).package_number + 1
      : 1
  }

  // Insert package
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newPackage, error: insertError } = await (supabase as any)
    .from('produced_packages')
    .insert({
      cut_sheet_id: cutSheetId,
      cut_id: packageData.cut_id,
      cut_name: packageData.cut_name,
      primal_id: packageData.primal_id || null,
      package_number: packageNumber,
      quantity_in_package: packageData.quantity_in_package || 1,
      actual_weight_lbs: packageData.actual_weight_lbs || null,
      thickness: packageData.thickness || null,
      processing_style: packageData.processing_style || null,
      processor_added: packageData.processor_added || false,
      processor_notes: packageData.processor_notes || null,
      livestock_tracking_id: packageData.livestock_tracking_id || null,
    })
    .select()
    .single()

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  // Record history
  const pkg = newPackage as ProducedPackage
  await recordHistory(
    supabase,
    cutSheetId,
    cs.processing_order_id,
    userInfo.userId,
    userInfo.orgId,
    'updated',
    'package_created',
    `Created package: ${packageData.cut_name} #${packageNumber}${packageData.actual_weight_lbs ? ` (${packageData.actual_weight_lbs} lbs)` : ''}`,
    null,
    packageData,
    ['produced_packages'],
    packageData.cut_id,
    pkg.id
  )

  revalidatePath(`/dashboard/orders/${cs.processing_order_id}`)
  return { success: true, packageId: pkg.id }
}

/**
 * Update a produced package's weight
 */
export async function updatePackageWeight(
  packageId: string,
  weight: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const userInfo = await getCurrentUserAndOrg()
  if (!userInfo) return { success: false, error: 'Not authenticated' }

  // Get package with cut sheet info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pkg, error: fetchError } = await (supabase as any)
    .from('produced_packages')
    .select('*, cut_sheets!inner(processing_order_id)')
    .eq('id', packageId)
    .single()

  if (fetchError || !pkg) {
    return { success: false, error: 'Package not found' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = pkg as any
  const previousWeight = p.actual_weight_lbs

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('produced_packages')
    .update({
      actual_weight_lbs: weight,
      updated_at: new Date().toISOString(),
    })
    .eq('id', packageId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Record history
  await recordHistory(
    supabase,
    p.cut_sheet_id,
    p.cut_sheets.processing_order_id,
    userInfo.userId,
    userInfo.orgId,
    'updated',
    'weight_entered',
    `Updated ${p.cut_name} #${p.package_number} weight: ${previousWeight || 'none'} → ${weight} lbs`,
    { actual_weight_lbs: previousWeight },
    { actual_weight_lbs: weight },
    ['actual_weight_lbs'],
    p.cut_id,
    packageId
  )

  revalidatePath(`/dashboard/orders/${p.cut_sheets.processing_order_id}`)
  return { success: true }
}

/**
 * Delete a produced package
 */
export async function deletePackage(
  packageId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const userInfo = await getCurrentUserAndOrg()
  if (!userInfo) return { success: false, error: 'Not authenticated' }

  // Get package info before deletion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pkg, error: fetchError } = await (supabase as any)
    .from('produced_packages')
    .select('*, cut_sheets!inner(processing_order_id)')
    .eq('id', packageId)
    .single()

  if (fetchError || !pkg) {
    return { success: false, error: 'Package not found' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = pkg as any

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteError } = await (supabase as any)
    .from('produced_packages')
    .delete()
    .eq('id', packageId)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  // Record history (package_id will be null since it's deleted)
  await recordHistory(
    supabase,
    p.cut_sheet_id,
    p.cut_sheets.processing_order_id,
    userInfo.userId,
    userInfo.orgId,
    'updated',
    'general',
    `Deleted package: ${p.cut_name} #${p.package_number}`,
    p,
    {},
    ['produced_packages'],
    p.cut_id
  )

  revalidatePath(`/dashboard/orders/${p.cut_sheets.processing_order_id}`)
  return { success: true }
}

/**
 * Get all produced packages for a cut sheet
 */
export async function getProducedPackages(
  cutSheetId: string
): Promise<ProducedPackage[]> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('produced_packages')
    .select('*')
    .eq('cut_sheet_id', cutSheetId)
    .order('cut_id')
    .order('package_number')

  if (error) {
    console.error('Error fetching produced packages:', error)
    return []
  }

  return (data || []) as ProducedPackage[]
}

/**
 * Get cut sheet history
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
