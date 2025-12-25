'use client'

import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  AlertTriangle,
  Beef,
  PiggyBank,
  Rabbit,
  Package,
  ChevronDown,
  ChevronRight,
  Info,
  Ban,
  AlertCircle,
} from 'lucide-react'
import { GoatIcon } from '@/components/icons/AnimalIcons'
import type { AnimalType, SausageFlavor, GroundType, PattySize } from '@/types/database'
import {
  CUT_SHEET_SCHEMA,
  type CutChoice,
  type Primal,
  getAllCuts,
} from '@/lib/cut-sheet-schema'
import {
  applyProcessorConfig,
  getProducerNotes,
  getWeightRequirements,
  type FilteredAnimalSchema,
  type FilteredPrimal,
  type FilteredCutChoice,
} from '@/lib/cut-sheet-filter'
import type { ProcessorCutConfig } from '@/types/database'
import {
  validateCutSheet,
  getCutAvailability,
  getWouldDisable,
  getRequiredCuts,
  type CutSelection,
  type ValidationWarning,
} from '@/lib/cut-sheet-validation'
import { estimateTakeHomeWeight } from '@/lib/cut-sheet-data'
import { CutSheetSummary } from './CutSheetSummary'
import { SausageSection, type SausageSelection } from './SausageSection'
import { OrgansSection, type OrganSelections } from './OrgansSection'

// Local icon data
const ANIMAL_ICONS: Record<AnimalType, { icon: React.ReactNode; label: string }> = {
  beef: { icon: <Beef className="h-5 w-5" />, label: 'Beef' },
  pork: { icon: <PiggyBank className="h-5 w-5" />, label: 'Pork' },
  lamb: { icon: <Rabbit className="h-5 w-5" />, label: 'Lamb' },
  goat: { icon: <GoatIcon className="h-5 w-5" size={20} />, label: 'Goat' },
}

// Split allocation for primals that allow multiple cuts
// Key is primalId, value is record of cutId -> percentage (0-100)
type PrimalSplitAllocations = Record<string, Record<string, number>>

interface PrimalCutSheetState {
  animalType: AnimalType
  hangingWeight: number | null
  selectedCuts: CutSelection[]
  cutParameters: Record<string, Record<string, unknown>>
  splitAllocations: PrimalSplitAllocations  // For primals with allowSplit: true
  groundType: GroundType | null
  groundPackageWeight: number
  pattySize: PattySize | null
  sausages: SausageSelection[]
  organs: OrganSelections
  specialInstructions: string
}

interface CutSheetTemplate {
  id: string
  template_name: string
  animal_type: AnimalType
}

interface PrimalCutSheetBuilderProps {
  initialAnimalType?: AnimalType
  initialState?: Partial<PrimalCutSheetState>
  templates?: CutSheetTemplate[]
  processorConfig?: ProcessorCutConfig | null
  onSave: (state: PrimalCutSheetState) => Promise<void>
  onSaveAsTemplate?: (state: PrimalCutSheetState, name: string) => Promise<void>
  onLoadTemplate?: (templateId: string) => Promise<PrimalCutSheetState | null>
  onCancel?: () => void
}

const DEFAULT_STATE: PrimalCutSheetState = {
  animalType: 'beef',
  hangingWeight: null,
  selectedCuts: [],
  cutParameters: {},
  splitAllocations: {},
  groundType: 'bulk',
  groundPackageWeight: 1,
  pattySize: null,
  sausages: [],
  organs: {
    liver: false,
    heart: false,
    tongue: false,
    kidneys: false,
    oxtail: false,
    bones: false,
  },
  specialInstructions: '',
}

