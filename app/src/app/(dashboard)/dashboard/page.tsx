import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClipboardList, Calendar, Truck, MessageSquare } from 'lucide-react'
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
  producer: { name: string } | null
  processor: { name: string } | null
  livestock: { tag_number: string | null; animal_type: string } | null
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
      livestock(tag_number, animal_type)
    `)
    .or(
      isProducer
        ? `producer_id.eq.${organization?.id}`
        : `processor_id.eq.${organization?.id}`
    )
    .order('created_at', { ascending: false })
    .limit(5) as { data: OrderWithRelations[] | null }

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

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
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

        {isProducer ? (
          <Card>
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
        ) : (
          <Card>
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
        )}

        <Card>
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

        <Card>
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
      </div>

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
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
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
                  <div className="flex items-center gap-3">
                    {order.status === 'in_progress' && (
                      <Badge variant="outline">
                        {stageLabels[order.processing_stage] || order.processing_stage}
                      </Badge>
                    )}
                    <Badge className={statusColors[order.status]}>
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
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
