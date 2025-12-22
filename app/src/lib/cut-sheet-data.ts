// Cut Sheet Data Constants
// Defines all available cuts, options, and validation rules

import type { AnimalType, CutCategory, SausageFlavor } from '@/types/database'

export interface CutOption {
  id: string
  name: string
  category: CutCategory
  hasThickness?: boolean
  hasWeight?: boolean
  conflictsWith?: string[]
  hint?: string
}

export interface AnimalCuts {
  steaks?: CutOption[]
  roasts?: CutOption[]
  ground?: CutOption[]
  ribs?: CutOption[]
  bacon?: CutOption[]
  other?: CutOption[]
  organs?: CutOption[]
}

// Thickness options for steaks
export const THICKNESS_OPTIONS = ['1/2"', '3/4"', '1"', '1 1/2"', '2"'] as const
export type ThicknessOption = typeof THICKNESS_OPTIONS[number]

// Pieces per package options
export const PIECES_OPTIONS = [1, 2, 3, 4] as const

// Weight options for roasts (in lbs)
export const WEIGHT_OPTIONS = [2, 3, 4, 5] as const

// Ground meat package weights
export const GROUND_WEIGHT_OPTIONS = [1, 2] as const

// Patty sizes
export const PATTY_SIZE_OPTIONS = ['1/4', '1/3', '1/2'] as const

// Sausage flavors with display names
export const SAUSAGE_FLAVORS: { id: SausageFlavor; name: string; hint: string }[] = [
  { id: 'mild', name: 'Mild Sausage', hint: 'Traditional breakfast style' },
  { id: 'medium', name: 'Medium Sausage', hint: 'Light kick' },
  { id: 'hot', name: 'Hot Sausage', hint: 'Spicy' },
  { id: 'sweet_italian', name: 'Sweet Italian', hint: 'Fennel and herbs' },
  { id: 'hot_italian', name: 'Hot Italian', hint: 'Spicy Italian style' },
  { id: 'chorizo', name: 'Chorizo', hint: 'Mexican style' },
  { id: 'bratwurst', name: 'Bratwurst', hint: 'German style' },
  { id: 'polish', name: 'Polish Sausage', hint: 'Kielbasa style' },
  { id: 'breakfast', name: 'Breakfast Links', hint: 'Classic breakfast' },
  { id: 'maple_breakfast', name: 'Maple Breakfast', hint: 'Sweet maple flavor' },
]

