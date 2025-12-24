/**
 * Cut Sheet Validation Engine
 *
 * Validates cut selections against the primal-based schema constraints.
 * This is a pure function with no side effects, making it easy to test.
 *
 * Validation rule types:
 * - exclusiveChoice: Only one option allowed from a primal/sub-section (radio button behavior)
 * - excludes: Hard conflict - selecting A disables B (T-bone vs NY Strip)
 * - conflictsWith: Soft conflict - can coexist but reduces yield
 * - reducesYield: This cut comes from same area (warning only)
 * - requires: Must be selected together (NY Strip requires Filet)
 * - independent: No constraints, always available
 */

import type { AnimalType } from '@/types/database'
import {
  CUT_SHEET_SCHEMA,
  type CutChoice,
  getAllCuts,
  getCutById,
  getPrimalForCut,
} from './cut-sheet-schema'

// ============================================================================
// Types
// ============================================================================

export interface CutSelection {
  cutId: string
  parameters?: Record<string, unknown>
}

export interface ValidationError {
  type: 'exclusiveChoice' | 'excludes' | 'requires'
  cutId: string
  cutName: string
  conflictingCutId: string
  conflictingCutName: string
  message: string
}

export interface ValidationWarning {
  type: 'conflictsWith' | 'reducesYield'
  cutId: string
  cutName: string
  affectedCutId: string
  affectedCutName: string
  message: string
}

export interface DisabledOption {
  cutId: string
  cutName: string
  reason: string
  disabledBy: string // The cut that caused this to be disabled
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  disabledOptions: DisabledOption[]
}

