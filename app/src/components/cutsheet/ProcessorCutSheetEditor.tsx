'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Beef,
  PiggyBank,
  Rabbit,
  ChevronDown,
  Edit2,
  Trash2,
  Plus,
  Package,
  Scale,
  Save,
  Undo,
  AlertCircle,
  Check,
} from 'lucide-react'
import { GoatIcon } from '@/components/icons/AnimalIcons'
import type { AnimalType } from '@/types/database'
import { CUT_SHEET_SCHEMA } from '@/lib/cut-sheet-schema'
import {
  updateCutParameters,
  removeCut,
  restoreCut,
  updateProcessorNotes,
  updateHangingWeight,
  createProducedPackage,
  updatePackageWeight,
  deletePackage,
} from '@/lib/actions/processor-cut-sheet'

// ============================================
// Local Type Definitions
// ============================================
// These match the data shape passed from the order page

interface CutSheetItem {
  id: string
  cut_id: string
  cut_name: string
  cut_category: string
  thickness: string | null
  weight_lbs: number | null
  pieces_per_package: number | null
  notes: string | null
}

interface ProducedPackage {
  id: string
  cut_id: string
  cut_name: string
  package_number: number
  actual_weight_lbs: number | null
}

interface ProcessorCutModification {
  thickness?: string
  pieces_per_package?: number
  notes?: string
}

interface RemovedCut {
  cut_id: string
  cut_name: string
  reason: string
  removed_at: string
}

interface AddedCut {
  cut_id: string
  cut_name: string
  params: {
    thickness?: string
    pieces_per_package?: number
    notes?: string
    [key: string]: string | number | undefined
  }
  added_at: string
}

// ============================================
// Component Types
// ============================================

interface CutSheetData {
  id: string
  status: string
  animal_type: AnimalType
  hanging_weight_lbs: number | null
  ground_type: string | null
  ground_package_weight_lbs: number | null
  patty_size: string | null
  keep_liver: boolean
  keep_heart: boolean
  keep_tongue: boolean
  keep_kidneys: boolean
  keep_oxtail: boolean
  keep_bones: boolean
  special_instructions: string | null
  processor_notes: string | null
  processor_modifications: Record<string, ProcessorCutModification>
  removed_cuts: RemovedCut[]
  added_cuts: AddedCut[]
  cut_sheet_items: CutSheetItem[]
  produced_packages?: ProducedPackage[]
}

interface OrderInfo {
  order_number: number
  producer_name: string
  livestock_tag?: string | null
  livestock_name?: string | null
  livestock_tracking_id?: string | null
}

interface ProcessorCutSheetEditorProps {
  cutSheet: CutSheetData
  orderInfo: OrderInfo
  onUpdate?: () => void
}

// ============================================
// Constants
// ============================================

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

// ============================================
// Helper Functions
// ============================================

function groupCutsByPrimal(items: CutSheetItem[], animalType: AnimalType) {
  const schema = CUT_SHEET_SCHEMA.animals[animalType]
  const grouped: Record<string, { primalName: string; primalId: string; cuts: CutSheetItem[] }> = {}
  const cutToPrimal: Record<string, string> = {}

  for (const [primalId, primal] of Object.entries(schema.primals)) {
    for (const cut of primal.choices) {
      cutToPrimal[cut.id] = primalId
    }
    if (primal.subSections) {
      for (const sub of Object.values(primal.subSections)) {
        for (const cut of sub.choices) {
          cutToPrimal[cut.id] = primalId
        }
      }
    }
  }

  for (const item of items) {
    const primalId = cutToPrimal[item.cut_id] || 'other'
    const primalName = schema.primals[primalId]?.displayName || 'Other Cuts'

    if (!grouped[primalId]) {
      grouped[primalId] = { primalName, primalId, cuts: [] }
    }
    grouped[primalId].cuts.push(item)
  }

  return grouped
}

