'use client'

import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { AlertTriangle, Beef, PiggyBank, Rabbit, Package } from 'lucide-react'
import { GoatIcon } from '@/components/icons/AnimalIcons'
import type { AnimalType, SausageFlavor, GroundType, PattySize } from '@/types/database'
import {
  CUT_DATA,
  validateCutSheet,
  estimateTakeHomeWeight,
  type CutOption,
} from '@/lib/cut-sheet-data'

// Import sub-components
import { CutItem, type CutSelection } from './CutItem'
import { CutSection } from './CutSection'
import { SausageSection, type SausageSelection } from './SausageSection'
import { OrgansSection, type OrganSelections } from './OrgansSection'
import { PorkOptionsSection } from './PorkOptionsSection'
import { CutSheetSummary } from './CutSheetSummary'

// Local icon data to replace emoji-based ANIMAL_INFO
const ANIMAL_ICONS: Record<AnimalType, { icon: React.ReactNode; label: string }> = {
  beef: { icon: <Beef className="h-5 w-5" />, label: 'Beef' },
  pork: { icon: <PiggyBank className="h-5 w-5" />, label: 'Pork' },
  lamb: { icon: <Rabbit className="h-5 w-5" />, label: 'Lamb' },
  goat: { icon: <GoatIcon className="h-5 w-5" size={20} />, label: 'Goat' },
}

