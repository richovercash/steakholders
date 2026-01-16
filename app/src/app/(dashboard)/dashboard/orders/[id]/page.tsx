'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, FileText, Calendar, Truck, Package, CheckCircle, Edit2, Save, X, History, ClipboardList } from 'lucide-react'
import { CutSheetViewer } from '@/components/cutsheet/CutSheetViewer'
import { ProcessorCutSheetEditor } from '@/components/cutsheet/ProcessorCutSheetEditor'
import { CutSheetHistoryTab } from '@/components/cutsheet/CutSheetHistoryTab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { notifyOrderStatusChange, notifyProcessingStageChange } from '@/lib/notifications/actions'
import { notifyNextInWaitlist } from '@/lib/actions/waitlist'
import type { AnimalType, OrderStatus, ProcessingStage, OrganizationType } from '@/types/database'

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

interface CutSheetSausage {
  id: string
  flavor: string
  pounds: number
}

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
  processor_modifications: Record<string, { thickness?: string; pieces_per_package?: number; notes?: string }>
  removed_cuts: { cut_id: string; cut_name: string; reason: string; removed_at: string }[]
  added_cuts: { cut_id: string; cut_name: string; params: Record<string, unknown>; added_at: string }[]
  cut_sheet_items: CutSheetItem[]
  cut_sheet_sausages: CutSheetSausage[]
  produced_packages?: { id: string; cut_id: string; cut_name: string; package_number: number; actual_weight_lbs: number | null }[]
}

interface OrderWithRelations {
  id: string
  order_number: number
  status: OrderStatus
  processing_stage: ProcessingStage
  scheduled_drop_off: string | null
  actual_drop_off: string | null
  estimated_ready_date: string | null
  actual_ready_date: string | null
  pickup_date: string | null
  live_weight: number | null
  hanging_weight: number | null
  final_weight: number | null
  producer_notes: string | null
  processor_notes: string | null
  created_at: string
  livestock: {
    id: string
    animal_type: AnimalType
    tag_number: string | null
    name: string | null
    breed: string | null
    tracking_id: string | null
  } | null
  processor: {
    id: string
    name: string
    city: string | null
    state: string | null
  }
  producer: {
    id: string
    name: string
    city: string | null
    state: string | null
  }
  cut_sheet: CutSheetData | null
}