// Cut data organized by animal type
export const CUT_DATA: Record<AnimalType, AnimalCuts> = {
  beef: {
    steaks: [
      { id: 'fillet', name: 'Fillet / Filet Mignon', category: 'steak', hasThickness: true, conflictsWith: ['tbone'], hint: 'Premium tenderloin cut' },
      { id: 'nystrip', name: 'NY Strip', category: 'steak', hasThickness: true, conflictsWith: ['tbone'], hint: 'Classic steakhouse cut' },
      { id: 'tbone', name: 'T-Bone Steak', category: 'steak', hasThickness: true, conflictsWith: ['fillet', 'nystrip'], hint: 'Includes strip and tenderloin' },
      { id: 'ribeye', name: 'Rib Eye Steak', category: 'steak', hasThickness: true, hint: 'Well-marbled, flavorful' },
      { id: 'sirloin', name: 'Sirloin Steak', category: 'steak', hasThickness: true, hint: 'Lean and versatile' },
      { id: 'round', name: 'Round Steak', category: 'steak', hasThickness: true, hint: 'Great for swiss steak' },
      { id: 'cubed', name: 'Cubed Steak', category: 'steak', hint: 'Tenderized, good for chicken-fried steak' },
      { id: 'flank', name: 'Flank Steak', category: 'steak', hint: 'Great for fajitas' },
      { id: 'skirt', name: 'Skirt Steak', category: 'steak', hint: 'Ideal for grilling' },
    ],
    roasts: [
      { id: 'chuck_roast', name: 'Chuck Roast', category: 'roast', hasWeight: true, hint: 'Perfect for pot roast' },
      { id: 'arm_roast', name: 'Arm Roast', category: 'roast', hasWeight: true, hint: 'Similar to chuck, slightly leaner' },
      { id: 'sirloin_tip_roast', name: 'Sirloin Tip Roast', category: 'roast', hasWeight: true, hint: 'Lean, good for roasting' },
      { id: 'rump_roast', name: 'Rump Roast', category: 'roast', hasWeight: true, hint: 'Flavorful, needs slow cooking' },
      { id: 'round_roast', name: 'Round Roast', category: 'roast', hasWeight: true, hint: 'Lean, slices well' },
      { id: 'brisket', name: 'Brisket', category: 'roast', hasWeight: true, hint: 'Great for smoking or braising' },
      { id: 'prime_rib', name: 'Prime Rib / Rib Roast', category: 'roast', hasWeight: true, hint: 'Premium holiday roast' },
    ],
    ground: [
      { id: 'ground_beef', name: 'Ground Beef', category: 'ground', hint: '1-2 lb packages' },
      { id: 'ground_vac', name: 'Vacuum Packed Ground', category: 'ground', hint: 'Longer freezer life' },
      { id: 'patties', name: 'Burger Patties', category: 'ground', hint: '1/4 lb or 1/3 lb patties' },
    ],
    other: [
      { id: 'stew', name: 'Stew Beef', category: 'other', hint: 'Cubed for stews and soups' },
      { id: 'short_ribs', name: 'Short Ribs', category: 'other', hint: 'Great for braising' },
      { id: 'soup_bones', name: 'Soup Bones', category: 'other', hint: 'For broth and stock' },
    ],
    organs: [
      { id: 'liver', name: 'Liver', category: 'other' },
      { id: 'heart', name: 'Heart', category: 'other' },
      { id: 'tongue', name: 'Tongue', category: 'other' },
      { id: 'kidneys', name: 'Kidneys', category: 'other' },
      { id: 'oxtail', name: 'Oxtail', category: 'other' },
      { id: 'bones', name: 'Bones (marrow/dog)', category: 'other' },
    ],
  },

  pork: {
    steaks: [
      { id: 'tenderloin', name: 'Tenderloin', category: 'steak', hint: 'Lean and tender' },
      { id: 'chops', name: 'Pork Chops', category: 'steak', hasThickness: true, hint: 'Bone-in or boneless' },
      { id: 'country_ribs', name: 'Country Style Ribs', category: 'steak', hint: 'Meaty and versatile' },
    ],
    roasts: [
      { id: 'ham_roast', name: 'Ham (Roast)', category: 'roast', hasWeight: true, hint: 'Whole or half' },
      { id: 'ham_sliced', name: 'Ham (Sliced)', category: 'roast', hint: 'Ham steaks' },
      { id: 'shoulder_roast', name: 'Shoulder Roast', category: 'roast', hasWeight: true, hint: 'Boston butt, great for pulled pork' },
      { id: 'shoulder_sliced', name: 'Shoulder (Sliced)', category: 'roast', hint: 'Shoulder steaks' },
    ],
    ribs: [
      { id: 'baby_back', name: 'Baby Back Ribs', category: 'ribs', hint: 'Tender, quick cooking' },
      { id: 'spare_ribs', name: 'Spare Ribs', category: 'ribs', hint: 'More meat, great for BBQ' },
      { id: 'st_louis', name: 'St. Louis Style Ribs', category: 'ribs', hint: 'Trimmed spare ribs' },
      { id: 'back_bones', name: 'Back Bones', category: 'ribs', hint: 'For seasoning and soups' },
    ],
    bacon: [
      { id: 'bacon', name: 'Bacon', category: 'bacon', hint: 'Cured and smoked belly' },
      { id: 'belly', name: 'Fresh Belly', category: 'bacon', hint: 'Uncured pork belly' },
      { id: 'jowls', name: 'Jowls', category: 'bacon', hint: 'Similar to bacon' },
      { id: 'fat_back', name: 'Fat Back', category: 'bacon', hint: 'For rendering or cooking' },
      { id: 'lard', name: 'Fat for Lard', category: 'bacon', hint: 'Leaf fat for rendering' },
    ],
    ground: [
      { id: 'ground_pork', name: 'Ground Pork', category: 'ground', hint: '1-2 lb packages' },
    ],
    organs: [
      { id: 'liver', name: 'Liver', category: 'other' },
      { id: 'heart', name: 'Heart', category: 'other' },
      { id: 'kidneys', name: 'Kidneys', category: 'other' },
    ],
  },

  lamb: {
    steaks: [
      { id: 'chops', name: 'Lamb Chops', category: 'steak', hasThickness: true, hint: 'Rib or loin chops' },
      { id: 'sirloin_chops', name: 'Sirloin Chops', category: 'steak', hasThickness: true, hint: 'Economical alternative' },
    ],
    roasts: [
      { id: 'leg', name: 'Leg of Lamb', category: 'roast', hasWeight: true, hint: 'Classic roast' },
      { id: 'shoulder', name: 'Shoulder Roast', category: 'roast', hasWeight: true, hint: 'Rich and flavorful' },
      { id: 'rack', name: 'Rack of Lamb', category: 'roast', hint: 'Elegant, premium cut' },
      { id: 'shanks', name: 'Shanks', category: 'roast', hint: 'Great for braising' },
    ],
    ground: [
      { id: 'ground', name: 'Ground Lamb', category: 'ground', hint: 'For burgers, kebabs' },
      { id: 'stew', name: 'Stew Meat', category: 'ground', hint: 'Cubed for tagines, stews' },
    ],
    organs: [
      { id: 'liver', name: 'Liver', category: 'other' },
      { id: 'heart', name: 'Heart', category: 'other' },
      { id: 'kidneys', name: 'Kidneys', category: 'other' },
      { id: 'bones', name: 'Bones', category: 'other' },
    ],
  },

  goat: {
    steaks: [
      { id: 'chops', name: 'Goat Chops', category: 'steak', hasThickness: true, hint: 'Rib or loin chops' },
    ],
    roasts: [
      { id: 'leg', name: 'Leg Roast', category: 'roast', hasWeight: true, hint: 'Traditional for celebrations' },
      { id: 'shoulder', name: 'Shoulder Roast', category: 'roast', hasWeight: true, hint: 'Rich flavor' },
      { id: 'shanks', name: 'Shanks', category: 'roast', hint: 'For slow cooking' },
    ],
    ground: [
      { id: 'ground', name: 'Ground Goat', category: 'ground', hint: 'For curries, kebabs' },
      { id: 'stew', name: 'Stew Meat', category: 'ground', hint: 'Cubed for curries' },
    ],
    organs: [
      { id: 'liver', name: 'Liver', category: 'other' },
      { id: 'heart', name: 'Heart', category: 'other' },
      { id: 'kidneys', name: 'Kidneys', category: 'other' },
      { id: 'bones', name: 'Bones', category: 'other' },
    ],
  },
}