export interface CutAvailability {
  cutId: string
  cutName: string
  available: boolean
  reason?: string
  disabledBy?: string
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validates a set of cut selections against the schema constraints.
 * Returns validation result with errors, warnings, and disabled options.
 */
export function validateCutSheet(
  animalType: AnimalType,
  selections: CutSelection[]
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  const disabledOptions: DisabledOption[] = []

  const animal = CUT_SHEET_SCHEMA.animals[animalType]
  if (!animal) {
    return { isValid: false, errors: [], warnings: [], disabledOptions: [] }
  }

  const selectedIds = new Set(selections.map(s => s.cutId))
  const allCuts = getAllCuts(animalType)
  const cutMap = new Map(allCuts.map(c => [c.id, c]))

  // Check each selection for conflicts
  for (const selection of selections) {
    const cut = cutMap.get(selection.cutId)
    if (!cut) continue

    // 1. Check exclusive choice violations within primals/subsections
    const exclusiveError = checkExclusiveChoice(animalType, selection.cutId, selectedIds)
    if (exclusiveError) {
      errors.push(exclusiveError)
    }

    // 2. Check hard exclusions
    if (cut.excludes) {
      for (const excludedId of cut.excludes) {
        if (selectedIds.has(excludedId)) {
          const excludedCut = cutMap.get(excludedId)
          if (excludedCut) {
            errors.push({
              type: 'excludes',
              cutId: cut.id,
              cutName: cut.name,
              conflictingCutId: excludedId,
              conflictingCutName: excludedCut.name,
              message: `Cannot select both "${cut.name}" and "${excludedCut.name}" - they come from the same section of the animal.`
            })
          }
        }
      }
    }

    // 3. Check required pairs
    if (cut.requires) {
      for (const requiredId of cut.requires) {
        if (!selectedIds.has(requiredId)) {
          const requiredCut = cutMap.get(requiredId)
          if (requiredCut) {
            errors.push({
              type: 'requires',
              cutId: cut.id,
              cutName: cut.name,
              conflictingCutId: requiredId,
              conflictingCutName: requiredCut.name,
              message: `"${cut.name}" requires "${requiredCut.name}" to also be selected (they are separated from the same section).`
            })
          }
        }
      }
    }

    // 4. Check soft conflicts (warnings)
    if (cut.conflictsWith) {
      for (const conflictId of cut.conflictsWith) {
        if (selectedIds.has(conflictId)) {
          const conflictCut = cutMap.get(conflictId)
          if (conflictCut) {
            // Avoid duplicate warnings (only report from one direction)
            const alreadyWarned = warnings.some(
              w => (w.cutId === conflictId && w.affectedCutId === cut.id)
            )
            if (!alreadyWarned) {
              warnings.push({
                type: 'conflictsWith',
                cutId: cut.id,
                cutName: cut.name,
                affectedCutId: conflictId,
                affectedCutName: conflictCut.name,
                message: `Both "${cut.name}" and "${conflictCut.name}" selected - this may reduce the amount of each you receive.`
              })
            }
          }
        }
      }
    }

    // 5. Check yield reduction warnings
    if (cut.reducesYield) {
      const affectedCut = cutMap.get(cut.reducesYield)
      if (affectedCut && selectedIds.has(cut.reducesYield)) {
        warnings.push({
          type: 'reducesYield',
          cutId: cut.id,
          cutName: cut.name,
          affectedCutId: cut.reducesYield,
          affectedCutName: affectedCut.name,
          message: `"${cut.name}" comes from the same area as "${affectedCut.name}" and will reduce the yield.`
        })
      }
    }
  }

  // Build list of disabled options based on current selections
  for (const cut of allCuts) {
    const disabled = getDisabledReason(animalType, cut.id, selectedIds, cutMap)
    if (disabled) {
      disabledOptions.push({
        cutId: cut.id,
        cutName: cut.name,
        reason: disabled.reason,
        disabledBy: disabled.disabledBy
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    disabledOptions
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a cut violates exclusive choice rules within its primal/subsection.
 */
function checkExclusiveChoice(
  animalType: AnimalType,
  cutId: string,
  selectedIds: Set<string>
): ValidationError | null {
  const primalInfo = getPrimalForCut(animalType, cutId)
  if (!primalInfo) return null

  // Check subsection first (more specific)
  if (primalInfo.subSection?.exclusiveChoice) {
    const otherSelected = primalInfo.subSection.choices.filter(
      c => c.id !== cutId && selectedIds.has(c.id)
    )
    if (otherSelected.length > 0) {
      const currentCut = primalInfo.subSection.choices.find(c => c.id === cutId)
      return {
        type: 'exclusiveChoice',
        cutId,
        cutName: currentCut?.name || cutId,
        conflictingCutId: otherSelected[0].id,
        conflictingCutName: otherSelected[0].name,
        message: `Only one option can be selected from "${primalInfo.subSection.displayName}". Choose either "${currentCut?.name}" or "${otherSelected[0].name}".`
      }
    }
  }

  // Check primal level
  if (primalInfo.primal.exclusiveChoice) {
    const otherSelected = primalInfo.primal.choices.filter(
      c => c.id !== cutId && selectedIds.has(c.id)
    )
    if (otherSelected.length > 0) {
      const currentCut = primalInfo.primal.choices.find(c => c.id === cutId)
      return {
        type: 'exclusiveChoice',
        cutId,
        cutName: currentCut?.name || cutId,
        conflictingCutId: otherSelected[0].id,
        conflictingCutName: otherSelected[0].name,
        message: `Only one option can be selected from "${primalInfo.primal.displayName}". Choose either "${currentCut?.name}" or "${otherSelected[0].name}".`
      }
    }
  }

  return null
}

/**
 * Get the reason why a cut is disabled, if any.
 */
function getDisabledReason(
  animalType: AnimalType,
  cutId: string,
  selectedIds: Set<string>,
  cutMap: Map<string, CutChoice>
): { reason: string; disabledBy: string } | null {
  // Don't check if already selected
  if (selectedIds.has(cutId)) return null

  const cut = cutMap.get(cutId)
  if (!cut) return null

  // Check if any selected cut excludes this one
  for (const selectedId of Array.from(selectedIds)) {
    const selectedCut = cutMap.get(selectedId)
    if (selectedCut?.excludes?.includes(cutId)) {
      return {
        reason: `Disabled because "${selectedCut.name}" is selected`,
        disabledBy: selectedId
      }
    }
  }

  // Check if this cut is in an exclusive choice group where another is selected
  const primalInfo = getPrimalForCut(animalType, cutId)
  if (primalInfo) {
    // Check subsection exclusive choice
    if (primalInfo.subSection?.exclusiveChoice) {
      const otherSelected = primalInfo.subSection.choices.find(
        c => c.id !== cutId && selectedIds.has(c.id)
      )
      if (otherSelected) {
        return {
          reason: `Only one option from "${primalInfo.subSection.displayName}" can be selected`,
          disabledBy: otherSelected.id
        }
      }
    }

    // Check primal level exclusive choice
    if (primalInfo.primal.exclusiveChoice) {
      const otherSelected = primalInfo.primal.choices.find(
        c => c.id !== cutId && selectedIds.has(c.id)
      )
      if (otherSelected) {
        return {
          reason: `Only one option from "${primalInfo.primal.displayName}" can be selected`,
          disabledBy: otherSelected.id
        }
      }
    }
  }

  return null
}

/**
 * Get availability status for all cuts given current selections.
 * Useful for UI to show which options are available/disabled.
 */
export function getCutAvailability(
  animalType: AnimalType,
  selections: CutSelection[]
): CutAvailability[] {
  const allCuts = getAllCuts(animalType)
  const cutMap = new Map(allCuts.map(c => [c.id, c]))
  const selectedIds = new Set(selections.map(s => s.cutId))

  return allCuts.map(cut => {
    const disabled = getDisabledReason(animalType, cut.id, selectedIds, cutMap)
    return {
      cutId: cut.id,
      cutName: cut.name,
      available: !disabled,
      reason: disabled?.reason,
      disabledBy: disabled?.disabledBy
    }
  })
}

/**
 * Get which cuts would become disabled if a given cut is selected.
 * Useful for showing previews before selection.
 */
export function getWouldDisable(
  animalType: AnimalType,
  cutId: string
): { cutId: string; cutName: string; reason: string }[] {
  const cut = getCutById(animalType, cutId)
  if (!cut) return []

  const wouldDisable: { cutId: string; cutName: string; reason: string }[] = []
  const allCuts = getAllCuts(animalType)
  const cutMap = new Map(allCuts.map(c => [c.id, c]))

  // Direct exclusions
  if (cut.excludes) {
    for (const excludedId of cut.excludes) {
      const excludedCut = cutMap.get(excludedId)
      if (excludedCut) {
        wouldDisable.push({
          cutId: excludedId,
          cutName: excludedCut.name,
          reason: `Cannot be selected with "${cut.name}"`
        })
      }
    }
  }

  // Exclusive choice group
  const primalInfo = getPrimalForCut(animalType, cutId)
  if (primalInfo) {
    if (primalInfo.subSection?.exclusiveChoice) {
      for (const otherCut of primalInfo.subSection.choices) {
        if (otherCut.id !== cutId) {
          wouldDisable.push({
            cutId: otherCut.id,
            cutName: otherCut.name,
            reason: `Only one option from "${primalInfo.subSection.displayName}" allowed`
          })
        }
      }
    }

    if (primalInfo.primal.exclusiveChoice) {
      for (const otherCut of primalInfo.primal.choices) {
        if (otherCut.id !== cutId) {
          wouldDisable.push({
            cutId: otherCut.id,
            cutName: otherCut.name,
            reason: `Only one option from "${primalInfo.primal.displayName}" allowed`
          })
        }
      }
    }
  }

  return wouldDisable
}

/**
 * Check if a specific cut can be added to current selections.
 */
export function canAddCut(
  animalType: AnimalType,
  cutId: string,
  currentSelections: CutSelection[]
): { allowed: boolean; reason?: string } {
  const availability = getCutAvailability(animalType, currentSelections)
  const cutStatus = availability.find(a => a.cutId === cutId)

  if (!cutStatus) {
    return { allowed: false, reason: 'Cut not found' }
  }

  return {
    allowed: cutStatus.available,
    reason: cutStatus.reason
  }
}

/**
 * Get all required cuts that must be selected along with a given cut.
 */
export function getRequiredCuts(
  animalType: AnimalType,
  cutId: string
): CutChoice[] {
  const cut = getCutById(animalType, cutId)
  if (!cut?.requires) return []

  const required: CutChoice[] = []
  for (const requiredId of cut.requires) {
    const requiredCut = getCutById(animalType, requiredId)
    if (requiredCut) {
      required.push(requiredCut)
    }
  }

  return required
}

/**
 * Validate and auto-fix selections by adding required pairs and removing conflicts.
 * Returns a cleaned selection set and list of changes made.
 */
export function normalizeSelections(
  animalType: AnimalType,
  selections: CutSelection[]
): {
  selections: CutSelection[]
  added: string[]
  removed: string[]
  messages: string[]
} {
  const added: string[] = []
  const removed: string[] = []
  const messages: string[] = []

  let currentSelections = [...selections]
  const cutMap = new Map(getAllCuts(animalType).map(c => [c.id, c]))

  // First pass: Add required cuts
  for (const selection of currentSelections) {
    const cut = cutMap.get(selection.cutId)
    if (cut?.requires) {
      for (const requiredId of cut.requires) {
        if (!currentSelections.some(s => s.cutId === requiredId)) {
          const requiredCut = cutMap.get(requiredId)
          currentSelections.push({ cutId: requiredId })
          added.push(requiredId)
          messages.push(`Added "${requiredCut?.name}" (required by "${cut.name}")`)
        }
      }
    }
  }

  // Second pass: Remove conflicts (keep earlier selection, remove later)
  const toRemove = new Set<string>()

  for (let i = 0; i < currentSelections.length; i++) {
    const cut = cutMap.get(currentSelections[i].cutId)
    if (!cut) continue

    if (cut.excludes) {
      for (const excludedId of cut.excludes) {
        // Check if excluded cut is in a later position
        const excludedIndex = currentSelections.findIndex(s => s.cutId === excludedId)
        if (excludedIndex > i) {
          toRemove.add(excludedId)
          const excludedCut = cutMap.get(excludedId)
          messages.push(`Removed "${excludedCut?.name}" (conflicts with "${cut.name}")`)
        }
      }
    }
  }

  currentSelections = currentSelections.filter(s => !toRemove.has(s.cutId))
  removed.push(...Array.from(toRemove))

  return {
    selections: currentSelections,
    added,
    removed,
    messages
  }
}