interface PageProps {
  params: { id: string }
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  in_progress: 'bg-amber-100 text-amber-700',
  ready: 'bg-purple-100 text-purple-700',
  complete: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const STAGE_LABELS: Record<ProcessingStage, string> = {
  pending: 'Pending',
  received: 'Received',
  hanging: 'Hanging',
  cutting: 'Cutting',
  wrapping: 'Wrapping',
  freezing: 'Freezing',
  ready: 'Ready for Pickup',
  picked_up: 'Picked Up',
}

const STAGES_ORDER: ProcessingStage[] = ['pending', 'received', 'hanging', 'cutting', 'wrapping', 'freezing', 'ready', 'picked_up']

export default function OrderDetailPage({ params }: PageProps) {
  const orderId = params.id
  const [order, setOrder] = useState<OrderWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<OrganizationType | null>(null)
  const [, setOrganizationId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Editable form state for processor
  const [editForm, setEditForm] = useState({
    processing_stage: '' as ProcessingStage,
    status: '' as OrderStatus,
    live_weight: '',
    hanging_weight: '',
    final_weight: '',
    actual_drop_off: '',
    estimated_ready_date: '',
    actual_ready_date: '',
    pickup_date: '',
    processor_notes: '',
  })

  const loadOrder = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('users')
      .select('organization_id, organization:organizations(type)')
      .eq('auth_id', user.id)
      .single() as { data: { organization_id: string | null; organization: { type: OrganizationType } | null } | null }

    if (!profile?.organization_id) {
      router.push('/onboarding')
      return
    }

    setOrganizationId(profile.organization_id)
    setUserRole(profile.organization?.type || null)

    // Fetch order with relations - check both producer_id and processor_id
    const { data: orderData, error: orderError } = await supabase
      .from('processing_orders')
      .select(`
        *,
        livestock:livestock_id (
          id,
          animal_type,
          tag_number,
          name,
          breed,
          tracking_id
        ),
        processor:processor_id (
          id,
          name,
          city,
          state
        ),
        producer:producer_id (
          id,
          name,
          city,
          state
        )
      `)
      .eq('id', orderId)
      .single() as { data: OrderWithRelations | null; error: Error | null }

    if (orderError || !orderData) {
      setError('Order not found')
      setLoading(false)
      return
    }

    // Verify user has access to this order
    const isProducer = orderData.producer?.id === profile.organization_id
    const isProcessor = orderData.processor?.id === profile.organization_id

    if (!isProducer && !isProcessor) {
      setError('You do not have access to this order')
      setLoading(false)
      return
    }

    // Check for cut sheet with full data including items, sausages, and processor fields
    const { data: cutSheetData } = await supabase
      .from('cut_sheets')
      .select(`
        id,
        status,
        animal_type,
        hanging_weight_lbs,
        ground_type,
        ground_package_weight_lbs,
        patty_size,
        keep_liver,
        keep_heart,
        keep_tongue,
        keep_kidneys,
        keep_oxtail,
        keep_bones,
        special_instructions,
        processor_notes,
        processor_modifications,
        removed_cuts,
        added_cuts,
        cut_sheet_items (
          id,
          cut_id,
          cut_name,
          cut_category,
          thickness,
          weight_lbs,
          pieces_per_package,
          notes
        ),
        cut_sheet_sausages (
          id,
          flavor,
          pounds
        )
      `)
      .eq('processing_order_id', orderId)
      .single() as { data: CutSheetData | null }

    // Fetch produced packages if cut sheet exists
    let producedPackages: CutSheetData['produced_packages'] = []
    if (cutSheetData?.id) {
      const { data: pkgData } = await supabase
        .from('produced_packages')
        .select('id, cut_id, cut_name, package_number, actual_weight_lbs')
        .eq('cut_sheet_id', cutSheetData.id)
        .order('cut_id')
        .order('package_number') as { data: typeof producedPackages }
      producedPackages = pkgData || []
    }

    const fullOrder = {
      ...orderData,
      cut_sheet: cutSheetData ? {
        ...cutSheetData,
        produced_packages: producedPackages,
        // Ensure these have defaults if null
        processor_modifications: cutSheetData.processor_modifications || {},
        removed_cuts: cutSheetData.removed_cuts || [],
        added_cuts: cutSheetData.added_cuts || [],
      } : null,
    }

    setOrder(fullOrder)

    // Initialize edit form with current values
    setEditForm({
      processing_stage: fullOrder.processing_stage,
      status: fullOrder.status,
      live_weight: fullOrder.live_weight?.toString() || '',
      hanging_weight: fullOrder.hanging_weight?.toString() || '',
      final_weight: fullOrder.final_weight?.toString() || '',
      actual_drop_off: fullOrder.actual_drop_off?.split('T')[0] || '',
      estimated_ready_date: fullOrder.estimated_ready_date?.split('T')[0] || '',
      actual_ready_date: fullOrder.actual_ready_date?.split('T')[0] || '',
      pickup_date: fullOrder.pickup_date?.split('T')[0] || '',
      processor_notes: fullOrder.processor_notes || '',
    })

    setLoading(false)
  }, [orderId, router, supabase])

  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  const isProcessor = userRole === 'processor'

  const handleSave = async () => {
    if (!order) return

    setSaving(true)

    const updateData = {
      processing_stage: editForm.processing_stage,
      status: editForm.status,
      live_weight: editForm.live_weight ? parseFloat(editForm.live_weight) : null,
      hanging_weight: editForm.hanging_weight ? parseFloat(editForm.hanging_weight) : null,
      final_weight: editForm.final_weight ? parseFloat(editForm.final_weight) : null,
      actual_drop_off: editForm.actual_drop_off ? new Date(editForm.actual_drop_off).toISOString() : null,
      estimated_ready_date: editForm.estimated_ready_date ? new Date(editForm.estimated_ready_date).toISOString() : null,
      actual_ready_date: editForm.actual_ready_date ? new Date(editForm.actual_ready_date).toISOString() : null,
      pickup_date: editForm.pickup_date ? new Date(editForm.pickup_date).toISOString() : null,
      processor_notes: editForm.processor_notes || null,
    }

    const { error: updateError } = await supabase
      .from('processing_orders')
      .update(updateData as never)
      .eq('id', order.id)

    if (updateError) {
      alert('Error saving: ' + updateError.message)
    } else {
      await loadOrder()
      setIsEditing(false)
    }

    setSaving(false)
  }

  const handleQuickStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return

    setSaving(true)

