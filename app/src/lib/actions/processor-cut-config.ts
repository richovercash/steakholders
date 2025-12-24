'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { AnimalType, ProcessorCutConfig } from '@/types/database'

export interface ProcessorCutConfigInput {
  enabled_animals?: AnimalType[]
  disabled_cuts?: string[]
  disabled_sausage_flavors?: string[]
  custom_cuts?: {
    id: string
    name: string
    primal: string
    type: string
    additionalFee?: boolean
    note?: string
  }[]
  default_templates?: {
    id: string
    name: string
    description?: string
    cuts: string[] // Array of cut IDs
  }[]
  processing_fees?: Record<string, number>
  min_hanging_weight?: number | null
  max_hanging_weight?: number | null
  producer_notes?: string | null
}

/**
 * Get the processor's cut configuration
 */
export async function getProcessorCutConfig(): Promise<ProcessorCutConfig | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Get user's org
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('org_id')
    .eq('auth_user_id', user.id)
    .single()

  if (userError || !userData) return null
  const orgId = (userData as { org_id: string }).org_id

  // Query processor_cut_config - use type assertion since table is new
  const { data, error } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('processor_cut_config' as any)
    .select('*')
    .eq('processor_id', orgId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching processor cut config:', error)
    return null
  }

  return data as ProcessorCutConfig | null
}

/**
 * Get a processor's cut configuration by processor ID (for producers filling out cut sheets)
 */
export async function getProcessorCutConfigById(processorId: string): Promise<ProcessorCutConfig | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('processor_cut_config' as any)
    .select('*')
    .eq('processor_id', processorId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching processor cut config:', error)
    return null
  }

  return data as ProcessorCutConfig | null
}

/**
 * Create or update the processor's cut configuration
 */
export async function upsertProcessorCutConfig(
  config: ProcessorCutConfigInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get user's org
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('org_id')
    .eq('auth_user_id', user.id)
    .single()

  if (userError || !userData) {
    return { success: false, error: 'User organization not found' }
  }
  const orgId = (userData as { org_id: string }).org_id

  // Verify org is a processor
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('type')
    .eq('id', orgId)
    .single()

  if (orgError || !org) {
    return { success: false, error: 'Organization not found' }
  }
  const orgType = (org as { type: string }).type
  if (orgType !== 'processor') {
    return { success: false, error: 'Only processors can configure cut options' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('processor_cut_config')
    .upsert({
      processor_id: orgId,
      enabled_animals: config.enabled_animals,
      disabled_cuts: config.disabled_cuts,
      disabled_sausage_flavors: config.disabled_sausage_flavors,
      custom_cuts: config.custom_cuts || [],
      default_templates: config.default_templates || [],
      processing_fees: config.processing_fees || {},
      min_hanging_weight: config.min_hanging_weight,
      max_hanging_weight: config.max_hanging_weight,
      producer_notes: config.producer_notes,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'processor_id',
    })

  if (error) {
    console.error('Error saving processor cut config:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

/**
 * Add a cut to the disabled list
 */
export async function disableCut(cutId: string): Promise<{ success: boolean; error?: string }> {
  const config = await getProcessorCutConfig()

  const currentDisabled = config?.disabled_cuts || []
  if (currentDisabled.includes(cutId)) {
    return { success: true } // Already disabled
  }

  return upsertProcessorCutConfig({
    disabled_cuts: [...currentDisabled, cutId],
  })
}

/**
 * Remove a cut from the disabled list
 */
export async function enableCut(cutId: string): Promise<{ success: boolean; error?: string }> {
  const config = await getProcessorCutConfig()

  const currentDisabled = config?.disabled_cuts || []
  return upsertProcessorCutConfig({
    disabled_cuts: currentDisabled.filter(id => id !== cutId),
  })
}

/**
 * Toggle a cut's enabled/disabled status
 */
export async function toggleCutEnabled(cutId: string): Promise<{ success: boolean; error?: string }> {
  const config = await getProcessorCutConfig()

  const currentDisabled = config?.disabled_cuts || []
  const isDisabled = currentDisabled.includes(cutId)

  return upsertProcessorCutConfig({
    disabled_cuts: isDisabled
      ? currentDisabled.filter(id => id !== cutId)
      : [...currentDisabled, cutId],
  })
}

/**
 * Update enabled animal types
 */
export async function updateEnabledAnimals(animals: AnimalType[]): Promise<{ success: boolean; error?: string }> {
  return upsertProcessorCutConfig({
    enabled_animals: animals,
  })
}

/**
 * Update producer-facing notes
 */
export async function updateProducerNotes(notes: string): Promise<{ success: boolean; error?: string }> {
  return upsertProcessorCutConfig({
    producer_notes: notes,
  })
}