// Split allocation component - single axis slider for exactly 2 cuts
// Uses 25% increments: 0%, 25%, 50%, 75%, 100%
function PrimalSplitAllocator({
  primalName,
  selectedCuts,
  allocations,
  onUpdateAllocation,
}: {
  primalName: string
  selectedCuts: { id: string; name: string }[]
  allocations: Record<string, number>
  onUpdateAllocation: (cutId: string, percentage: number) => void
}) {
  // Only show for exactly 2 cuts (we limit to 2 max for simplicity)
  if (selectedCuts.length !== 2) return null

  const [cutA, cutB] = selectedCuts

  // Get allocation for first cut (second cut gets the remainder)
  const cutAValue = allocations[cutA.id] ?? 50
  const cutBValue = 100 - cutAValue

  // Handle slider change - updates both cuts to always total 100%
  const handleSliderChange = (newCutAValue: number) => {
    // Snap to 25% increments
    const snapped = Math.round(newCutAValue / 25) * 25
    onUpdateAllocation(cutA.id, snapped)
    onUpdateAllocation(cutB.id, 100 - snapped)
  }

  // Preset buttons for quick selection
  const presets = [
    { label: 'All', valueA: 100 },
    { label: '75%', valueA: 75 },
    { label: 'Half', valueA: 50 },
    { label: '25%', valueA: 25 },
    { label: 'None', valueA: 0 },
  ]

  return (
    <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200">
      <div className="font-medium text-green-800 mb-3">
        Split {primalName}
      </div>

      <p className="text-sm text-green-700 mb-4">
        How much of the {primalName.toLowerCase()} should go to each cut?
      </p>

      {/* Axis slider with cut names on each end */}
      <div className="space-y-3">
        {/* Labels above slider */}
        <div className="flex justify-between text-sm">
          <span className="font-medium text-gray-800">{cutA.name}</span>
          <span className="font-medium text-gray-800">{cutB.name}</span>
        </div>

        {/* Slider */}
        <div className="relative">
          <input
            type="range"
            min="0"
            max="100"
            step="25"
            value={cutAValue}
            onChange={(e) => handleSliderChange(parseInt(e.target.value))}
            className="w-full h-3 bg-gradient-to-r from-green-600 to-amber-500 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right,
                #16a34a 0%,
                #16a34a ${cutAValue}%,
                #d97706 ${cutAValue}%,
                #d97706 100%)`
            }}
          />
          {/* Tick marks */}
          <div className="flex justify-between px-1 mt-1">
            {[0, 25, 50, 75, 100].map(tick => (
              <div key={tick} className="flex flex-col items-center">
                <div className="w-0.5 h-2 bg-gray-400" />
                <span className="text-xs text-gray-500 mt-0.5">{tick}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Current allocation display */}
        <div className="flex justify-between items-center pt-2">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-700">{cutAValue}%</div>
            <div className="text-xs text-gray-500">{cutA.name}</div>
          </div>
          <div className="text-gray-400 text-lg">↔</div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{cutBValue}%</div>
            <div className="text-xs text-gray-500">{cutB.name}</div>
          </div>
        </div>

        {/* Quick preset buttons */}
        <div className="flex gap-2 pt-2 border-t border-green-200 mt-3">
          <span className="text-xs text-gray-500 self-center mr-1">{cutA.name}:</span>
          {presets.map(preset => (
            <button
              key={preset.valueA}
              onClick={() => handleSliderChange(preset.valueA)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                cutAValue === preset.valueA
                  ? 'bg-green-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:border-green-400'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Parameter input component for cut options
function CutParameterInputs({
  cut,
  values,
  onChange,
}: {
  cut: CutChoice
  values: Record<string, unknown>
  onChange: (param: string, value: unknown) => void
}) {
  if (!cut.parameters) return null

  const params = cut.parameters

  return (
    <div className="mt-3 pt-3 border-t border-green-200 grid grid-cols-2 gap-3">
      {/* Thickness */}
      {params.thickness && (
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">
            Thickness {params.thickness.unit && `(${params.thickness.unit})`}
          </label>
          <select
            value={String(values.thickness ?? params.thickness.default)}
            onChange={(e) => onChange('thickness', e.target.value)}
            className="w-full text-sm border rounded px-2 py-1.5 bg-white"
          >
            {params.thickness.options.map((opt) => (
              <option key={String(opt)} value={String(opt)}>
                {typeof opt === 'number' ? `${opt}"` : opt}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Per Package */}
      {params.perPackage && (
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">
            Per Package
          </label>
          <select
            value={String(values.perPackage ?? params.perPackage.default)}
            onChange={(e) => onChange('perPackage', parseInt(e.target.value))}
            className="w-full text-sm border rounded px-2 py-1.5 bg-white"
          >
            {params.perPackage.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt} {opt === 1 ? 'piece' : 'pieces'}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Weight */}
      {params.weight && (
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">
            Weight {params.weight.unit && `(${params.weight.unit})`}
          </label>
          <select
            value={String(values.weight ?? params.weight.default)}
            onChange={(e) => onChange('weight', parseFloat(e.target.value))}
            className="w-full text-sm border rounded px-2 py-1.5 bg-white"
          >
            {params.weight.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt} lbs
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Size */}
      {params.size && (
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">
            Size
          </label>
          <select
            value={String(values.size ?? params.size.default)}
            onChange={(e) => onChange('size', e.target.value)}
            className="w-full text-sm border rounded px-2 py-1.5 bg-white"
          >
            {params.size.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Style */}
      {params.style && (
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">
            Style
          </label>
          <select
            value={String(values.style ?? params.style.default)}
            onChange={(e) => onChange('style', e.target.value)}
            className="w-full text-sm border rounded px-2 py-1.5 bg-white"
          >
            {params.style.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Package Size (for ground meat, etc) */}
      {params.packageSize && (
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">
            Package Size
          </label>
          <select
            value={String(values.packageSize ?? params.packageSize.default)}
            onChange={(e) => onChange('packageSize', parseFloat(e.target.value))}
            className="w-full text-sm border rounded px-2 py-1.5 bg-white"
          >
            {params.packageSize.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt} lbs
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Boolean options */}
      {params.boneIn && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`${cut.id}-bonein`}
            checked={Boolean(values.boneIn ?? params.boneIn.default)}
            onChange={(e) => onChange('boneIn', e.target.checked)}
            className="rounded border-gray-300"
          />
          <label htmlFor={`${cut.id}-bonein`} className="text-xs font-medium text-gray-600">
            {params.boneIn.label || 'Bone-in'}
          </label>
        </div>
      )}

      {params.frenched && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`${cut.id}-frenched`}
            checked={Boolean(values.frenched ?? params.frenched.default)}
            onChange={(e) => onChange('frenched', e.target.checked)}
            className="rounded border-gray-300"
          />
          <label htmlFor={`${cut.id}-frenched`} className="text-xs font-medium text-gray-600">
            {params.frenched.label || 'Frenched'}
          </label>
        </div>
      )}
    </div>
  )
}

// Individual cut item component - entire card is clickable
function CutChoiceItem({
  cut,
  isSelected,
  isDisabled,
  disabledReason,
  hasWarning,
  warningMessage,
  parameterValues,
  onToggle,
  onParameterChange,
}: {
  cut: CutChoice
  isSelected: boolean
  isDisabled: boolean
  disabledReason?: string
  hasWarning: boolean
  warningMessage?: string
  parameterValues: Record<string, unknown>
  onToggle: (cut: CutChoice) => void
  onShowWouldDisable: (cutId: string) => void
  onParameterChange: (cutId: string, param: string, value: unknown) => void
}) {
  return (
    <TooltipProvider>
      <div
        onClick={() => !isDisabled && onToggle(cut)}
        className={`relative p-3 border-2 rounded-lg transition-all cursor-pointer ${
          isSelected
            ? 'border-green-600 bg-green-50 shadow-sm'
            : isDisabled
            ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
            : 'border-gray-200 hover:border-green-400 hover:bg-green-50/50'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Checkbox indicator */}
          <div
            className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
              isSelected
                ? 'bg-green-600 border-green-600'
                : isDisabled
                ? 'border-gray-300'
                : 'border-gray-400'
            }`}
          >
            {isSelected && (
              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12">
                <path fill="currentColor" d="M10.28 2.28L4 8.56l-2.28-2.28a.75.75 0 00-1.06 1.06l2.75 2.75a.75.75 0 001.06 0l6.75-6.75a.75.75 0 10-1.06-1.06z" />
              </svg>
            )}
            {isDisabled && <Ban className="w-3 h-3 text-gray-400" />}
          </div>

          {/* Cut info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-medium ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>
                {cut.name}
              </span>
              {cut.specialty && (
                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Specialty</span>
              )}
              {cut.additionalFee && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">+ Fee</span>
              )}
              {hasWarning && (
                <Tooltip>
                  <TooltipTrigger onClick={(e) => e.stopPropagation()}>
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{warningMessage}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {cut.note && (
              <p className="text-sm text-gray-500 mt-0.5">{cut.note}</p>
            )}

            {/* Parameter inputs when selected - stop propagation so clicks don't toggle */}
            {isSelected && cut.parameters && (
              <div onClick={(e) => e.stopPropagation()}>
                <CutParameterInputs
                  cut={cut}
                  values={parameterValues}
                  onChange={(param, value) => onParameterChange(cut.id, param, value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Disabled overlay with reason tooltip */}
        {isDisabled && disabledReason && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute inset-0" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{disabledReason}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}

// Primal section component
function PrimalSection({
  primal,
  selectedCuts,
  cutParameters,
  splitAllocations,
  availability,
  warnings,
  onToggleCut,
  onShowWouldDisable,
  onParameterChange,
  onSplitAllocationChange,
}: {
  primal: FilteredPrimal | Primal
  selectedCuts: CutSelection[]
  cutParameters: Record<string, Record<string, unknown>>
  splitAllocations: Record<string, number>
  availability: ReturnType<typeof getCutAvailability>
  warnings: ValidationWarning[]
  onToggleCut: (cut: CutChoice) => void
  onShowWouldDisable: (cutId: string) => void
  onParameterChange: (cutId: string, param: string, value: unknown) => void
  onSplitAllocationChange: (cutId: string, percentage: number) => void
}) {
  const [isOpen, setIsOpen] = useState(true)
  const selectedIds = new Set(selectedCuts.map(s => s.cutId))

  // Filter out disabled cuts from processor config
  const enabledChoices = primal.choices.filter(c => {
    const filteredCut = c as FilteredCutChoice
    return !filteredCut.disabled
  })

  // Count selected cuts in this primal (for 2-max limit on allowSplit)
  const selectedCountInPrimal = useMemo(() => {
    let count = enabledChoices.filter(c => selectedIds.has(c.id)).length
    if (primal.subSections) {
      for (const sub of Object.values(primal.subSections)) {
        count += sub.choices.filter(c => !(c as FilteredCutChoice).disabled && selectedIds.has(c.id)).length
      }
    }
    return count
  }, [enabledChoices, primal.subSections, selectedIds])

  // For allowSplit primals, limit to 2 selections max
  const atMaxSplitSelections = Boolean(primal.allowSplit) && selectedCountInPrimal >= 2

  const hasSelectedCuts = enabledChoices.some(c => selectedIds.has(c.id)) ||
    (primal.subSections && Object.values(primal.subSections).some(sub => {
      const enabledSubChoices = sub.choices.filter(c => {
        const filteredCut = c as FilteredCutChoice
        return !filteredCut.disabled
      })
      return enabledSubChoices.some(c => selectedIds.has(c.id))
    }))

  // Don't render section if no enabled choices
  if (enabledChoices.length === 0 && (!primal.subSections ||
    Object.values(primal.subSections).every(sub =>
      sub.choices.every(c => (c as FilteredCutChoice).disabled)
    ))) {
    return null
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="mb-4">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {primal.displayName}
                    {hasSelectedCuts && (
                      <span className="text-sm font-normal text-green-600">
                        ({enabledChoices.filter(c => selectedIds.has(c.id)).length +
                          (primal.subSections ? Object.values(primal.subSections).reduce((acc, sub) => {
                            const enabledSubChoices = sub.choices.filter(c => !(c as FilteredCutChoice).disabled)
                            return acc + enabledSubChoices.filter(c => selectedIds.has(c.id)).length
                          }, 0) : 0)} selected)
                      </span>
                    )}
                  </CardTitle>
                  {primal.description && (
                    <CardDescription className="mt-1">{primal.description}</CardDescription>
                  )}
                </div>
              </div>
              {primal.exclusiveChoice && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Choose one</span>
              )}
              {primal.allowSplit && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Can combine</span>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent>
            {/* Main choices - only show enabled cuts */}
            {enabledChoices.length > 0 && (
              <div className={`grid gap-3 ${primal.exclusiveChoice ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                {enabledChoices.map(cut => {
                  const avail = availability.find(a => a.cutId === cut.id)
                  const warning = warnings.find(w => w.cutId === cut.id)
                  const isSelected = selectedIds.has(cut.id)

                  // Disable if: not available OR (at max split and not already selected)
                  const notAvailable = avail ? !avail.available : false
                  const maxSplitReached = atMaxSplitSelections && !isSelected
                  const isDisabled = notAvailable || maxSplitReached
                  const disabledReason = notAvailable
                    ? avail?.reason
                    : maxSplitReached
                    ? 'Maximum of 2 cuts can be combined from this section'
                    : undefined

                  return (
                    <CutChoiceItem
                      key={cut.id}
                      cut={cut}
                      isSelected={isSelected}
                      isDisabled={isDisabled}
                      disabledReason={disabledReason}
                      hasWarning={!!warning}
                      warningMessage={warning?.message}
                      parameterValues={cutParameters[cut.id] || {}}
                      onToggle={onToggleCut}
                      onShowWouldDisable={onShowWouldDisable}
                      onParameterChange={onParameterChange}
                    />
                  )
                })}
              </div>
            )}

            {/* Sub-sections - only show enabled cuts */}
            {primal.subSections && Object.entries(primal.subSections).map(([subId, subSection]) => {
              const enabledSubChoices = subSection.choices.filter(c => !(c as FilteredCutChoice).disabled)

              // Skip subsection if no enabled choices
              if (enabledSubChoices.length === 0) return null

              return (
                <div key={subId} className="mt-6">
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                    {subSection.displayName}
                    {subSection.exclusiveChoice && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Choose one</span>
                    )}
                  </h4>
                  <div className={`grid gap-3 ${subSection.exclusiveChoice ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                    {enabledSubChoices.map(cut => {
                      const avail = availability.find(a => a.cutId === cut.id)
                      const warning = warnings.find(w => w.cutId === cut.id)
                      const isSelected = selectedIds.has(cut.id)

                      // Disable if: not available OR (at max split and not already selected)
                      const notAvailable = avail ? !avail.available : false
                      const maxSplitReached = atMaxSplitSelections && !isSelected
                      const isDisabled = notAvailable || maxSplitReached
                      const disabledReason = notAvailable
                        ? avail?.reason
                        : maxSplitReached
                        ? 'Maximum of 2 cuts can be combined from this section'
                        : undefined

                      return (
                        <CutChoiceItem
                          key={cut.id}
                          cut={cut}
                          isSelected={isSelected}
                          isDisabled={isDisabled}
                          disabledReason={disabledReason}
                          hasWarning={!!warning}
                          warningMessage={warning?.message}
                          parameterValues={cutParameters[cut.id] || {}}
                          onToggle={onToggleCut}
                          onShowWouldDisable={onShowWouldDisable}
                          onParameterChange={onParameterChange}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Split Allocation UI - show when primal allows split and multiple cuts selected */}
            {primal.allowSplit && (() => {
              // Get all selected cuts from this primal (main + subsections)
              const selectedCutsInPrimal = [
                ...enabledChoices.filter(c => selectedIds.has(c.id)),
                ...(primal.subSections
                  ? Object.values(primal.subSections).flatMap(sub =>
                      sub.choices.filter(c => !(c as FilteredCutChoice).disabled && selectedIds.has(c.id))
                    )
                  : []
                )
              ]

              if (selectedCutsInPrimal.length < 2) return null

              return (
                <PrimalSplitAllocator
                  primalName={primal.displayName}
                  selectedCuts={selectedCutsInPrimal.map(c => ({ id: c.id, name: c.name }))}
                  allocations={splitAllocations}
                  onUpdateAllocation={onSplitAllocationChange}
                />
              )
            })()}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

export function PrimalCutSheetBuilder({
  initialAnimalType,
  initialState,
  templates = [],
  processorConfig,
  onSave,
  onSaveAsTemplate,
  onLoadTemplate,
  onCancel,
}: PrimalCutSheetBuilderProps) {
  const [state, setState] = useState<PrimalCutSheetState>({
    ...DEFAULT_STATE,
    animalType: initialAnimalType || 'beef',
    ...initialState,
  })
  const [saving, setSaving] = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [loadingTemplate, setLoadingTemplate] = useState(false)
  const [wouldDisableModal, setWouldDisableModal] = useState<{
    cutId: string
    cutName: string
    wouldDisable: { cutId: string; cutName: string; reason: string }[]
  } | null>(null)

  // Get schema for current animal (filtered by processor config)
  const animalSchema = useMemo(
    () => applyProcessorConfig(state.animalType, processorConfig ?? null) || CUT_SHEET_SCHEMA.animals[state.animalType],
    [state.animalType, processorConfig]
  ) as FilteredAnimalSchema

  // Get processor notes and weight requirements
  const processorNotes = useMemo(
    () => getProducerNotes(processorConfig ?? null),
    [processorConfig]
  )

  const weightRequirements = useMemo(
    () => getWeightRequirements(processorConfig ?? null),
    [processorConfig]
  )

  // Get enabled animal types based on processor config
  const enabledAnimalTypes = useMemo(() => {
    if (!processorConfig?.enabled_animals) {
      return ['beef', 'pork', 'lamb', 'goat'] as AnimalType[]
    }
    return processorConfig.enabled_animals
  }, [processorConfig])

  // Validation
  const validationResult = useMemo(
    () => validateCutSheet(state.animalType, state.selectedCuts),
    [state.animalType, state.selectedCuts]
  )

  // Availability
  const availability = useMemo(
    () => getCutAvailability(state.animalType, state.selectedCuts),
    [state.animalType, state.selectedCuts]
  )

  // Validate split allocations - check if any primals with allowSplit have multiple selected cuts
  // and if so, ensure their allocations total 100%
  const splitAllocationErrors = useMemo(() => {
    const errors: { primalName: string; message: string }[] = []
    const selectedIds = new Set(state.selectedCuts.map(s => s.cutId))

    for (const [primalId, primal] of Object.entries(animalSchema.primals)) {
      if (!primal.allowSplit) continue

      // Get all selected cuts from this primal
      const selectedInPrimal = [
        ...primal.choices.filter(c => selectedIds.has(c.id)),
        ...(primal.subSections
          ? Object.values(primal.subSections).flatMap(sub => sub.choices.filter(c => selectedIds.has(c.id)))
          : []
        )
      ]

      if (selectedInPrimal.length < 2) continue

      // Check if allocations total 100%
      const allocations = state.splitAllocations[primalId] || {}
      const total = selectedInPrimal.reduce((sum, cut) => sum + (allocations[cut.id] || 0), 0)

      // Allow some tolerance for floating point
      if (Math.abs(total - 100) > 0.5) {
        errors.push({
          primalName: primal.displayName,
          message: `${primal.displayName} split allocation must total 100% (currently ${total.toFixed(0)}%)`,
        })
      }
    }

    return errors
  }, [animalSchema.primals, state.selectedCuts, state.splitAllocations])

  const hasErrors = !validationResult.isValid || splitAllocationErrors.length > 0

  // Stats for summary
  const stats = useMemo(() => {
    const cutCount = state.selectedCuts.length
    const organCount = Object.values(state.organs).filter(Boolean).length
    const sausageCount = state.sausages.length
    const estimatedTakeHome = state.hangingWeight ? estimateTakeHomeWeight(state.hangingWeight) : null

    return { cutCount, organCount, sausageCount, estimatedTakeHome }
  }, [state.selectedCuts, state.organs, state.sausages, state.hangingWeight])

  // Toggle cut selection
  const toggleCut = useCallback((cut: CutChoice) => {
    setState(prev => {
      const existingIndex = prev.selectedCuts.findIndex(s => s.cutId === cut.id)

      if (existingIndex >= 0) {
        // Remove cut - also clean up split allocations if needed
        const newSelectedCuts = prev.selectedCuts.filter((_, i) => i !== existingIndex)
        const newSplitAllocations = { ...prev.splitAllocations }

        // Check all primals to see if we need to clean up allocations
        for (const [primalId, primal] of Object.entries(animalSchema.primals)) {
          if (!primal.allowSplit) continue

          // Get remaining selected cuts in this primal
          const remainingInPrimal = [
            ...primal.choices.filter(c => newSelectedCuts.some(s => s.cutId === c.id)),
            ...(primal.subSections
              ? Object.values(primal.subSections).flatMap(sub =>
                  sub.choices.filter(c => newSelectedCuts.some(s => s.cutId === c.id))
                )
              : []
            )
          ]

          // If only one or zero cuts remain, clear allocations for this primal
          if (remainingInPrimal.length < 2) {
            delete newSplitAllocations[primalId]
          } else {
            // Remove the deselected cut from allocations and redistribute
            if (newSplitAllocations[primalId]?.[cut.id]) {
              const oldAllocations = newSplitAllocations[primalId]
              delete oldAllocations[cut.id]
              // Normalize remaining to 100%
              const remaining = Object.entries(oldAllocations)
              if (remaining.length > 0) {
                const evenSplit = Math.floor(100 / remaining.length)
                newSplitAllocations[primalId] = {}
                remaining.forEach(([cId], i) => {
                  newSplitAllocations[primalId][cId] = i === remaining.length - 1
                    ? 100 - (evenSplit * (remaining.length - 1))
                    : evenSplit
                })
              }
            }
          }
        }

        return {
          ...prev,
          selectedCuts: newSelectedCuts,
          splitAllocations: newSplitAllocations,
        }
      } else {
        // Add cut and any required cuts
        const requiredCuts = getRequiredCuts(prev.animalType, cut.id)
        const newSelections: CutSelection[] = [
          ...prev.selectedCuts,
          { cutId: cut.id },
          ...requiredCuts
            .filter(rc => !prev.selectedCuts.some(s => s.cutId === rc.id))
            .map(rc => ({ cutId: rc.id })),
        ]

        // Check if we need to initialize split allocations for allowSplit primals
        const newSplitAllocations = { ...prev.splitAllocations }
        for (const [primalId, primal] of Object.entries(animalSchema.primals)) {
          if (!primal.allowSplit) continue

          // Get selected cuts in this primal after adding the new cut
          const selectedInPrimal = [
            ...primal.choices.filter(c => newSelections.some(s => s.cutId === c.id)),
            ...(primal.subSections
              ? Object.values(primal.subSections).flatMap(sub =>
                  sub.choices.filter(c => newSelections.some(s => s.cutId === c.id))
                )
              : []
            )
          ]

          // If now has 2+ cuts, initialize even split
          if (selectedInPrimal.length >= 2) {
            const evenSplit = Math.floor(100 / selectedInPrimal.length)
            newSplitAllocations[primalId] = {}
            selectedInPrimal.forEach((c, i) => {
              newSplitAllocations[primalId][c.id] = i === selectedInPrimal.length - 1
                ? 100 - (evenSplit * (selectedInPrimal.length - 1))
                : evenSplit
            })
          }
        }

        return {
          ...prev,
          selectedCuts: newSelections,
          splitAllocations: newSplitAllocations,
        }
      }
    })
  }, [animalSchema.primals])

  // Show what would be disabled
  const showWouldDisable = useCallback((cutId: string) => {
    const cut = getAllCuts(state.animalType).find(c => c.id === cutId)
    if (!cut) return

    const wouldDisable = getWouldDisable(state.animalType, cutId)
    setWouldDisableModal({
      cutId,
      cutName: cut.name,
      wouldDisable,
    })
  }, [state.animalType])

  // Update cut parameters (thickness, per package, etc.)
  const handleParameterChange = useCallback((cutId: string, param: string, value: unknown) => {
    setState(prev => ({
      ...prev,
      cutParameters: {
        ...prev.cutParameters,
        [cutId]: {
          ...(prev.cutParameters[cutId] || {}),
          [param]: value,
        },
      },
    }))
  }, [])

  // Update split allocation for a primal
  const handleSplitAllocationChange = useCallback((primalId: string, cutId: string, percentage: number) => {
    setState(prev => ({
      ...prev,
      splitAllocations: {
        ...prev.splitAllocations,
        [primalId]: {
          ...(prev.splitAllocations[primalId] || {}),
          [cutId]: percentage,
        },
      },
    }))
  }, [])

  // Toggle organ
  const toggleOrgan = useCallback((organId: keyof OrganSelections) => {
    setState(prev => ({
      ...prev,
      organs: { ...prev.organs, [organId]: !prev.organs[organId] },
    }))
  }, [])

  // Sausage management
  const toggleSausage = useCallback((flavor: SausageFlavor) => {
    setState(prev => {
      const exists = prev.sausages.find(s => s.flavor === flavor)
      if (exists) {
        return { ...prev, sausages: prev.sausages.filter(s => s.flavor !== flavor) }
      }
      return { ...prev, sausages: [...prev.sausages, { flavor, pounds: 5 }] }
    })
  }, [])

  const updateSausagePounds = useCallback((flavor: SausageFlavor, pounds: number) => {
    setState(prev => ({
      ...prev,
      sausages: prev.sausages.map(s =>
        s.flavor === flavor ? { ...s, pounds } : s
      ),
    }))
  }, [])

  // Handle save
  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(state)
    } finally {
      setSaving(false)
    }
  }

  // Handle save as template
  const handleSaveAsTemplate = async () => {
    if (!onSaveAsTemplate || !templateName.trim()) return
    setSaving(true)
    try {
      await onSaveAsTemplate(state, templateName.trim())
      setShowSaveTemplate(false)
      setTemplateName('')
    } finally {
      setSaving(false)
    }
  }

  // Handle load template
  const handleLoadTemplate = async (templateId: string) => {
    if (!onLoadTemplate) return
    setLoadingTemplate(true)
    try {
      const templateState = await onLoadTemplate(templateId)
      if (templateState) {
        setState(prev => ({
          ...prev,
          ...templateState,
          animalType: initialAnimalType || templateState.animalType,
        }))
      }
    } finally {
      setLoadingTemplate(false)
    }
  }

  // Change animal type (reset selections)
  const changeAnimalType = (type: AnimalType) => {
    setState({ ...DEFAULT_STATE, animalType: type })
  }

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      {/* Main Content */}
      <div>
        {/* Processor Notes */}
        {processorNotes && (
          <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 mt-0.5 text-blue-600 shrink-0" />
              <div>
                <div className="font-medium text-blue-800">From Your Processor</div>
                <div className="text-sm text-blue-700 mt-1 whitespace-pre-wrap">{processorNotes}</div>
              </div>
            </div>
          </div>
        )}

        {/* Weight Requirements */}
        {(weightRequirements.min || weightRequirements.max) && (
          <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 text-amber-600 shrink-0" />
              <div>
                <div className="font-medium text-amber-800">Weight Requirements</div>
                <div className="text-sm text-amber-700 mt-1">
                  {weightRequirements.min && weightRequirements.max && (
                    <>Hanging weight must be between {weightRequirements.min} and {weightRequirements.max} lbs.</>
                  )}
                  {weightRequirements.min && !weightRequirements.max && (
                    <>Minimum hanging weight: {weightRequirements.min} lbs.</>
                  )}
                  {!weightRequirements.min && weightRequirements.max && (
                    <>Maximum hanging weight: {weightRequirements.max} lbs.</>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Animal Type Tabs */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {enabledAnimalTypes.map(type => (
            <button
              key={type}
              onClick={() => changeAnimalType(type)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
                state.animalType === type
                  ? 'bg-green-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="shrink-0">{ANIMAL_ICONS[type].icon}</span>
              <span>{ANIMAL_ICONS[type].label}</span>
            </button>
          ))}
        </div>

        {/* Validation Errors */}
        {(validationResult.errors.length > 0 || splitAllocationErrors.length > 0) && (
          <div className="mb-6 space-y-2">
            {validationResult.errors.map((error, i) => (
              <div
                key={`conflict-${i}`}
                className="p-4 rounded-lg flex items-start gap-3 bg-red-50 border border-red-300"
              >
                <AlertTriangle className="w-5 h-5 mt-0.5 text-red-600" />
                <div>
                  <div className="font-medium text-red-800">Conflict Detected</div>
                  <div className="text-sm text-red-700">{error.message}</div>
                </div>
              </div>
            ))}
            {splitAllocationErrors.map((error, i) => (
              <div
                key={`split-${i}`}
                className="p-4 rounded-lg flex items-start gap-3 bg-red-50 border border-red-300"
              >
                <AlertTriangle className="w-5 h-5 mt-0.5 text-red-600" />
                <div>
                  <div className="font-medium text-red-800">Allocation Required</div>
                  <div className="text-sm text-red-700">{error.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Validation Warnings */}
        {validationResult.warnings.length > 0 && (
          <div className="mb-6 space-y-2">
            {validationResult.warnings.map((warning, i) => (
              <div
                key={i}
                className="p-4 rounded-lg flex items-start gap-3 bg-amber-50 border border-amber-300"
              >
                <AlertCircle className="w-5 h-5 mt-0.5 text-amber-600" />
                <div>
                  <div className="font-medium text-amber-800">Note</div>
                  <div className="text-sm text-amber-700">{warning.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Primal Sections */}
        {Object.entries(animalSchema.primals).map(([primalId, primal]) => (
          <PrimalSection
            key={primalId}
            primal={primal}
            selectedCuts={state.selectedCuts}
            cutParameters={state.cutParameters}
            splitAllocations={state.splitAllocations[primalId] || {}}
            availability={availability}
            warnings={validationResult.warnings}
            onToggleCut={toggleCut}
            onShowWouldDisable={showWouldDisable}
            onParameterChange={handleParameterChange}
            onSplitAllocationChange={(cutId, percentage) => handleSplitAllocationChange(primalId, cutId, percentage)}
          />
        ))}

        {/* Ground Meat Options */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-600" /> Ground Meat Packaging
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {(['bulk', 'vacuum', 'patties'] as GroundType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setState(prev => ({ ...prev, groundType: type }))}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    state.groundType === type
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="mb-1">
                    <Package className="h-6 w-6 text-amber-600 mx-auto" />
                  </div>
                  <div className="font-medium capitalize">{type}</div>
                  <div className="text-xs text-gray-500">
                    {type === 'bulk' && '1-2 lb packages'}
                    {type === 'vacuum' && 'Longer freezer life'}
                    {type === 'patties' && 'Ready to grill'}
                  </div>
                </button>
              ))}
            </div>

            {state.groundType === 'patties' && (
              <div className="flex items-center gap-4">
                <Label>Patty Size:</Label>
                <select
                  className="border rounded px-3 py-2"
                  value={state.pattySize || '1/4'}
                  onChange={e => setState(prev => ({ ...prev, pattySize: e.target.value as PattySize }))}
                >
                  <option value="1/4">1/4 lb</option>
                  <option value="1/3">1/3 lb</option>
                  <option value="1/2">1/2 lb</option>
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sausage (Pork only) */}
        {state.animalType === 'pork' && (
          <SausageSection
            sausages={state.sausages}
            onToggle={toggleSausage}
            onUpdatePounds={updateSausagePounds}
          />
        )}

        {/* Organs */}
        <OrgansSection
          animalType={state.animalType}
          organs={state.organs}
          onToggle={toggleOrgan}
        />

        {/* Special Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Special Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Any special requests or instructions for the processor..."
              value={state.specialInstructions}
              onChange={e => setState(prev => ({ ...prev, specialInstructions: e.target.value }))}
              rows={4}
            />
          </CardContent>
        </Card>
      </div>

      {/* Sidebar Summary */}
      <CutSheetSummary
        animalType={state.animalType}
        hangingWeight={state.hangingWeight}
        stats={stats}
        hasConflicts={hasErrors}
        saving={saving}
        loadingTemplate={loadingTemplate}
        templates={templates}
        onHangingWeightChange={(weight) => setState(prev => ({ ...prev, hangingWeight: weight }))}
        onSave={handleSave}
        onCancel={onCancel}
        onLoadTemplate={onLoadTemplate ? handleLoadTemplate : undefined}
        onShowSaveTemplate={onSaveAsTemplate ? () => setShowSaveTemplate(true) : undefined}
      />

      {/* Would Disable Modal */}
      <Dialog open={!!wouldDisableModal} onOpenChange={() => setWouldDisableModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecting &ldquo;{wouldDisableModal?.cutName}&rdquo;</DialogTitle>
            <DialogDescription>
              This will disable the following options:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {wouldDisableModal?.wouldDisable.length === 0 ? (
              <p className="text-gray-500">No other options will be disabled.</p>
            ) : (
              <ul className="space-y-2">
                {wouldDisableModal?.wouldDisable.map(item => (
                  <li key={item.cutId} className="flex items-start gap-2">
                    <Ban className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <span className="font-medium">{item.cutName}</span>
                      <p className="text-sm text-gray-500">{item.reason}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWouldDisableModal(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save as Template Dialog */}
      <Dialog open={showSaveTemplate} onOpenChange={setShowSaveTemplate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Save your current cut selections as a reusable template
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              placeholder="e.g., Standard Family Pack"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveTemplate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveAsTemplate}
              disabled={!templateName.trim() || saving}
            >
              {saving ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export type { PrimalCutSheetState, CutSheetTemplate }
