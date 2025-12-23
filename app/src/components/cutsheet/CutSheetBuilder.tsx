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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Check, AlertTriangle, Save, FolderOpen, ChevronDown, Beef, PiggyBank, Rabbit, Package, Utensils, Bone, Heart } from 'lucide-react'
import { GoatIcon } from '@/components/icons/AnimalIcons'
import type { AnimalType, CutCategory, SausageFlavor, GroundType, PattySize } from '@/types/database'
import {
  CUT_DATA,
  THICKNESS_OPTIONS,
  PIECES_OPTIONS,
  WEIGHT_OPTIONS,
  SAUSAGE_FLAVORS,
  ORGAN_OPTIONS,
  SECTION_INFO,
  validateCutSheet,
  estimateTakeHomeWeight,
  type CutOption,
} from '@/lib/cut-sheet-data'

// Local icon data to replace emoji-based ANIMAL_INFO
const ANIMAL_ICONS: Record<AnimalType, { icon: React.ReactNode; label: string; color: string }> = {
  beef: { icon: <Beef className="h-5 w-5" />, label: 'Beef', color: 'green' },
  pork: { icon: <PiggyBank className="h-5 w-5" />, label: 'Pork', color: 'pink' },
  lamb: { icon: <Rabbit className="h-5 w-5" />, label: 'Lamb', color: 'amber' },
  goat: { icon: <GoatIcon className="h-5 w-5" size={20} />, label: 'Goat', color: 'stone' },
}

// Local section icons to replace emoji-based SECTION_INFO icons
const SECTION_ICONS: Record<string, React.ReactNode> = {
  steaks: <Utensils className="h-6 w-6 text-red-600" />,
  roasts: <Package className="h-6 w-6 text-amber-600" />,
  ribs: <Bone className="h-6 w-6 text-gray-600" />,
  bacon: <Package className="h-6 w-6 text-rose-600" />,
  sausage: <Package className="h-6 w-6 text-pink-600" />,
  ground: <Package className="h-6 w-6 text-brown-600" />,
  other: <Bone className="h-6 w-6 text-gray-600" />,
  organs: <Heart className="h-6 w-6 text-red-600" />,
}

