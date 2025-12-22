'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileText, Calendar, Truck, Package, CheckCircle } from 'lucide-react'
import type { AnimalType, OrderStatus, ProcessingStage } from '@/types/database'

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
  } | null
  processor: {
    id: string
    name: string
    city: string | null
    state: string | null
  }
  cut_sheet: {
    id: string
    status: string
  } | null
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

export default function OrderDetailPage({ params }: PageProps) {
  const orderId = params.id
  const [order, setOrder] = useState<OrderWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadOrder() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('auth_id', user.id)
        .single() as { data: { organization_id: string | null } | null }

      if (!profile?.organization_id) {
        router.push('/onboarding')
        return
      }

      // Fetch order with relations
      const { data: orderData, error: orderError } = await supabase
        .from('processing_orders')
        .select(`
          *,
          livestock:livestock_id (
            id,
            animal_type,
            tag_number,
            name,
            breed
          ),
          processor:processor_id (
            id,
            name,
            city,
            state
          )
        `)
        .eq('id', orderId)
        .eq('producer_id', profile.organization_id)
        .single() as { data: OrderWithRelations | null; error: Error | null }

      if (orderError || !orderData) {
        setError('Order not found')
        setLoading(false)
        return
      }

      // Check for cut sheet
      const { data: cutSheetData } = await supabase
        .from('cut_sheets')
        .select('id, status')
        .eq('processing_order_id', orderId)
        .single() as { data: { id: string; status: string } | null }

      setOrder({
        ...orderData,
        cut_sheet: cutSheetData,
      })
      setLoading(false)
    }

    loadOrder()
  }, [orderId, router, supabase])

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
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[order.status]}`}>
          {order.status.replace('_', ' ').charAt(0).toUpperCase() + order.status.replace('_', ' ').slice(1)}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Processor Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Processor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-medium text-lg">{order.processor.name}</div>
            {order.processor.city && order.processor.state && (
              <div className="text-gray-500">{order.processor.city}, {order.processor.state}</div>
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
                  <div className="text-gray-500">"{order.livestock.name}"</div>
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
          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            {Object.entries(STAGE_LABELS).map(([stage, label], index) => {
              const stageOrder = Object.keys(STAGE_LABELS)
              const currentIndex = stageOrder.indexOf(order.processing_stage)
              const thisIndex = stageOrder.indexOf(stage)
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

          {(order.live_weight || order.hanging_weight || order.final_weight) && (
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
          )}
        </CardContent>
      </Card>

      {/* Cut Sheet */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Cut Sheet
          </CardTitle>
          <CardDescription>
            Specify how you want your meat cut and packaged
          </CardDescription>
        </CardHeader>
        <CardContent>
          {order.cut_sheet ? (
            <div className="flex items-center justify-between">
              <div>
                <span className={`px-2 py-1 rounded text-sm ${
                  order.cut_sheet.status === 'submitted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {order.cut_sheet.status.charAt(0).toUpperCase() + order.cut_sheet.status.slice(1)}
                </span>
              </div>
              <Link href={`/dashboard/orders/${order.id}/cut-sheet`}>
                <Button variant="outline" size="sm">
                  View / Edit Cut Sheet
                </Button>
              </Link>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-4">No cut sheet created yet</p>
              <Link href={`/dashboard/orders/${order.id}/cut-sheet`}>
                <Button className="bg-green-700 hover:bg-green-800">
                  Create Cut Sheet
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {(order.producer_notes || order.processor_notes) && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.producer_notes && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Your Notes</div>
                <div className="bg-gray-50 p-3 rounded">{order.producer_notes}</div>
              </div>
            )}
            {order.processor_notes && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Processor Notes</div>
                <div className="bg-amber-50 p-3 rounded">{order.processor_notes}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
