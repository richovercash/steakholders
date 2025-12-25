import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ClipboardList, Calendar, Truck, MessageSquare, AlertCircle, ArrowRight, Plus, Search, FileText } from 'lucide-react'
import type { OrganizationType } from '@/types/database'

interface ProfileWithOrg {
  full_name: string | null
  organization_id: string | null
  organization: {
    id: string
    name: string
    type: OrganizationType
    capacity_per_week: number | null
  } | null
}

interface OrderWithRelations {
  id: string
  order_number: number
  status: string
  processing_stage: string
  created_at: string
  scheduled_drop_off: string | null
  producer: { name: string } | null
  processor: { name: string } | null
  livestock: { tag_number: string | null; animal_type: string } | null
  cut_sheets: { id: string; status: string }[] | null
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Get user profile with organization
  const { data: profile } = await supabase
    .from('users')
    .select(`
      *,
      organization:organizations(*)
    `)
    .eq('auth_id', user!.id)
    .single() as { data: ProfileWithOrg | null }

  const organization = profile?.organization
  const isProducer = organization?.type === 'producer'

  // Get recent orders
  const { data: orders } = await supabase
    .from('processing_orders')
    .select(`
      *,
      producer:organizations!producer_id(name),
      processor:organizations!processor_id(name),
      livestock(tag_number, animal_type),
      cut_sheets(id, status)
    `)
    .or(
      isProducer
        ? `producer_id.eq.${organization?.id}`
        : `processor_id.eq.${organization?.id}`
    )
    .order('created_at', { ascending: false })
    .limit(5) as { data: OrderWithRelations[] | null }

  // Get pending orders for processors (orders awaiting confirmation)
  let pendingOrders: OrderWithRelations[] = []
  if (!isProducer && organization?.id) {
    const { data: pending } = await supabase
      .from('processing_orders')
      .select(`
        *,
        producer:organizations!producer_id(name),
        processor:organizations!processor_id(name),
        livestock(tag_number, animal_type),
        cut_sheets(id, status)
      `)
      .eq('processor_id', organization.id)
      .eq('status', 'submitted')
      .order('created_at', { ascending: true }) as { data: OrderWithRelations[] | null }

    pendingOrders = pending || []
  }

  // Get order stats
  const { count: activeOrders } = await supabase
    .from('processing_orders')
    .select('*', { count: 'exact', head: true })
    .or(
      isProducer
        ? `producer_id.eq.${organization?.id}`
        : `processor_id.eq.${organization?.id}`
    )
    .in('status', ['submitted', 'confirmed', 'in_progress'])

  // Get livestock count for producers
  let livestockCount = 0
  if (isProducer) {
    const { count } = await supabase
      .from('livestock')
      .select('*', { count: 'exact', head: true })
      .eq('producer_id', organization?.id)
      .eq('status', 'on_farm')

    livestockCount = count || 0
  }

  // Get unread messages
  const { count: unreadMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_org_id', organization?.id || '')
    .is('read_at', null)

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    submitted: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-purple-100 text-purple-800',
    in_progress: 'bg-amber-100 text-amber-800',
    ready: 'bg-green-100 text-green-800',
    complete: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  const stageLabels: Record<string, string> = {
    pending: 'Pending Drop-off',
    received: 'Received',
    hanging: 'Hanging',
    cutting: 'Cutting',
    wrapping: 'Wrapping',
    freezing: 'Freezing',
    ready: 'Ready for Pickup',
    picked_up: 'Picked Up',
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}!
        </h1>
        <p className="text-gray-600">
          Here&apos;s what&apos;s happening with your {isProducer ? 'orders' : 'facility'} today.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        {isProducer ? (
          <>
            <Link href="/dashboard/orders/new">
              <Button className="bg-green-700 hover:bg-green-800">
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Button>
            </Link>
            <Link href="/dashboard/discover">
              <Button variant="outline">
                <Search className="h-4 w-4 mr-2" />
                Find Processors
              </Button>
            </Link>
          </>
        ) : (
          <Link href="/dashboard/calendar">
            <Button className="bg-green-700 hover:bg-green-800">
              <Calendar className="h-4 w-4 mr-2" />
              View Calendar
            </Button>
          </Link>
        )}
        <Link href="/dashboard/messages">
          <Button variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            Messages
            {(unreadMessages || 0) > 0 && (
              <Badge className="ml-2 bg-green-700">{unreadMessages}</Badge>
            )}
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/orders" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Active Orders
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeOrders || 0}</div>
              <p className="text-xs text-gray-500">
                Currently in progress
              </p>
            </CardContent>
          </Card>
        </Link>