// Organ options (shared across animals with some variations)
export const ORGAN_OPTIONS: Record<AnimalType, { id: string; name: string }[]> = {
  beef: [
    { id: 'liver', name: 'Liver' },
    { id: 'heart', name: 'Heart' },
    { id: 'tongue', name: 'Tongue' },
    { id: 'kidneys', name: 'Kidneys' },
    { id: 'oxtail', name: 'Oxtail' },
    { id: 'bones', name: 'Bones' },
  ],
  pork: [
    { id: 'liver', name: 'Liver' },
    { id: 'heart', name: 'Heart' },
    { id: 'kidneys', name: 'Kidneys' },
  ],
  lamb: [
    { id: 'liver', name: 'Liver' },
    { id: 'heart', name: 'Heart' },
    { id: 'kidneys', name: 'Kidneys' },
    { id: 'bones', name: 'Bones' },
  ],
  goat: [
    { id: 'liver', name: 'Liver' },
    { id: 'heart', name: 'Heart' },
    { id: 'kidneys', name: 'Kidneys' },
    { id: 'bones', name: 'Bones' },
  ],
}

// Validation Rules
export interface ValidationError {
  type: 'conflict' | 'required' | 'warning'
  message: string
  affectedCuts?: string[]
}

/**
 * Check for T-Bone conflict (beef only)
 * T-Bone includes both NY Strip and Fillet sections - can't select both
 */
export function checkTBoneConflict(selectedCuts: string[]): ValidationError | null {
  const hasTBone = selectedCuts.includes('tbone')
  const hasNYStrip = selectedCuts.includes('nystrip')
  const hasFillet = selectedCuts.includes('fillet')

  if (hasTBone && (hasNYStrip || hasFillet)) {
    return {
      type: 'conflict',
      message: 'T-Bone steaks include both NY Strip and Fillet sections. You cannot select T-Bone with NY Strip or Fillet.',
      affectedCuts: ['tbone', 'nystrip', 'fillet'].filter(c => selectedCuts.includes(c)),
    }
  }

  return null
}

/**
 * Validate cut sheet selections
 */
export function validateCutSheet(
  animalType: AnimalType,
  selectedCuts: string[]
): ValidationError[] {
  const errors: ValidationError[] = []

  // Check T-Bone conflict for beef
  if (animalType === 'beef') {
    const tBoneError = checkTBoneConflict(selectedCuts)
    if (tBoneError) {
      errors.push(tBoneError)
    }
  }

  return errors
}

// Estimated yields from hanging weight
export const YIELD_ESTIMATES = {
  takeHomePercent: { min: 60, max: 65 },
  steaksPercent: 15,
  roastsPercent: 25,
  groundOtherPercent: 25,
  wastePercent: { min: 35, max: 40 },
}

/**
 * Calculate estimated take-home weight from hanging weight
 */
export function estimateTakeHomeWeight(hangingWeight: number): number {
  const avgPercent = (YIELD_ESTIMATES.takeHomePercent.min + YIELD_ESTIMATES.takeHomePercent.max) / 2
  return Math.round(hangingWeight * (avgPercent / 100))
}

// Animal display info
export const ANIMAL_INFO: Record<AnimalType, { icon: string; label: string; color: string }> = {
  beef: { icon: '🐄', label: 'Beef', color: 'green' },
  pork: { icon: '🐷', label: 'Pork', color: 'pink' },
  lamb: { icon: '🐑', label: 'Lamb', color: 'amber' },
  goat: { icon: '🐐', label: 'Goat', color: 'stone' },
}

// Section display info
export const SECTION_INFO = {
  steaks: { icon: '🥩', label: 'Steaks', description: 'Select your preferred steak cuts' },
  roasts: { icon: '🍖', label: 'Roasts', description: 'Choose roast sizes and quantities' },
  ribs: { icon: '🦴', label: 'Ribs', description: 'Select rib styles' },
  bacon: { icon: '🥓', label: 'Bacon & Belly', description: 'Cured and fresh options' },
  sausage: { icon: '🌭', label: 'Sausage', description: 'Choose sausage flavors' },
  ground: { icon: '🍔', label: 'Ground Meat', description: 'How to process trim' },
  other: { icon: '🦴', label: 'Other Cuts', description: 'Additional options' },
  organs: { icon: '🫀', label: 'Organs & Extras', description: 'Keep organs and extras' },
}