// Types for cut selections
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
  const organOptions = useMemo(() => ORGAN_OPTIONS[state.animalType], [state.animalType])

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

  // Filter templates for current animal type
  const availableTemplates = templates.filter(t => t.animal_type === state.animalType)

  // Render cut item
  const renderCutItem = (cut: CutOption) => {
    const isSelected = !!state.selectedCuts[cut.id]
    const selection = state.selectedCuts[cut.id]
    const hasConflict = validationErrors.some(e => e.affectedCuts?.includes(cut.id))

    return (
      <div
        key={cut.id}
        className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
          hasConflict
            ? 'border-amber-400 bg-amber-50'
            : isSelected
            ? 'border-green-600 bg-green-50'
            : 'border-gray-200 bg-gray-50 hover:border-gray-300'
        }`}
        onClick={() => toggleCut(cut)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                isSelected ? 'bg-green-600 border-green-600' : 'border-gray-300 bg-white'
              }`}
            >
              {isSelected && <Check className="w-3 h-3 text-white" />}
            </div>
            <div>
              <div className="font-medium">{cut.name}</div>
              {cut.hint && <div className="text-sm text-gray-500">{cut.hint}</div>}
            </div>
          </div>

          {isSelected && (
            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
              {cut.hasThickness && (
                <select
                  className="text-sm border rounded px-2 py-1"
                  value={selection?.thickness || '1"'}
                  onChange={e => updateCutParam(cut.id, 'thickness', e.target.value)}
                >
                  {THICKNESS_OPTIONS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              )}
              {cut.hasWeight && (
                <select
                  className="text-sm border rounded px-2 py-1"
                  value={selection?.weightLbs || 3}
                  onChange={e => updateCutParam(cut.id, 'weightLbs', Number(e.target.value))}
                >
                  {WEIGHT_OPTIONS.map(w => (
                    <option key={w} value={w}>{w} lbs</option>
                  ))}
                </select>
              )}
              <select
                className="text-sm border rounded px-2 py-1"
                value={selection?.piecesPerPackage || 2}
                onChange={e => updateCutParam(cut.id, 'piecesPerPackage', Number(e.target.value))}
              >
                {PIECES_OPTIONS.map(p => (
                  <option key={p} value={p}>{p}/pkg</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render section
  const renderSection = (sectionKey: string, cuts?: CutOption[]) => {
    if (!cuts || cuts.length === 0) return null
    const info = SECTION_INFO[sectionKey as keyof typeof SECTION_INFO]

    return (
      <div id={sectionKey} className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="shrink-0">{SECTION_ICONS[sectionKey] || SECTION_ICONS.other}</span>
          <div>
            <h3 className="text-lg font-semibold">{info?.label || sectionKey}</h3>
            <p className="text-sm text-gray-500">{info?.description}</p>
          </div>
        </div>
        <div className="grid gap-3">
          {cuts.map(renderCutItem)}
        </div>
      </div>
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
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-rose-600" /> Sausage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">Select sausage flavors and specify pounds for each</p>
              <div className="grid gap-3">
                {SAUSAGE_FLAVORS.map(sausage => {
                  const selection = state.sausages.find(s => s.flavor === sausage.id)
                  const isSelected = !!selection

                  return (
                    <div
                      key={sausage.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isSelected ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="flex items-center gap-3 cursor-pointer flex-1"
                          onClick={() => toggleSausage(sausage.id)}
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected ? 'bg-green-600 border-green-600' : 'border-gray-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div>
                            <div className="font-medium">{sausage.name}</div>
                            <div className="text-sm text-gray-500">{sausage.hint}</div>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max="50"
                              value={selection.pounds}
                              onChange={e => updateSausagePounds(sausage.id, Number(e.target.value))}
                              className="w-20 border rounded px-2 py-1 text-sm"
                            />
                            <span className="text-sm text-gray-500">lbs</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Organs */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-600" /> Organs & Extras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">Would you like to keep any of the following?</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {organOptions.map(organ => {
                const isSelected = state.organs[organ.id as keyof OrganSelections]

                return (
                  <button
                    key={organ.id}
                    onClick={() => toggleOrgan(organ.id as keyof OrganSelections)}
                    className={`p-3 rounded-lg border-2 flex items-center gap-3 transition-all ${
                      isSelected ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected ? 'bg-green-600 border-green-600' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="font-medium">{organ.name}</span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Pork-specific options */}
        {state.animalType === 'pork' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Pork Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-2 block">Bacon / Belly</Label>
                <div className="flex gap-2">
                  {(['bacon', 'fresh_belly', 'both', 'none'] as const).map(opt => (
                    <button
                      key={opt}
                      onClick={() => setState(prev => ({ ...prev, baconOrBelly: opt }))}
                      className={`px-3 py-2 rounded border-2 text-sm capitalize ${
                        state.baconOrBelly === opt ? 'border-green-600 bg-green-50' : 'border-gray-200'
                      }`}
                    >
                      {opt.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Ham</Label>
                <div className="flex gap-2">
                  {(['sliced', 'roast', 'both', 'none'] as const).map(opt => (
                    <button
                      key={opt}
                      onClick={() => setState(prev => ({ ...prev, hamPreference: opt }))}
                      className={`px-3 py-2 rounded border-2 text-sm capitalize ${
                        state.hamPreference === opt ? 'border-green-600 bg-green-50' : 'border-gray-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Shoulder</Label>
                <div className="flex gap-2">
                  {(['sliced', 'roast', 'both', 'none'] as const).map(opt => (
                    <button
                      key={opt}
                      onClick={() => setState(prev => ({ ...prev, shoulderPreference: opt }))}
                      className={`px-3 py-2 rounded border-2 text-sm capitalize ${
                        state.shoulderPreference === opt ? 'border-green-600 bg-green-50' : 'border-gray-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                {[
                  { key: 'keepJowls', label: 'Keep Jowls' },
                  { key: 'keepFatBack', label: 'Keep Fat Back' },
                  { key: 'keepLardFat', label: 'Keep Lard Fat' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setState(prev => ({ ...prev, [key]: !prev[key as keyof CutSheetState] }))}
                    className={`px-3 py-2 rounded border-2 flex items-center gap-2 ${
                      state[key as keyof CutSheetState] ? 'border-green-600 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        state[key as keyof CutSheetState] ? 'bg-green-600 border-green-600' : 'border-gray-300'
                      }`}
                    >
                      {state[key as keyof CutSheetState] && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className="text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
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
      <div className="lg:sticky lg:top-6 h-fit">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-gray-500">Animal Type</Label>
              <div className="font-medium flex items-center gap-2">
                <span className="shrink-0">{ANIMAL_ICONS[state.animalType].icon}</span>
                <span>{ANIMAL_ICONS[state.animalType].label}</span>
              </div>
            </div>

            <div>
              <Label className="text-sm text-gray-500">Hanging Weight (if known)</Label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., 642"
                value={state.hangingWeight || ''}
                onChange={e => setState(prev => ({ ...prev, hangingWeight: e.target.value ? Number(e.target.value) : null }))}
              />
              {stats.estimatedTakeHome && (
                <div className="text-sm text-gray-500 mt-1">
                  Est. take-home: ~{stats.estimatedTakeHome} lbs
                </div>
              )}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Cuts Selected</span>
                <span className="font-medium">{stats.cutCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Organs</span>
                <span className="font-medium">{stats.organCount}</span>
              </div>
              {state.animalType === 'pork' && (
                <div className="flex justify-between text-sm">
                  <span>Sausage Flavors</span>
                  <span className="font-medium">{stats.sausageCount}</span>
                </div>
              )}
            </div>

            {hasConflicts && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                Please resolve conflicts before saving
              </div>
            )}

            {/* Template Actions */}
            {(availableTemplates.length > 0 || onSaveAsTemplate) && (
              <div className="border-t pt-4 space-y-2">
                <Label className="text-sm text-gray-500">Templates</Label>
                <div className="flex gap-2">
                  {availableTemplates.length > 0 && onLoadTemplate && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" disabled={loadingTemplate}>
                          <FolderOpen className="h-4 w-4 mr-2" />
                          Load
                          <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {availableTemplates.map(t => (
                          <DropdownMenuItem key={t.id} onClick={() => handleLoadTemplate(t.id)}>
                            {t.template_name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {onSaveAsTemplate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSaveTemplate(true)}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save as Template
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="border-t pt-4 space-y-2">
              <Button
                className="w-full bg-green-700 hover:bg-green-800"
                onClick={handleSave}
                disabled={saving || hasConflicts}
              >
                {saving ? 'Saving...' : 'Save Cut Sheet'}
              </Button>
              {onCancel && (
                <Button variant="outline" className="w-full" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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
