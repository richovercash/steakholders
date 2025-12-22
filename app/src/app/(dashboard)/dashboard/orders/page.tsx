import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, FileText } from 'lucide-react'
import type { OrganizationType } from '@/types/database'

interface ProfileWithOrg {
  organization_id: string | null
  organization: { type: OrganizationType } | null
}

interface OrderWithRelations {
  id: string
  order_number: number
  status: string
  created_at: string
  hanging_weight: number | null
  producer: { name: string } | null
  processor: { name: string } | null
  livestock: { tag_number: string | null; animal_type: string; name: string | null } | null
  cut_sheets: { id: string; status: string }[] | null
}

export default async function OrdersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, organization:organizations(type)')
    .eq('auth_id', user!.id)
    .single() as { data: ProfileWithOrg | null }

  const isProducer = profile?.organization?.type === 'producer'

  const { data: orders } = await supabase
    .from('processing_orders')
    .select(`
      *,
      producer:organizations!producer_id(name),
      processor:organizations!processor_id(name),
      livestock(tag_number, animal_type, name),
      cut_sheets(id, status)
    `)
    .or(
      isProducer
        ? `producer_id.eq.${profile?.organization_id}`
        : `processor_id.eq.${profile?.organization_id}`
    )
    .order('created_at', { ascending: false }) as { data: OrderWithRelations[] | null }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    submitted: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-purple-100 text-purple-800',
    in_progress: 'bg-amber-100 text-amber-800',
    ready: 'bg-green-100 text-green-800',
    complete: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-gray-600">
            {isProducer ? 'Manage your processing orders' : 'View and update customer orders'}
          </p>
        </div>
        {isProducer && (
          <Link href="/dashboard/orders/new">
            <Button className="bg-green-700 hover:bg-green-800">
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>
            {orders?.length || 0} total orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders && orders.length > 0 ? (
            <div className="divide-y">
              {orders.map((order) => {
                const hasCutSheet = order.cut_sheets && order.cut_sheets.length > 0
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between py-4 hover:bg-gray-50 -mx-4 px-4 transition-colors"
                  >
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="flex-1"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">Order #{order.order_number}</span>
                        <Badge className={statusColors[order.status]}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {isProducer ? order.processor?.name : order.producer?.name}
                        {order.livestock && (
                          <>
                            {' '}&middot;{' '}
                            {order.livestock.animal_type}
                            {order.livestock.tag_number && ` #${order.livestock.tag_number}`}
                            {order.livestock.name && ` (${order.livestock.name})`}
                          </>
                        )}
                      </p>
                    </Link>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm text-gray-500">
                        <p>{new Date(order.created_at).toLocaleDateString()}</p>
                        {order.hanging_weight && (
                          <p>{order.hanging_weight} lbs hanging</p>
                        )}
                      </div>
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
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg font-medium">No orders yet</p>
              <p className="text-sm mt-1">
                {isProducer
                  ? 'Create your first order to get started'
                  : 'Orders will appear here when producers book with you'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