        {isProducer ? (
          <Link href="/dashboard/livestock" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Livestock
                </CardTitle>
                <Truck className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{livestockCount}</div>
                <p className="text-xs text-gray-500">
                  Animals on farm
                </p>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Link href="/dashboard/calendar" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  This Week
                </CardTitle>
                <Calendar className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {organization?.capacity_per_week || 0}
                </div>
                <p className="text-xs text-gray-500">
                  Capacity per week
                </p>
              </CardContent>
            </Card>
          </Link>
        )}

        <Link href="/dashboard/messages" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Unread Messages
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unreadMessages || 0}</div>
              <p className="text-xs text-gray-500">
                Awaiting response
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/orders" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Ready for Pickup
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders?.filter(o => o.status === 'ready').length || 0}
              </div>
              <p className="text-xs text-gray-500">
                Orders complete
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Pending Orders for Processors */}
      {!isProducer && pendingOrders.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-amber-800">Pending Orders</CardTitle>
              </div>
              <Badge className="bg-amber-600">{pendingOrders.length} awaiting confirmation</Badge>
            </div>
            <CardDescription className="text-amber-700">
              These orders need your review and confirmation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-amber-200"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">
                        Order #{order.order_number}
                      </p>
                      <p className="text-sm text-gray-500">
                        {order.producer?.name}
                        {order.livestock && (
                          <span>
                            {' '}&middot; {order.livestock.animal_type}{' '}
                            {order.livestock.tag_number && `#${order.livestock.tag_number}`}
                          </span>
                        )}
                      </p>
                      {order.scheduled_drop_off && (
                        <p className="text-xs text-amber-600 mt-1">
                          Requested: {new Date(order.scheduled_drop_off).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <Link href={`/dashboard/orders/${order.id}`}>
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                      Review
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>
            Your latest processing orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders && orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => {
                const hasCutSheet = order.cut_sheets && order.cut_sheets.length > 0
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="flex-1"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">
                            Order #{order.order_number}
                          </p>
                          <p className="text-sm text-gray-500">
                            {isProducer
                              ? order.processor?.name
                              : order.producer?.name}
                            {order.livestock && (
                              <span>
                                {' '}&middot; {order.livestock.animal_type}{' '}
                                {order.livestock.tag_number && `#${order.livestock.tag_number}`}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </Link>
                    <div className="flex items-center gap-3">
                      {isProducer && (
                        <Link
                          href={`/dashboard/orders/${order.id}/cut-sheet`}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            hasCutSheet
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          }`}
                        >
                          <FileText className="h-3 w-3" />
                          {hasCutSheet ? 'Cut Sheet' : 'Add Cut Sheet'}
                        </Link>
                      )}
                      {order.status === 'in_progress' && (
                        <Badge variant="outline">
                          {stageLabels[order.processing_stage] || order.processing_stage}
                        </Badge>
                      )}
                      <Badge className={statusColors[order.status]}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                      <Link href={`/dashboard/orders/${order.id}`}>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No orders yet</p>
              <p className="text-sm">
                {isProducer
                  ? 'Find a processor to get started'
                  : 'Orders will appear here when producers book with you'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