    // Auto-update processing stage based on status
    let newStage = order.processing_stage
    if (newStatus === 'confirmed' && order.processing_stage === 'pending') {
      newStage = 'pending' // Keep pending until received
    } else if (newStatus === 'in_progress' && order.processing_stage === 'pending') {
      newStage = 'received'
    } else if (newStatus === 'complete') {
      newStage = 'picked_up'
    }

    const { error: updateError } = await supabase
      .from('processing_orders')
      .update({ status: newStatus, processing_stage: newStage } as never)
      .eq('id', order.id)

    if (updateError) {
      alert('Error updating status: ' + updateError.message)
    } else {
      // Send notification
      await notifyOrderStatusChange({
        orderId: order.id,
        orderNumber: order.order_number,
        newStatus,
        producerOrgId: order.producer.id,
        processorOrgId: order.processor.id,
        animalType: order.livestock?.animal_type,
      })

      // If order was cancelled, notify next person in waitlist
      if (newStatus === 'cancelled' && order.scheduled_drop_off && order.livestock?.animal_type) {
        const scheduledDate = order.scheduled_drop_off.split('T')[0]
        await notifyNextInWaitlist(
          order.processor.id,
          scheduledDate,
          order.livestock.animal_type
        )
      }

      await loadOrder()
    }