interface CutSheetState {
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

interface CutSheetTemplate {
  id: string
  template_name: string
  animal_type: AnimalType
}

interface CutSheetBuilderProps {
  initialAnimalType?: AnimalType
  initialState?: Partial<CutSheetState>
  templates?: CutSheetTemplate[]
  onSave: (state: CutSheetState) => Promise<void>
  onSaveAsTemplate?: (state: CutSheetState, name: string) => Promise<void>
  onLoadTemplate?: (templateId: string) => Promise<CutSheetState | null>
  onCancel?: () => void
}

const DEFAULT_STATE: CutSheetState = {
  animalType: 'beef',
  hangingWeight: null,
  selectedCuts: {},
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
  keepStewMeat: false,
  keepShortRibs: false,
  keepSoupBones: false,
  baconOrBelly: 'bacon',
  hamPreference: 'roast',
  shoulderPreference: 'roast',
  keepJowls: false,
  keepFatBack: false,
  keepLardFat: false,
  specialInstructions: '',
}

export function CutSheetBuilder({
  initialAnimalType,
  initialState,
  templates = [],
  onSave,
  onSaveAsTemplate,
  onLoadTemplate,
  onCancel
}: CutSheetBuilderProps) {
  const [state, setState] = useState<CutSheetState>({
    ...DEFAULT_STATE,
    animalType: initialAnimalType || 'beef',
    ...initialState,
  })
  const [saving, setSaving] = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [loadingTemplate, setLoadingTemplate] = useState(false)

  // Get cuts for current animal type
  const animalCuts = useMemo(() => CUT_DATA[state.animalType], [state.animalType])

  // Validation
  const validationErrors = useMemo(() => {
    const selectedIds = Object.keys(state.selectedCuts)
    return validateCutSheet(state.animalType, selectedIds)
  }, [state.animalType, state.selectedCuts])

  const hasConflicts = validationErrors.some(e => e.type === 'conflict')

  // Calculate summary stats
  const stats = useMemo(() => {
    const cutCount = Object.keys(state.selectedCuts).length
    const organCount = Object.values(state.organs).filter(Boolean).length
    const sausageCount = state.sausages.length
    const estimatedTakeHome = state.hangingWeight ? estimateTakeHomeWeight(state.hangingWeight) : null

    return { cutCount, organCount, sausageCount, estimatedTakeHome }
  }, [state.selectedCuts, state.organs, state.sausages, state.hangingWeight])

  // Toggle cut selection
  const toggleCut = useCallback((cut: CutOption) => {
    setState(prev => {
      const key = cut.id
      const newCuts = { ...prev.selectedCuts }

      if (newCuts[key]) {
        delete newCuts[key]
      } else {
        newCuts[key] = {
          cutId: cut.id,
          cutName: cut.name,
          category: cut.category,
          thickness: cut.hasThickness ? '1"' : undefined,
          weightLbs: cut.hasWeight ? 3 : undefined,
          piecesPerPackage: 2,
        }
      }

      return { ...prev, selectedCuts: newCuts }
    })
  }, [])

  // Update cut parameters
  const updateCutParam = useCallback((cutId: string, param: keyof CutSelection, value: string | number) => {
    setState(prev => {
      const cut = prev.selectedCuts[cutId]
      if (!cut) return prev

      return {
        ...prev,
        selectedCuts: {
          ...prev.selectedCuts,
          [cutId]: { ...cut, [param]: value },
        },
      }
    })
  }, [])

  // Toggle organ
  const toggleOrgan = useCallback((organId: keyof OrganSelections) => {
    setState(prev => ({
      ...prev,
      organs: { ...prev.organs, [organId]: !prev.organs[organId] },
    }))
  }, [])

  // Add/remove sausage
  const toggleSausage = useCallback((flavor: SausageFlavor) => {
    setState(prev => {
      const exists = prev.sausages.find(s => s.flavor === flavor)
      if (exists) {
        return { ...prev, sausages: prev.sausages.filter(s => s.flavor !== flavor) }
      }
      return { ...prev, sausages: [...prev.sausages, { flavor, pounds: 5 }] }
    })
  }, [])

  // Update sausage pounds
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
          // Keep the current animal type if it was set
          animalType: initialAnimalType || templateState.animalType,
        }))
      }
    } finally {
      setLoadingTemplate(false)
    }
  }

  // Render cut item using CutItem component
  const renderCutItem = (cut: CutOption) => {
    const hasConflict = validationErrors.some(e => e.affectedCuts?.includes(cut.id))

    return (
      <CutItem
        key={cut.id}
        cut={cut}
        selection={state.selectedCuts[cut.id]}
        hasConflict={hasConflict}
        onToggle={toggleCut}
        onUpdateParam={updateCutParam}
      />
    )
  }

  // Render section using CutSection component
  const renderSection = (sectionKey: string, cuts?: CutOption[]) => {
    if (!cuts || cuts.length === 0) return null

    return (
      <CutSection sectionKey={sectionKey} cuts={cuts}>
        {cuts.map(renderCutItem)}
      </CutSection>
    )
  }

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      {/* Main Content */}
      <div>
        {/* Animal Type Tabs */}
        <div className="mb-6 flex gap-2">
          {(['beef', 'pork', 'lamb', 'goat'] as AnimalType[]).map(type => (
            <button
              key={type}
              onClick={() => setState({ ...DEFAULT_STATE, animalType: type })}
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

        {/* Validation Warnings */}
        {validationErrors.length > 0 && (
          <div className="mb-6">
            {validationErrors.map((error, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg flex items-start gap-3 mb-2 ${
                  error.type === 'conflict' ? 'bg-amber-50 border border-amber-300' : 'bg-blue-50 border border-blue-200'
                }`}
              >
                <AlertTriangle className={`w-5 h-5 mt-0.5 ${error.type === 'conflict' ? 'text-amber-600' : 'text-blue-600'}`} />
                <div>
                  <div className="font-medium">{error.type === 'conflict' ? 'Conflict Detected' : 'Note'}</div>
                  <div className="text-sm">{error.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sections */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            {renderSection('steaks', animalCuts.steaks)}
            {renderSection('roasts', animalCuts.roasts)}
            {state.animalType === 'pork' && renderSection('ribs', animalCuts.ribs)}
            {state.animalType === 'pork' && renderSection('bacon', animalCuts.bacon)}
          </CardContent>
        </Card>

        {/* Ground Meat */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-600" /> Ground Meat
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
                  <div className="mb-1"><Package className="h-6 w-6 text-amber-600 mx-auto" /></div>
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

            {renderSection('ground', animalCuts.ground)}
            {renderSection('other', animalCuts.other)}
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

        {/* Pork-specific options */}
        {state.animalType === 'pork' && (
          <PorkOptionsSection
            options={{
              baconOrBelly: state.baconOrBelly,
              hamPreference: state.hamPreference,
              shoulderPreference: state.shoulderPreference,
              keepJowls: state.keepJowls,
              keepFatBack: state.keepFatBack,
              keepLardFat: state.keepLardFat,
            }}
            onChange={(key, value) => setState(prev => ({ ...prev, [key]: value }))}
          />
        )}

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
        hasConflicts={hasConflicts}
        saving={saving}
        loadingTemplate={loadingTemplate}
        templates={templates}
        onHangingWeightChange={(weight) => setState(prev => ({ ...prev, hangingWeight: weight }))}
        onSave={handleSave}
        onCancel={onCancel}
        onLoadTemplate={onLoadTemplate ? handleLoadTemplate : undefined}
        onShowSaveTemplate={onSaveAsTemplate ? () => setShowSaveTemplate(true) : undefined}
      />

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

export type { CutSheetState, CutSheetTemplate }
