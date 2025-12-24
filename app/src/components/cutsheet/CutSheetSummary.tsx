'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Save, FolderOpen, ChevronDown, Beef, PiggyBank, Rabbit } from 'lucide-react'
import { GoatIcon } from '@/components/icons/AnimalIcons'
import type { AnimalType } from '@/types/database'

// Animal icons
const ANIMAL_ICONS: Record<AnimalType, { icon: React.ReactNode; label: string }> = {
  beef: { icon: <Beef className="h-5 w-5" />, label: 'Beef' },
  pork: { icon: <PiggyBank className="h-5 w-5" />, label: 'Pork' },
  lamb: { icon: <Rabbit className="h-5 w-5" />, label: 'Lamb' },
  goat: { icon: <GoatIcon className="h-5 w-5" size={20} />, label: 'Goat' },
}

interface Template {
  id: string
  template_name: string
  animal_type: AnimalType
}

interface SummaryStats {
  cutCount: number
  organCount: number
  sausageCount: number
  estimatedTakeHome: number | null
}

interface CutSheetSummaryProps {
  animalType: AnimalType
  hangingWeight: number | null
  stats: SummaryStats
  hasConflicts: boolean
  saving: boolean
  loadingTemplate: boolean
  templates: Template[]
  onHangingWeightChange: (weight: number | null) => void
  onSave: () => void
  onCancel?: () => void
  onLoadTemplate?: (templateId: string) => void
  onShowSaveTemplate?: () => void
}

export function CutSheetSummary({
  animalType,
  hangingWeight,
  stats,
  hasConflicts,
  saving,
  loadingTemplate,
  templates,
  onHangingWeightChange,
  onSave,
  onCancel,
  onLoadTemplate,
  onShowSaveTemplate,
}: CutSheetSummaryProps) {
  const availableTemplates = templates.filter(t => t.animal_type === animalType)

  return (
    <div className="lg:sticky lg:top-6 h-fit">
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Animal Type */}
          <div>
            <Label className="text-sm text-gray-500">Animal Type</Label>
            <div className="font-medium flex items-center gap-2">
              <span className="shrink-0">{ANIMAL_ICONS[animalType].icon}</span>
              <span>{ANIMAL_ICONS[animalType].label}</span>
            </div>
          </div>

          {/* Hanging Weight */}
          <div>
            <Label className="text-sm text-gray-500">Hanging Weight (if known)</Label>
            <input
              type="number"
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., 642"
              value={hangingWeight || ''}
              onChange={e => onHangingWeightChange(e.target.value ? Number(e.target.value) : null)}
            />
            {stats.estimatedTakeHome && (
              <div className="text-sm text-gray-500 mt-1">
                Est. take-home: ~{stats.estimatedTakeHome} lbs
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Cuts Selected</span>
              <span className="font-medium">{stats.cutCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Organs</span>
              <span className="font-medium">{stats.organCount}</span>
            </div>
            {animalType === 'pork' && (
              <div className="flex justify-between text-sm">
                <span>Sausage Flavors</span>
                <span className="font-medium">{stats.sausageCount}</span>
              </div>
            )}
          </div>

          {/* Conflict Warning */}
          {hasConflicts && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              Please resolve conflicts before saving
            </div>
          )}

          {/* Template Actions */}
          {(availableTemplates.length > 0 || onShowSaveTemplate) && (
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
                        <DropdownMenuItem key={t.id} onClick={() => onLoadTemplate(t.id)}>
                          {t.template_name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {onShowSaveTemplate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onShowSaveTemplate}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save as Template
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="border-t pt-4 space-y-2">
            <Button
              className="w-full bg-green-700 hover:bg-green-800"
              onClick={onSave}
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
  )
}
