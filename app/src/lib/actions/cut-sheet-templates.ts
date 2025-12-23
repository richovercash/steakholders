'use server'

import { createClient } from '@/lib/supabase/server'
import type { AnimalType, CutCategory, SausageFlavor, GroundType, PattySize } from '@/types/database'

// Types matching CutSheetBuilder state
interface CutSelection {
  cutId: string
  cutName: string
  category: CutCategory
  thickness?: string
  weightLbs?: number
  piecesPerPackage: number
}

interface SausageSelection {
  flavor: SausageFlavor
  pounds: number
}

interface OrganSelections {
  liver: boolean
  heart: boolean
  tongue: boolean
  kidneys: boolean
  oxtail: boolean
  bones: boolean
}

export interface CutSheetState {
  animalType: AnimalType
  hangingWeight: number | null
  selectedCuts: Record<string, CutSelection>
  groundType: GroundType | null
  groundPackageWeight: number
  pattySize: PattySize | null
  sausages: SausageSelection[]
  organs: OrganSelections
  keepStewMeat: boolean
  keepShortRibs: boolean
  keepSoupBones: boolean
  baconOrBelly: 'bacon' | 'fresh_belly' | 'both' | 'none'
  hamPreference: 'sliced' | 'roast' | 'both' | 'none'
  shoulderPreference: 'sliced' | 'roast' | 'both' | 'none'
  keepJowls: boolean
  keepFatBack: boolean
  keepLardFat: boolean
  specialInstructions: string
}

export interface CutSheetTemplate {
  id: string
  template_name: string
  animal_type: AnimalType
}

export async function getTemplatesForOrganization(): Promise<CutSheetTemplate[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('auth_id', user.id)
    .single() as { data: { organization_id: string | null } | null }

  if (!profile?.organization_id) return []

  const { data: templates } = await supabase
    .from('cut_sheets')
    .select('id, template_name, animal_type')
    .eq('producer_id', profile.organization_id)
    .eq('is_template', true)
    .order('template_name') as { data: Array<{ id: string; template_name: string | null; animal_type: AnimalType }> | null }

  return (templates || []).map(t => ({
    id: t.id,
    template_name: t.template_name || 'Unnamed Template',
    animal_type: t.animal_type,
  }))
}

export async function saveAsTemplate(
  state: CutSheetState,
  templateName: string
): Promise<{ success: boolean; error?: string; templateId?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('auth_id', user.id)
    .single() as { data: { organization_id: string | null } | null }

  if (!profile?.organization_id) return { success: false, error: 'No organization' }

  // Create the template (cut sheet with is_template: true)
  const templateData = {
    producer_id: profile.organization_id,
    processing_order_id: null, // Templates are not linked to orders
    animal_type: state.animalType,
    is_template: true,
    template_name: templateName,
    hanging_weight_lbs: null, // Don't save weight in template
    ground_type: state.groundType,
    ground_package_weight_lbs: state.groundPackageWeight,
    patty_size: state.pattySize,
    keep_liver: state.organs.liver,
    keep_heart: state.organs.heart,
    keep_tongue: state.organs.tongue,
    keep_kidneys: state.organs.kidneys,
    keep_oxtail: state.organs.oxtail,
    keep_bones: state.organs.bones,
    keep_stew_meat: state.keepStewMeat,
    keep_short_ribs: state.keepShortRibs,
    keep_soup_bones: state.keepSoupBones,
    bacon_or_belly: state.animalType === 'pork' ? state.baconOrBelly : null,
    ham_preference: state.animalType === 'pork' ? state.hamPreference : null,
    shoulder_preference: state.animalType === 'pork' ? state.shoulderPreference : null,
    keep_jowls: state.keepJowls,
    keep_fat_back: state.keepFatBack,
    keep_lard_fat: state.keepLardFat,
    special_instructions: state.specialInstructions || null,
    status: 'draft' as const,
  }

  const { data: cutSheet, error: cutSheetError } = await supabase
    .from('cut_sheets')
    .insert(templateData as never)
    .select('id')
    .single() as { data: { id: string } | null; error: Error | null }

  if (cutSheetError || !cutSheet) {
    return { success: false, error: cutSheetError?.message || 'Failed to create template' }
  }

  // Insert cut sheet items
  const cutItems = Object.values(state.selectedCuts).map((cut, index) => ({
    cut_sheet_id: cutSheet.id,
    cut_category: cut.category,
    cut_id: cut.cutId,
    cut_name: cut.cutName,
    thickness: cut.thickness || null,
    weight_lbs: cut.weightLbs || null,
    pieces_per_package: cut.piecesPerPackage,
    pounds: null,
    notes: null,
    sort_order: index,
  }))

  if (cutItems.length > 0) {
    await supabase
      .from('cut_sheet_items')
      .insert(cutItems as never)
  }

  // Insert sausages (pork only)
  if (state.animalType === 'pork' && state.sausages.length > 0) {
    const sausageItems = state.sausages.map(s => ({
      cut_sheet_id: cutSheet.id,
      flavor: s.flavor,
      pounds: s.pounds,
    }))

    await supabase
      .from('cut_sheet_sausages')
      .insert(sausageItems as never)
  }

  return { success: true, templateId: cutSheet.id }
}