function getCutDisplayName(cutId: string, animalType: AnimalType): string {
  const schema = CUT_SHEET_SCHEMA.animals[animalType]

  for (const primal of Object.values(schema.primals)) {
    for (const cut of primal.choices) {
      if (cut.id === cutId) return cut.name
    }
    if (primal.subSections) {
      for (const sub of Object.values(primal.subSections)) {
        for (const cut of sub.choices) {
          if (cut.id === cutId) return cut.name
        }
      }
    }
  }

  return cutId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// ============================================
// Sub-Components
// ============================================

interface EditCutDialogProps {
  cutId: string
  cutName: string
  currentThickness?: string | null
  currentPiecesPerPackage?: number | null
  currentNotes?: string | null
  onSave: (updates: ProcessorCutModification) => Promise<void>
}

function EditCutDialog({
  cutName,
  currentThickness,
  currentPiecesPerPackage,
  currentNotes,
  onSave,
}: EditCutDialogProps) {
  const [open, setOpen] = useState(false)
  const [thickness, setThickness] = useState(currentThickness || '')
  const [piecesPerPackage, setPiecesPerPackage] = useState(
    currentPiecesPerPackage?.toString() || ''
  )
  const [notes, setNotes] = useState(currentNotes || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave({
      thickness: thickness || undefined,
      pieces_per_package: piecesPerPackage ? parseInt(piecesPerPackage) : undefined,
      notes: notes || undefined,
    })
    setSaving(false)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {cutName}</DialogTitle>
          <DialogDescription>
            Modify the cut parameters. Changes will be tracked in history.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="thickness">Thickness</Label>
            <Input
              id="thickness"
              value={thickness}
              onChange={(e) => setThickness(e.target.value)}
              placeholder='e.g., 1", 1.5"'
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pieces">Pieces per Package</Label>
            <Input
              id="pieces"
              type="number"
              value={piecesPerPackage}
              onChange={(e) => setPiecesPerPackage(e.target.value)}
              placeholder="e.g., 2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Processor Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this cut..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface RemoveCutDialogProps {
  cutId: string
  cutName: string
  onRemove: (reason: string) => Promise<void>
}

function RemoveCutDialog({ cutName, onRemove }: RemoveCutDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [removing, setRemoving] = useState(false)

  const handleRemove = async () => {
    if (!reason.trim()) return
    setRemoving(true)
    await onRemove(reason)
    setRemoving(false)
    setOpen(false)
    setReason('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {cutName}?</DialogTitle>
          <DialogDescription>
            This will mark the cut as removed. You can restore it later if needed.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="reason">Reason for removal (required)</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Not enough meat for this cut, customer changed mind..."
            rows={3}
            className="mt-2"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRemove}
            disabled={removing || !reason.trim()}
          >
            {removing ? 'Removing...' : 'Remove Cut'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface AddPackageDialogProps {
  cutId: string
  cutName: string
  cutSheetId: string
  trackingId?: string | null
  existingCount: number
  onAdd: () => void
}

function AddPackageDialog({
  cutId,
  cutName,
  cutSheetId,
  trackingId,
  existingCount,
  onAdd,
}: AddPackageDialogProps) {
  const [open, setOpen] = useState(false)
  const [weight, setWeight] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async () => {
    setAdding(true)
    const result = await createProducedPackage(cutSheetId, {
      cut_id: cutId,
      cut_name: cutName,
      package_number: existingCount + 1,
      quantity_in_package: parseInt(quantity) || 1,
      actual_weight_lbs: weight ? parseFloat(weight) : undefined,
      processor_notes: notes || undefined,
      livestock_tracking_id: trackingId || undefined,
    })
    setAdding(false)
    if (result.success) {
      setOpen(false)
      setWeight('')
      setQuantity('1')
      setNotes('')
      onAdd()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Package className="h-4 w-4 mr-1" />
          Add Package
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Package: {cutName}</DialogTitle>
          <DialogDescription>
            Package #{existingCount + 1} for this cut
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pkg-weight">Weight (lbs)</Label>
            <Input
              id="pkg-weight"
              type="number"
              step="0.01"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g., 2.5"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pkg-qty">Pieces in Package</Label>
            <Input
              id="pkg-qty"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pkg-notes">Notes (optional)</Label>
            <Input
              id="pkg-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes..."
            />
          </div>
          {trackingId && (
            <div className="text-sm text-gray-500">
              Tracking ID: <span className="font-mono">{trackingId}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={adding}>
            {adding ? 'Adding...' : 'Add Package'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// Main Component
// ============================================

export function ProcessorCutSheetEditor({
  cutSheet,
  orderInfo,
  onUpdate,
}: ProcessorCutSheetEditorProps) {
  const [processorNotes, setProcessorNotes] = useState(cutSheet.processor_notes || '')
  const [hangingWeight, setHangingWeight] = useState(
    cutSheet.hanging_weight_lbs?.toString() || ''
  )
  const [savingNotes, setSavingNotes] = useState(false)
  const [savingWeight, setSavingWeight] = useState(false)

  const groupedCuts = useMemo(
    () => groupCutsByPrimal(cutSheet.cut_sheet_items, cutSheet.animal_type),
    [cutSheet.cut_sheet_items, cutSheet.animal_type]
  )

  const removedCutIds = useMemo(
    () => new Set(cutSheet.removed_cuts?.map(r => r.cut_id) || []),
    [cutSheet.removed_cuts]
  )

  const packagesByCut = useMemo(() => {
    const map: Record<string, ProducedPackage[]> = {}
    for (const pkg of cutSheet.produced_packages || []) {
      if (!map[pkg.cut_id]) map[pkg.cut_id] = []
      map[pkg.cut_id].push(pkg)
    }
    return map
  }, [cutSheet.produced_packages])

  const handleSaveNotes = useCallback(async () => {
    setSavingNotes(true)
    await updateProcessorNotes(cutSheet.id, processorNotes)
    setSavingNotes(false)
    onUpdate?.()
  }, [cutSheet.id, processorNotes, onUpdate])

  const handleSaveWeight = useCallback(async () => {
    if (!hangingWeight) return
    setSavingWeight(true)
    await updateHangingWeight(cutSheet.id, parseFloat(hangingWeight))
    setSavingWeight(false)
    onUpdate?.()
  }, [cutSheet.id, hangingWeight, onUpdate])

  const handleUpdateCut = useCallback(
    async (cutId: string, updates: ProcessorCutModification) => {
      await updateCutParameters(cutSheet.id, cutId, updates)
      onUpdate?.()
    },
    [cutSheet.id, onUpdate]
  )

  const handleRemoveCut = useCallback(
    async (cutId: string, cutName: string, reason: string) => {
      await removeCut(cutSheet.id, cutId, cutName, reason)
      onUpdate?.()
    },
    [cutSheet.id, onUpdate]
  )

  const handleRestoreCut = useCallback(
    async (cutId: string) => {
      await restoreCut(cutSheet.id, cutId)
      onUpdate?.()
    },
    [cutSheet.id, onUpdate]
  )

  const handleUpdatePackageWeight = useCallback(
    async (packageId: string, weight: number) => {
      await updatePackageWeight(packageId, weight)
      onUpdate?.()
    },
    [onUpdate]
  )

  const handleDeletePackage = useCallback(
    async (packageId: string) => {
      await deletePackage(packageId)
      onUpdate?.()
    },
    [onUpdate]
  )

  const organs = useMemo(() => {
    const kept: string[] = []
    if (cutSheet.keep_liver) kept.push('Liver')
    if (cutSheet.keep_heart) kept.push('Heart')
    if (cutSheet.keep_tongue) kept.push('Tongue')
    if (cutSheet.keep_kidneys) kept.push('Kidneys')
    if (cutSheet.keep_oxtail) kept.push('Oxtail')
    if (cutSheet.keep_bones) kept.push('Bones')
    return kept
  }, [cutSheet])

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {ANIMAL_ICONS[cutSheet.animal_type]}
              <div>
                <CardTitle className="text-lg">
                  Order #{orderInfo.order_number} - Cut Sheet Editor
                </CardTitle>
                <p className="text-sm text-gray-500">
                  {orderInfo.producer_name}
                  {orderInfo.livestock_tag && ` • Tag #${orderInfo.livestock_tag}`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold capitalize">
                {ANIMAL_LABELS[cutSheet.animal_type]}
              </div>
              {orderInfo.livestock_tracking_id && (
                <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                  {orderInfo.livestock_tracking_id}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Hanging Weight */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Hanging Weight
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-3">
            <Input
              type="number"
              step="0.1"
              value={hangingWeight}
              onChange={(e) => setHangingWeight(e.target.value)}
              placeholder="Enter weight"
              className="w-32"
            />
            <span className="text-gray-500">lbs</span>
            <Button
              size="sm"
              onClick={handleSaveWeight}
              disabled={savingWeight || !hangingWeight}
            >
              {savingWeight ? 'Saving...' : <><Save className="h-4 w-4 mr-1" /> Save</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cuts by Primal */}
      <div className="space-y-3">
        {Object.entries(groupedCuts).map(([primalId, group]) => (
          <Collapsible key={primalId} defaultOpen>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ChevronDown className="h-4 w-4" />
                      {group.primalName}
                    </CardTitle>
                    <span className="text-sm text-gray-500">
                      {group.cuts.length} cut{group.cuts.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  {group.cuts.map((item) => {
                    const isRemoved = removedCutIds.has(item.cut_id)
                    const modification = cutSheet.processor_modifications?.[item.cut_id]
                    const packages = packagesByCut[item.cut_id] || []
                    const cutName = getCutDisplayName(item.cut_id, cutSheet.animal_type)

                    return (
                      <div
                        key={item.id}
                        className={`border rounded-lg p-3 ${
                          isRemoved ? 'bg-red-50 border-red-200' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {isRemoved ? (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                            <span className={`font-medium ${isRemoved ? 'line-through text-gray-400' : ''}`}>
                              {cutName}
                            </span>
                            {modification && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                Modified
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {isRemoved ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestoreCut(item.cut_id)}
                              >
                                <Undo className="h-4 w-4 mr-1" /> Restore
                              </Button>
                            ) : (
                              <>
                                <EditCutDialog
                                  cutId={item.cut_id}
                                  cutName={cutName}
                                  currentThickness={modification?.thickness || item.thickness}
                                  currentPiecesPerPackage={
                                    modification?.pieces_per_package || item.pieces_per_package
                                  }
                                  currentNotes={modification?.notes || item.notes}
                                  onSave={(updates) => handleUpdateCut(item.cut_id, updates)}
                                />
                                <RemoveCutDialog
                                  cutId={item.cut_id}
                                  cutName={cutName}
                                  onRemove={(reason) =>
                                    handleRemoveCut(item.cut_id, cutName, reason)
                                  }
                                />
                              </>
                            )}
                          </div>
                        </div>

                        {/* Cut Details */}
                        {!isRemoved && (
                          <div className="mt-2 text-sm text-gray-600 space-y-1">
                            <div className="flex gap-4">
                              <span>
                                Thickness:{' '}
                                <strong>{modification?.thickness || item.thickness || '-'}</strong>
                              </span>
                              <span>
                                Per Pkg:{' '}
                                <strong>
                                  {modification?.pieces_per_package || item.pieces_per_package || '-'}
                                </strong>
                              </span>
                            </div>
                            {(modification?.notes || item.notes) && (
                              <div className="text-gray-500">
                                Notes: {modification?.notes || item.notes}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Produced Packages */}
                        {!isRemoved && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">
                                Produced Packages ({packages.length})
                              </span>
                              <AddPackageDialog
                                cutId={item.cut_id}
                                cutName={cutName}
                                cutSheetId={cutSheet.id}
                                trackingId={orderInfo.livestock_tracking_id}
                                existingCount={packages.length}
                                onAdd={() => onUpdate?.()}
                              />
                            </div>
                            {packages.length > 0 && (
                              <div className="space-y-2">
                                {packages.map((pkg) => (
                                  <div
                                    key={pkg.id}
                                    className="flex items-center gap-2 bg-gray-50 rounded p-2 text-sm"
                                  >
                                    <Package className="h-4 w-4 text-gray-400" />
                                    <span className="font-medium">#{pkg.package_number}</span>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={pkg.actual_weight_lbs || ''}
                                      onChange={(e) => {
                                        const val = e.target.value
                                        if (val) handleUpdatePackageWeight(pkg.id, parseFloat(val))
                                      }}
                                      placeholder="Weight"
                                      className="w-20 h-7 text-sm"
                                    />
                                    <span className="text-gray-500">lbs</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-red-500"
                                      onClick={() => handleDeletePackage(pkg.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>

      {/* Added Cuts (by processor) */}
      {cutSheet.added_cuts && cutSheet.added_cuts.length > 0 && (
        <Card className="border-green-200">
          <CardHeader className="py-3">
            <CardTitle className="text-base text-green-700 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Cuts Added by Processor
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {cutSheet.added_cuts.map((added) => (
                <div key={added.cut_id} className="bg-green-50 rounded-lg p-3">
                  <div className="font-medium">{added.cut_name}</div>
                  <div className="text-sm text-gray-600">
                    {added.params.thickness && `Thickness: ${added.params.thickness}`}
                    {added.params.notes && ` • ${added.params.notes}`}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Removed Cuts */}
      {cutSheet.removed_cuts && cutSheet.removed_cuts.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="py-3">
            <CardTitle className="text-base text-red-700 flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Removed Cuts
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {cutSheet.removed_cuts.map((removed) => (
                <div key={removed.cut_id} className="bg-red-50 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium line-through text-gray-500">{removed.cut_name}</div>
                    <div className="text-sm text-red-600">Reason: {removed.reason}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestoreCut(removed.cut_id)}
                  >
                    <Undo className="h-4 w-4 mr-1" /> Restore
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organs/Keep */}
      {organs.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Keep</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {organs.map((organ) => (
                <span
                  key={organ}
                  className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded text-sm"
                >
                  {organ}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Special Instructions */}
      {cutSheet.special_instructions && (
        <Card className="border-blue-200">
          <CardHeader className="py-3">
            <CardTitle className="text-base text-blue-800">Producer&apos;s Special Instructions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-blue-900 whitespace-pre-wrap">
              {cutSheet.special_instructions}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Processor Notes */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Processor Notes</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Textarea
            value={processorNotes}
            onChange={(e) => setProcessorNotes(e.target.value)}
            placeholder="Add notes about this cut sheet..."
            rows={4}
            className="mb-3"
          />
          <Button
            onClick={handleSaveNotes}
            disabled={savingNotes}
          >
            {savingNotes ? 'Saving...' : <><Save className="h-4 w-4 mr-1" /> Save Notes</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
