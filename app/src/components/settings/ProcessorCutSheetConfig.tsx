'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  ChevronDown,
  ChevronRight,
  Beef,
  PiggyBank,
  Rabbit,
  Scissors,
  Info,
} from 'lucide-react'
import { GoatIcon } from '@/components/icons/AnimalIcons'
import { useToast } from '@/hooks/use-toast'
import type { AnimalType } from '@/types/database'
import {
  CUT_SHEET_SCHEMA,
  type Primal,
  type CutChoice,
} from '@/lib/cut-sheet-schema'
import {
  getProcessorCutConfig,
  upsertProcessorCutConfig,
} from '@/lib/actions/processor-cut-config'

const ANIMAL_ICONS: Record<AnimalType, React.ReactNode> = {
  beef: <Beef className="h-5 w-5 text-red-600" />,
  pork: <PiggyBank className="h-5 w-5 text-pink-600" />,
  lamb: <Rabbit className="h-5 w-5 text-purple-600" />,
  goat: <GoatIcon className="h-5 w-5 text-amber-600" size={20} />,
}

const ANIMAL_LABELS: Record<AnimalType, string> = {
  beef: 'Beef',
  pork: 'Pork',
  lamb: 'Lamb',
  goat: 'Goat',
}

interface CutToggleProps {
  cut: CutChoice
  isEnabled: boolean
  onToggle: (cutId: string, enabled: boolean) => void
}

function CutToggle({ cut, isEnabled, onToggle }: CutToggleProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <span className={isEnabled ? 'text-gray-900' : 'text-gray-400'}>
          {cut.name}
        </span>
        {cut.specialty && (
          <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
            Specialty
          </span>
        )}
        {cut.additionalFee && (
          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
            + Fee
          </span>
        )}
      </div>
      <Switch
        checked={isEnabled}
        onCheckedChange={(checked) => onToggle(cut.id, checked)}
      />
    </div>
  )
}

interface PrimalConfigProps {
  primal: Primal
  disabledCuts: Set<string>
  onToggleCut: (cutId: string, enabled: boolean) => void
}