    setSaving(false)
  }

  const handleAdvanceStage = async () => {
    if (!order) return

    const currentIndex = STAGES_ORDER.indexOf(order.processing_stage)
    if (currentIndex >= STAGES_ORDER.length - 1) return

    const nextStage = STAGES_ORDER[currentIndex + 1]

    // Auto-update status based on stage
    let newStatus = order.status
    const statusChanged = nextStage === 'received' && order.status === 'confirmed' ||
                          nextStage === 'ready' ||
                          nextStage === 'picked_up'

    if (nextStage === 'received' && order.status === 'confirmed') {
      newStatus = 'in_progress'
    } else if (nextStage === 'ready') {
      newStatus = 'ready'
    } else if (nextStage === 'picked_up') {
      newStatus = 'complete'
    }

    setSaving(true)

    const { error: updateError } = await supabase
      .from('processing_orders')
      .update({ processing_stage: nextStage, status: newStatus } as never)
      .eq('id', order.id)

    if (updateError) {
      alert('Error advancing stage: ' + updateError.message)
    } else {
      // Send notification for stage change
      if (statusChanged) {
        await notifyOrderStatusChange({
          orderId: order.id,
          orderNumber: order.order_number,
          newStatus,
          producerOrgId: order.producer.id,
          processorOrgId: order.processor.id,
          animalType: order.livestock?.animal_type,
        })
      } else {
        await notifyProcessingStageChange(
          order.id,
          order.order_number,
          order.producer.id,
          nextStage,
          order.livestock?.animal_type
        )
      }
      await loadOrder()
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading order...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
          {error || 'Order not found'}
        </div>
        <Link href="/dashboard/orders" className="text-green-700 hover:underline">
          Back to Orders
        </Link>
      </div>
    )
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not set'
    return new Date(dateStr).toLocaleDateString()
  }

  const canAdvanceStage = isProcessor && STAGES_ORDER.indexOf(order.processing_stage) < STAGES_ORDER.length - 1

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Orders
        </Link>
      </div>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order #{order.order_number}</h1>
          <p className="text-gray-500">Created {formatDate(order.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[order.status]}`}>
            {order.status.replace('_', ' ').charAt(0).toUpperCase() + order.status.replace('_', ' ').slice(1)}
          </span>
          {isProcessor && !isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Processor Quick Actions */}
      {isProcessor && !isEditing && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-amber-800">Quick Actions:</span>
              {order.status === 'submitted' && (
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleQuickStatusChange('confirmed')}
                  disabled={saving}
                >
                  Confirm Order
                </Button>
              )}
              {order.status === 'confirmed' && (
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={() => handleQuickStatusChange('in_progress')}
                  disabled={saving}
                >
                  Start Processing
                </Button>
              )}
              {canAdvanceStage && order.status !== 'submitted' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAdvanceStage}
                  disabled={saving}
                >
                  Advance to: {STAGE_LABELS[STAGES_ORDER[STAGES_ORDER.indexOf(order.processing_stage) + 1]]}
                </Button>
              )}
              {order.status === 'ready' && (
                <Button
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => handleQuickStatusChange('complete')}
                  disabled={saving}
                >
                  Mark Complete (Picked Up)
                </Button>
              )}
              {order.status !== 'complete' && order.status !== 'cancelled' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => {
                    if (confirm('Are you sure you want to cancel this order? This will notify anyone on the waitlist.')) {
                      handleQuickStatusChange('cancelled')
                    }
                  }}
                  disabled={saving}
                >
                  Cancel Order
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Mode Controls */}
      {isProcessor && isEditing && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">Editing Order</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Producer/Processor Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              {isProcessor ? 'Producer' : 'Processor'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-medium text-lg">
              {isProcessor ? order.producer.name : order.processor.name}
            </div>
            {isProcessor ? (
              order.producer.city && order.producer.state && (
                <div className="text-gray-500">{order.producer.city}, {order.producer.state}</div>
              )
            ) : (
              order.processor.city && order.processor.state && (
                <div className="text-gray-500">{order.processor.city}, {order.processor.state}</div>
              )
            )}
          </CardContent>
        </Card>

        {/* Animal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Animal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {order.livestock ? (
              <>
                <div className="font-medium text-lg capitalize">
                  {order.livestock.animal_type}
                  {order.livestock.tag_number && ` #${order.livestock.tag_number}`}
                </div>
                {order.livestock.name && (
                  <div className="text-gray-500">&ldquo;{order.livestock.name}&rdquo;</div>
                )}
                {order.livestock.breed && (
                  <div className="text-sm text-gray-400">{order.livestock.breed}</div>
                )}
              </>
            ) : (
              <div className="text-gray-500">No animal assigned</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Processing Stage */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Processing Stage</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-3">
              <Label>Current Stage</Label>
              <div className="grid grid-cols-4 gap-2">
                {STAGES_ORDER.map(stage => (
                  <button
                    key={stage}
                    onClick={() => setEditForm({ ...editForm, processing_stage: stage })}
                    className={`p-2 rounded border-2 text-sm ${
                      editForm.processing_stage === stage
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {STAGE_LABELS[stage]}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 overflow-x-auto pb-2">
              {Object.entries(STAGE_LABELS).map(([stage, label], index) => {
                const currentIndex = STAGES_ORDER.indexOf(order.processing_stage)
                const thisIndex = STAGES_ORDER.indexOf(stage as ProcessingStage)
                const isComplete = thisIndex < currentIndex
                const isCurrent = stage === order.processing_stage

                return (
                  <div key={stage} className="flex items-center">
                    <div className="flex flex-col items-center min-w-[80px]">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isComplete
                            ? 'bg-green-600 text-white'
                            : isCurrent
                            ? 'bg-amber-500 text-white'
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        {isComplete ? <CheckCircle className="h-5 w-5" /> : index + 1}
                      </div>
                      <div className={`text-xs mt-1 text-center ${isCurrent ? 'font-semibold' : 'text-gray-500'}`}>
                        {label}
                      </div>
                    </div>
                    {index < Object.keys(STAGE_LABELS).length - 1 && (
                      <div
                        className={`h-1 w-8 ${
                          isComplete ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dates & Weights */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule & Weights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="actual_drop_off">Actual Drop-off</Label>
                  <Input
                    id="actual_drop_off"
                    type="date"
                    value={editForm.actual_drop_off}
                    onChange={e => setEditForm({ ...editForm, actual_drop_off: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="estimated_ready_date">Estimated Ready</Label>
                  <Input
                    id="estimated_ready_date"
                    type="date"
                    value={editForm.estimated_ready_date}
                    onChange={e => setEditForm({ ...editForm, estimated_ready_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="actual_ready_date">Actual Ready</Label>
                  <Input
                    id="actual_ready_date"
                    type="date"
                    value={editForm.actual_ready_date}
                    onChange={e => setEditForm({ ...editForm, actual_ready_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="pickup_date">Pickup Date</Label>
                  <Input
                    id="pickup_date"
                    type="date"
                    value={editForm.pickup_date}
                    onChange={e => setEditForm({ ...editForm, pickup_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="live_weight">Live Weight (lbs)</Label>
                    <Input
                      id="live_weight"
                      type="number"
                      step="0.1"
                      value={editForm.live_weight}
                      onChange={e => setEditForm({ ...editForm, live_weight: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hanging_weight">Hanging Weight (lbs)</Label>
                    <Input
                      id="hanging_weight"
                      type="number"
                      step="0.1"
                      value={editForm.hanging_weight}
                      onChange={e => setEditForm({ ...editForm, hanging_weight: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="final_weight">Final Weight (lbs)</Label>
                    <Input
                      id="final_weight"
                      type="number"
                      step="0.1"
                      value={editForm.final_weight}
                      onChange={e => setEditForm({ ...editForm, final_weight: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Scheduled Drop-off</div>
                  <div className="font-medium">{formatDate(order.scheduled_drop_off)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Actual Drop-off</div>
                  <div className="font-medium">{formatDate(order.actual_drop_off)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Estimated Ready</div>
                  <div className="font-medium">{formatDate(order.estimated_ready_date)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Pickup Date</div>
                  <div className="font-medium">{formatDate(order.pickup_date)}</div>
                </div>
              </div>

              <div className="border-t mt-4 pt-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-sm text-gray-500">Live Weight</div>
                    <div className="font-medium text-lg">
                      {order.live_weight ? `${order.live_weight} lbs` : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Hanging Weight</div>
                    <div className="font-medium text-lg">
                      {order.hanging_weight ? `${order.hanging_weight} lbs` : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Final Weight</div>
                    <div className="font-medium text-lg">
                      {order.final_weight ? `${order.final_weight} lbs` : '-'}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Cut Sheet with Tabs */}
      <Card className="mb-6" id="cut-sheet-print-area">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Cut Sheet
              </CardTitle>
              <CardDescription>
                {isProcessor ? 'View and edit cutting instructions' : 'Specify how you want your meat cut and packaged'}
              </CardDescription>
            </div>
            {order.cut_sheet && !isProcessor && (
              <Link href={`/dashboard/orders/${order.id}/cut-sheet`}>
                <Button variant="outline" size="sm">
                  Edit Cut Sheet
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {order.cut_sheet ? (
            <Tabs defaultValue={isProcessor ? 'editor' : 'view'} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value={isProcessor ? 'editor' : 'view'} className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  {isProcessor ? 'Editor' : 'Cut Sheet'}
                </TabsTrigger>
                <TabsTrigger value="view" className={isProcessor ? '' : 'hidden'}>
                  <FileText className="h-4 w-4 mr-1" />
                  Read-Only View
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  History
                </TabsTrigger>
              </TabsList>

              {/* Editor Tab (Processor Only) */}
              {isProcessor && (
                <TabsContent value="editor">
                  <ProcessorCutSheetEditor
                    cutSheet={order.cut_sheet}
                    orderInfo={{
                      order_number: order.order_number,
                      producer_name: order.producer.name,
                      livestock_tag: order.livestock?.tag_number,
                      livestock_name: order.livestock?.name,
                      livestock_tracking_id: order.livestock?.tracking_id,
                    }}
                    onUpdate={loadOrder}
                  />
                </TabsContent>
              )}

              {/* Read-Only View Tab */}
              <TabsContent value="view">
                <CutSheetViewer
                  cutSheet={order.cut_sheet}
                  orderInfo={{
                    order_number: order.order_number,
                    producer_name: order.producer.name,
                    livestock_tag: order.livestock?.tag_number,
                    livestock_name: order.livestock?.name,
                  }}
                />
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history">
                <CutSheetHistoryTab cutSheetId={order.cut_sheet.id} />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-4">No cut sheet created yet</p>
              {!isProcessor && (
                <Link href={`/dashboard/orders/${order.id}/cut-sheet`}>
                  <Button className="bg-green-700 hover:bg-green-800">
                    Create Cut Sheet
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.producer_notes && (
            <div>
              <div className="text-sm text-gray-500 mb-1">Producer Notes</div>
              <div className="bg-green-50 p-3 rounded">{order.producer_notes}</div>
            </div>
          )}

          {isEditing ? (
            <div>
              <Label htmlFor="processor_notes">Processor Notes</Label>
              <Textarea
                id="processor_notes"
                value={editForm.processor_notes}
                onChange={e => setEditForm({ ...editForm, processor_notes: e.target.value })}
                placeholder="Add notes about this order..."
                rows={3}
              />
            </div>
          ) : (
            order.processor_notes && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Processor Notes</div>
                <div className="bg-amber-50 p-3 rounded">{order.processor_notes}</div>
              </div>
            )
          )}

          {!isEditing && !order.producer_notes && !order.processor_notes && (
            <p className="text-gray-500 text-sm">No notes on this order.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