export async function loadTemplate(templateId: string): Promise<CutSheetState | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('auth_id', user.id)
    .single() as { data: { organization_id: string | null } | null }

  if (!profile?.organization_id) return null

  // Fetch the template
  interface CutSheetRow {
    animal_type: AnimalType
    ground_type: GroundType | null
    ground_package_weight_lbs: number | null
    patty_size: PattySize | null
    keep_liver: boolean
    keep_heart: boolean
    keep_tongue: boolean
    keep_kidneys: boolean
    keep_oxtail: boolean
    keep_bones: boolean
    keep_stew_meat: boolean
    keep_short_ribs: boolean
    keep_soup_bones: boolean
    bacon_or_belly: 'bacon' | 'fresh_belly' | 'both' | 'none' | null
    ham_preference: 'sliced' | 'roast' | 'both' | 'none' | null
    shoulder_preference: 'sliced' | 'roast' | 'both' | 'none' | null
    keep_jowls: boolean
    keep_fat_back: boolean
    keep_lard_fat: boolean
    special_instructions: string | null
  }

  const { data: template } = await supabase
    .from('cut_sheets')
    .select('*')
    .eq('id', templateId)
    .eq('producer_id', profile.organization_id)
    .eq('is_template', true)
    .single() as { data: CutSheetRow | null }

  if (!template) return null

  // Fetch cut items
  const { data: cutItems } = await supabase
    .from('cut_sheet_items')
    .select('*')
    .eq('cut_sheet_id', templateId)
    .order('sort_order') as { data: Array<{
      cut_id: string
      cut_name: string
      cut_category: string
      thickness: string | null
      weight_lbs: number | null
      pieces_per_package: number | null
    }> | null }

  // Fetch sausages
  const { data: sausages } = await supabase
    .from('cut_sheet_sausages')
    .select('*')
    .eq('cut_sheet_id', templateId) as { data: Array<{ flavor: string; pounds: number }> | null }

  // Build selected cuts map
  const selectedCuts: Record<string, CutSelection> = {}
  for (const item of cutItems || []) {
    selectedCuts[item.cut_id] = {
      cutId: item.cut_id,
      cutName: item.cut_name,
      category: item.cut_category as CutCategory,
      thickness: item.thickness || undefined,
      weightLbs: item.weight_lbs || undefined,
      piecesPerPackage: item.pieces_per_package || 2,
    }
  }

  // Build state
  const state: CutSheetState = {
    animalType: template.animal_type,
    hangingWeight: null, // Don't load hanging weight from template
    selectedCuts,
    groundType: template.ground_type,
    groundPackageWeight: template.ground_package_weight_lbs || 1,
    pattySize: template.patty_size,
    sausages: (sausages || []).map(s => ({
      flavor: s.flavor as SausageFlavor,
      pounds: s.pounds,
    })),
    organs: {
      liver: template.keep_liver,
      heart: template.keep_heart,
      tongue: template.keep_tongue,
      kidneys: template.keep_kidneys,
      oxtail: template.keep_oxtail,
      bones: template.keep_bones,
    },
    keepStewMeat: template.keep_stew_meat,
    keepShortRibs: template.keep_short_ribs,
    keepSoupBones: template.keep_soup_bones,
    baconOrBelly: template.bacon_or_belly || 'bacon',
    hamPreference: template.ham_preference || 'roast',
    shoulderPreference: template.shoulder_preference || 'roast',
    keepJowls: template.keep_jowls,
    keepFatBack: template.keep_fat_back,
    keepLardFat: template.keep_lard_fat,
    specialInstructions: template.special_instructions || '',
  }

  return state
}
