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

interface PrimalCutSheetState {
  animalType: AnimalType
  hangingWeight: number | null
  selectedCuts: CutSelection[]
  cutParameters: Record<string, Record<string, unknown>>
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

// Individual cut item component
function CutChoiceItem({
  cut,
  isSelected,
  isDisabled,
  disabledReason,
  hasWarning,
  warningMessage,
  onToggle,
  onShowWouldDisable,
}: {
  cut: CutChoice
  isSelected: boolean
  isDisabled: boolean
  disabledReason?: string
  hasWarning: boolean
  warningMessage?: string
  onToggle: (cut: CutChoice) => void
  onShowWouldDisable: (cutId: string) => void
}) {
  return (
    <TooltipProvider>
      <div
        className={`relative p-3 border rounded-lg transition-all ${
          isSelected
            ? 'border-green-600 bg-green-50'
            : isDisabled
            ? 'border-gray-200 bg-gray-50 opacity-60'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Checkbox / Radio indicator */}
          <button
            onClick={() => !isDisabled && onToggle(cut)}
            disabled={isDisabled}
            className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-green-600 border-green-600'
                : isDisabled
                ? 'border-gray-300 cursor-not-allowed'
                : 'border-gray-400 hover:border-green-500'
            }`}
          >
            {isSelected && (
              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12">
                <path fill="currentColor" d="M10.28 2.28L4 8.56l-2.28-2.28a.75.75 0 00-1.06 1.06l2.75 2.75a.75.75 0 001.06 0l6.75-6.75a.75.75 0 10-1.06-1.06z" />
              </svg>
            )}
            {isDisabled && <Ban className="w-3 h-3 text-gray-400" />}
          </button>

          {/* Cut info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
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
                  <TooltipTrigger>
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

            {/* Show what would be disabled if hovering/focusing */}
            {!isSelected && !isDisabled && (
              <button
                onClick={() => onShowWouldDisable(cut.id)}
                className="text-xs text-gray-400 hover:text-gray-600 mt-1 flex items-center gap-1"
              >
                <Info className="w-3 h-3" />
                See what this disables
              </button>
            )}
          </div>
        </div>

        {/* Disabled overlay with reason */}
        {isDisabled && disabledReason && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute inset-0 cursor-not-allowed" />
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
  availability,
  warnings,
  onToggleCut,
  onShowWouldDisable,
}: {
  primal: Primal
  selectedCuts: CutSelection[]
  availability: ReturnType<typeof getCutAvailability>
  warnings: ValidationWarning[]
  onToggleCut: (cut: CutChoice) => void
  onShowWouldDisable: (cutId: string) => void
}) {
  const [isOpen, setIsOpen] = useState(true)
  const selectedIds = new Set(selectedCuts.map(s => s.cutId))

  const hasSelectedCuts = primal.choices.some(c => selectedIds.has(c.id)) ||
    (primal.subSections && Object.values(primal.subSections).some(sub =>
      sub.choices.some(c => selectedIds.has(c.id))
    ))

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
                        ({primal.choices.filter(c => selectedIds.has(c.id)).length +
                          (primal.subSections ? Object.values(primal.subSections).reduce((acc, sub) =>
                            acc + sub.choices.filter(c => selectedIds.has(c.id)).length, 0) : 0)} selected)
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
            {/* Main choices */}
            {primal.choices.length > 0 && (
              <div className={`grid gap-3 ${primal.exclusiveChoice ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                {primal.choices.map(cut => {
                  const avail = availability.find(a => a.cutId === cut.id)
                  const warning = warnings.find(w => w.cutId === cut.id)

                  return (
                    <CutChoiceItem
                      key={cut.id}
                      cut={cut}
                      isSelected={selectedIds.has(cut.id)}
                      isDisabled={!avail?.available}
                      disabledReason={avail?.reason}
                      hasWarning={!!warning}
                      warningMessage={warning?.message}
                      onToggle={onToggleCut}
                      onShowWouldDisable={onShowWouldDisable}
                    />
                  )
                })}
              </div>
            )}

            {/* Sub-sections */}
            {primal.subSections && Object.entries(primal.subSections).map(([subId, subSection]) => (
              <div key={subId} className="mt-6">
                <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  {subSection.displayName}
                  {subSection.exclusiveChoice && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Choose one</span>
                  )}
                </h4>
                <div className={`grid gap-3 ${subSection.exclusiveChoice ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                  {subSection.choices.map(cut => {
                    const avail = availability.find(a => a.cutId === cut.id)
                    const warning = warnings.find(w => w.cutId === cut.id)

                    return (
                      <CutChoiceItem
                        key={cut.id}
                        cut={cut}
                        isSelected={selectedIds.has(cut.id)}
                        isDisabled={!avail?.available}
                        disabledReason={avail?.reason}
                        hasWarning={!!warning}
                        warningMessage={warning?.message}
                        onToggle={onToggleCut}
                        onShowWouldDisable={onShowWouldDisable}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
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

  // Get schema for current animal
  const animalSchema = useMemo(
    () => CUT_SHEET_SCHEMA.animals[state.animalType],
    [state.animalType]
  )

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

  const hasErrors = !validationResult.isValid

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
        // Remove cut
        return {
          ...prev,
          selectedCuts: prev.selectedCuts.filter((_, i) => i !== existingIndex),
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

        return { ...prev, selectedCuts: newSelections }
      }
    })
  }, [])

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
        {/* Animal Type Tabs */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {(['beef', 'pork', 'lamb', 'goat'] as AnimalType[]).map(type => (
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
        {validationResult.errors.length > 0 && (
          <div className="mb-6 space-y-2">
            {validationResult.errors.map((error, i) => (
              <div
                key={i}
                className="p-4 rounded-lg flex items-start gap-3 bg-red-50 border border-red-300"
              >
                <AlertTriangle className="w-5 h-5 mt-0.5 text-red-600" />
                <div>
                  <div className="font-medium text-red-800">Conflict Detected</div>
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
            availability={availability}
            warnings={validationResult.warnings}
            onToggleCut={toggleCut}
            onShowWouldDisable={showWouldDisable}
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
