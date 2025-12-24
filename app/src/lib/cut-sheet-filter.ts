/**
 * Cut Sheet Filter
 *
 * Applies processor configuration to filter available cuts.
 * Used by PrimalCutSheetBuilder to only show cuts the processor offers.
 */

import type { AnimalType, ProcessorCutConfig } from '@/types/database'
import {
  CUT_SHEET_SCHEMA,
  type AnimalSchema,
  type Primal,
  type CutChoice,
} from './cut-sheet-schema'

export interface FilteredCutChoice extends CutChoice {
  disabled: boolean
  disabledReason?: string
}

export interface FilteredPrimal extends Omit<Primal, 'choices' | 'subSections'> {
  choices: FilteredCutChoice[]
  subSections?: Record<string, FilteredPrimal>
}

export interface FilteredAnimalSchema extends Omit<AnimalSchema, 'primals'> {
  primals: Record<string, FilteredPrimal>
}

/**
 * Apply processor configuration to filter which cuts are available.
 * Returns a modified schema with disabled cuts marked.
 */
export function applyProcessorConfig(
  animalType: AnimalType,
  config: ProcessorCutConfig | null
): FilteredAnimalSchema | null {
  const baseSchema = CUT_SHEET_SCHEMA.animals[animalType]
  if (!baseSchema) return null

  // If no config, return schema with all cuts enabled
  if (!config) {
    return {
      ...baseSchema,
      primals: mapPrimalsWithDefaults(baseSchema.primals),
    }
  }

  // Check if this animal type is enabled
  const enabledAnimals = config.enabled_animals || ['beef', 'pork', 'lamb', 'goat']
  if (!enabledAnimals.includes(animalType)) {
    return null // Processor doesn't handle this animal type
  }

  const disabledCuts = new Set(config.disabled_cuts || [])

  return {
    ...baseSchema,
    primals: filterPrimals(baseSchema.primals, disabledCuts),
  }
}

/**
 * Map primals with all cuts enabled (default state)
 */
function mapPrimalsWithDefaults(primals: Record<string, Primal>): Record<string, FilteredPrimal> {
  const result: Record<string, FilteredPrimal> = {}

  for (const [key, primal] of Object.entries(primals)) {
    result[key] = {
      ...primal,
      choices: primal.choices.map(cut => ({
        ...cut,
        disabled: false,
      })),
      subSections: primal.subSections
        ? mapPrimalsWithDefaults(primal.subSections)
        : undefined,
    }
  }

  return result
}

/**
 * Filter primals based on disabled cuts
 */
function filterPrimals(
  primals: Record<string, Primal>,
  disabledCuts: Set<string>
): Record<string, FilteredPrimal> {
  const result: Record<string, FilteredPrimal> = {}

  for (const [key, primal] of Object.entries(primals)) {
    const filteredChoices = primal.choices.map(cut => ({
      ...cut,
      disabled: disabledCuts.has(cut.id),
      disabledReason: disabledCuts.has(cut.id)
        ? 'This option is not offered by this processor'
        : undefined,
    }))

    // Only include primal if it has at least one enabled choice
    const hasEnabledChoices = filteredChoices.some(c => !c.disabled)
    const hasEnabledSubsections = primal.subSections &&
      Object.values(filterPrimals(primal.subSections, disabledCuts))
        .some(sub => sub.choices.some(c => !c.disabled))

    if (hasEnabledChoices || hasEnabledSubsections) {
      result[key] = {
        ...primal,
        choices: filteredChoices,
        subSections: primal.subSections
          ? filterPrimals(primal.subSections, disabledCuts)
          : undefined,
      }
    }
  }

  return result
}

/**
 * Get a flat list of all enabled cut IDs for an animal type
 */
export function getEnabledCutIds(
  animalType: AnimalType,
  config: ProcessorCutConfig | null
): string[] {
  const filteredSchema = applyProcessorConfig(animalType, config)
  if (!filteredSchema) return []

  const cutIds: string[] = []

  const collectCutIds = (primals: Record<string, FilteredPrimal>) => {
    for (const primal of Object.values(primals)) {
      for (const cut of primal.choices) {
        if (!cut.disabled) {
          cutIds.push(cut.id)
        }
      }
      if (primal.subSections) {
        collectCutIds(primal.subSections)
      }
    }
  }

  collectCutIds(filteredSchema.primals)
  return cutIds
}

/**
 * Check if a specific cut is enabled for a processor
 */
export function isCutEnabled(
  cutId: string,
  config: ProcessorCutConfig | null
): boolean {
  if (!config) return true // No config means all cuts enabled
  return !(config.disabled_cuts || []).includes(cutId)
}

/**
 * Get the processor's notes for producers
 */
export function getProducerNotes(config: ProcessorCutConfig | null): string | null {
  return config?.producer_notes || null
}

/**
 * Get weight requirements for an animal type
 */
export function getWeightRequirements(config: ProcessorCutConfig | null): {
  min: number | null
  max: number | null
} {
  return {
    min: config?.min_hanging_weight || null,
    max: config?.max_hanging_weight || null,
  }
}

/**
 * Get custom cuts offered by the processor
 */
export function getCustomCuts(config: ProcessorCutConfig | null): CutChoice[] {
  if (!config?.custom_cuts) return []

  // Type assertion since custom_cuts is stored as JSON
  const customCuts = config.custom_cuts as Array<{
    id: string
    name: string
    primal: string
    type: string
    additionalFee?: boolean
    note?: string
  }>

  return customCuts.map(cut => ({
    id: cut.id,
    name: cut.name,
    type: cut.type as CutChoice['type'],
    additionalFee: cut.additionalFee,
    note: cut.note,
  }))
}