function PrimalConfig({ primal, disabledCuts, onToggleCut }: PrimalConfigProps) {
  const [isOpen, setIsOpen] = useState(false)

  const enabledCount = primal.choices.filter(c => !disabledCuts.has(c.id)).length
  const totalCount = primal.choices.length

  // Count subsection cuts too
  let subEnabledCount = 0
  let subTotalCount = 0
  if (primal.subSections) {
    for (const sub of Object.values(primal.subSections)) {
      subTotalCount += sub.choices.length
      subEnabledCount += sub.choices.filter(c => !disabledCuts.has(c.id)).length
    }
  }

  const totalEnabled = enabledCount + subEnabledCount
  const grandTotal = totalCount + subTotalCount

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-2">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-medium">{primal.displayName}</span>
          </div>
          <span className="text-sm text-gray-500">
            {totalEnabled}/{grandTotal} enabled
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6 pr-2 py-2 space-y-1">
        {primal.choices.map(cut => (
          <CutToggle
            key={cut.id}
            cut={cut}
            isEnabled={!disabledCuts.has(cut.id)}
            onToggle={onToggleCut}
          />
        ))}

        {primal.subSections && Object.entries(primal.subSections).map(([subId, subSection]) => (
          <div key={subId} className="mt-3">
            <div className="text-sm font-medium text-gray-600 mb-2">{subSection.displayName}</div>
            <div className="pl-3 border-l-2 border-gray-200">
              {subSection.choices.map(cut => (
                <CutToggle
                  key={cut.id}
                  cut={cut}
                  isEnabled={!disabledCuts.has(cut.id)}
                  onToggle={onToggleCut}
                />
              ))}
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

interface AnimalCutConfigProps {
  animalType: AnimalType
  disabledCuts: Set<string>
  onToggleCut: (cutId: string, enabled: boolean) => void
}

function AnimalCutConfig({ animalType, disabledCuts, onToggleCut }: AnimalCutConfigProps) {
  const [isOpen, setIsOpen] = useState(false)
  const schema = CUT_SHEET_SCHEMA.animals[animalType]

  // Calculate enabled counts
  let enabledCount = 0
  let totalCount = 0
  for (const primal of Object.values(schema.primals)) {
    totalCount += primal.choices.length
    enabledCount += primal.choices.filter(c => !disabledCuts.has(c.id)).length
    if (primal.subSections) {
      for (const sub of Object.values(primal.subSections)) {
        totalCount += sub.choices.length
        enabledCount += sub.choices.filter(c => !disabledCuts.has(c.id)).length
      }
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between p-4 rounded-lg border-2 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            {ANIMAL_ICONS[animalType]}
            <span className="font-semibold">{ANIMAL_LABELS[animalType]}</span>
          </div>
          <span className="text-sm text-gray-500">
            {enabledCount}/{totalCount} cuts enabled
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-4 pr-2 py-3 space-y-2">
        {Object.entries(schema.primals).map(([primalId, primal]) => (
          <PrimalConfig
            key={primalId}
            primal={primal}
            disabledCuts={disabledCuts}
            onToggleCut={onToggleCut}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

export function ProcessorCutSheetConfig() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [disabledCuts, setDisabledCuts] = useState<Set<string>>(new Set())
  const [producerNotes, setProducerNotes] = useState('')
  const [minWeight, setMinWeight] = useState<string>('')
  const [maxWeight, setMaxWeight] = useState<string>('')
  const [hasChanges, setHasChanges] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function loadConfig() {
      const data = await getProcessorCutConfig()
      if (data) {
        setDisabledCuts(new Set(data.disabled_cuts || []))
        setProducerNotes(data.producer_notes || '')
        setMinWeight(data.min_hanging_weight?.toString() || '')
        setMaxWeight(data.max_hanging_weight?.toString() || '')
      }
      setLoading(false)
    }
    loadConfig()
  }, [])

  const handleToggleCut = useCallback((cutId: string, enabled: boolean) => {
    setDisabledCuts(prev => {
      const newSet = new Set(prev)
      if (enabled) {
        newSet.delete(cutId)
      } else {
        newSet.add(cutId)
      }
      return newSet
    })
    setHasChanges(true)
  }, [])

  const handleSave = async () => {
    setSaving(true)

    const result = await upsertProcessorCutConfig({
      disabled_cuts: Array.from(disabledCuts),
      producer_notes: producerNotes || null,
      min_hanging_weight: minWeight ? parseInt(minWeight) : null,
      max_hanging_weight: maxWeight ? parseInt(maxWeight) : null,
    })

    setSaving(false)

    if (result.success) {
      setHasChanges(false)
      toast({
        title: 'Saved',
        description: 'Cut sheet configuration has been updated.',
      })
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to save configuration',
        variant: 'destructive',
      })
    }
  }

  const handleEnableAll = (animalType: AnimalType) => {
    const schema = CUT_SHEET_SCHEMA.animals[animalType]
    setDisabledCuts(prev => {
      const newSet = new Set(prev)
      for (const primal of Object.values(schema.primals)) {
        for (const cut of primal.choices) {
          newSet.delete(cut.id)
        }
        if (primal.subSections) {
          for (const sub of Object.values(primal.subSections)) {
            for (const cut of sub.choices) {
              newSet.delete(cut.id)
            }
          }
        }
      }
      return newSet
    })
    setHasChanges(true)
  }

  const handleDisableAll = (animalType: AnimalType) => {
    const schema = CUT_SHEET_SCHEMA.animals[animalType]
    setDisabledCuts(prev => {
      const newSet = new Set(prev)
      for (const primal of Object.values(schema.primals)) {
        for (const cut of primal.choices) {
          newSet.add(cut.id)
        }
        if (primal.subSections) {
          for (const sub of Object.values(primal.subSections)) {
            for (const cut of sub.choices) {
              newSet.add(cut.id)
            }
          }
        }
      }
      return newSet
    })
    setHasChanges(true)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <Scissors className="h-5 w-5" />
          Cut Sheet Configuration
        </CardTitle>
        <CardDescription>
          Configure which cuts you offer to producers. Disabled cuts won&apos;t appear on their cut sheet forms.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info Box */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 flex gap-3">
          <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">How this works</p>
            <p className="mt-1">
              Toggle off any cuts you don&apos;t offer. When producers fill out their cut sheet,
              they&apos;ll only see the options you have enabled.
            </p>
          </div>
        </div>

        {/* Weight Requirements */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Weight Requirements (Optional)</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minWeight">Minimum Hanging Weight (lbs)</Label>
              <Input
                id="minWeight"
                type="number"
                min="0"
                placeholder="e.g., 300"
                value={minWeight}
                onChange={(e) => {
                  setMinWeight(e.target.value)
                  setHasChanges(true)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxWeight">Maximum Hanging Weight (lbs)</Label>
              <Input
                id="maxWeight"
                type="number"
                min="0"
                placeholder="e.g., 800"
                value={maxWeight}
                onChange={(e) => {
                  setMaxWeight(e.target.value)
                  setHasChanges(true)
                }}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Producer Notes */}
        <div className="space-y-3">
          <Label htmlFor="producerNotes" className="text-base font-medium">
            Notes for Producers
          </Label>
          <Textarea
            id="producerNotes"
            placeholder="Any special instructions or notes you want producers to see when filling out their cut sheet..."
            value={producerNotes}
            onChange={(e) => {
              setProducerNotes(e.target.value)
              setHasChanges(true)
            }}
            rows={3}
          />
          <p className="text-xs text-gray-500">
            This message will be displayed at the top of the cut sheet form for your customers.
          </p>
        </div>

        <Separator />

        {/* Cut Configuration by Animal */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Available Cuts</Label>
          </div>

          <div className="space-y-3">
            {(['beef', 'pork', 'lamb', 'goat'] as AnimalType[]).map(animalType => (
              <div key={animalType}>
                <div className="flex items-center justify-end gap-2 mb-1">
                  <button
                    type="button"
                    onClick={() => handleEnableAll(animalType)}
                    className="text-xs text-green-600 hover:text-green-700"
                  >
                    Enable all
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => handleDisableAll(animalType)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Disable all
                  </button>
                </div>
                <AnimalCutConfig
                  animalType={animalType}
                  disabledCuts={disabledCuts}
                  onToggleCut={handleToggleCut}
                />
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Save Button */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {hasChanges ? 'You have unsaved changes' : 'All changes saved'}
          </p>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
