import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Phone, Mail, Calendar, Clock, ArrowLeft, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import type { Organization } from '@/types/database'
import { SlotCard } from './SlotCard'

interface CalendarSlot {
  id: string
  date: string
  animal_type: string
  capacity: number
  booked: number
  kill_fee: number | null
}

export default async function ProcessorDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  // Check if user is a producer
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('organization:organizations(type)')
      .eq('auth_id', user.id)
      .single() as { data: { organization: { type: string } | null } | null }

    if (profile?.organization?.type !== 'producer') {
      redirect('/dashboard')
    }
  }

  // Get processor details
  const { data: processor } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', params.id)
    .eq('type', 'processor')
    .eq('is_active', true)
    .single() as { data: Organization | null }

  if (!processor) {
    notFound()
  }

  // Get available calendar slots for next 30 days
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: slots } = await supabase
    .from('calendar_slots')
    .select('*')
    .eq('processor_id', params.id)
    .gte('date', today)
    .lte('date', thirtyDaysLater)
    .order('date') as { data: CalendarSlot[] | null }

  const licenseLabels: Record<string, string> = {
    usda: 'USDA Inspected',
    state: 'State Inspected',
    custom_exempt: 'Custom Exempt',
  }

  // Group slots by date
  const slotsByDate: Record<string, CalendarSlot[]> = {}
  slots?.forEach((slot) => {
    if (!slotsByDate[slot.date]) {
      slotsByDate[slot.date] = []
    }
    slotsByDate[slot.date].push(slot)
  })

  const availableDates = Object.keys(slotsByDate).sort()

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/discover" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Processors
        </Link>
      </div>

      {/* Processor Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{processor.name}</CardTitle>
              {processor.city && processor.state && (
                <CardDescription className="flex items-center gap-1 mt-1">
                  <MapPin className="h-4 w-4" />
                  {processor.city}, {processor.state} {processor.zip}
                </CardDescription>
              )}
            </div>
            {processor.license_type && (
              <Badge variant="outline" className="text-sm">
                {licenseLabels[processor.license_type] || processor.license_type}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Services */}
          {processor.services_offered && Array.isArray(processor.services_offered) && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Services</h4>
              <div className="flex flex-wrap gap-2">
                {(processor.services_offered as string[]).map((service) => (
                  <Badge key={service} className="bg-green-100 text-green-800">
                    {service}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Details */}
          <div className="grid md:grid-cols-2 gap-4">
            {processor.capacity_per_week && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>{processor.capacity_per_week} animals/week capacity</span>
              </div>
            )}
            {processor.lead_time_days && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{processor.lead_time_days} days lead time required</span>
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 pt-2 border-t">
            {processor.phone && (
              <a href={`tel:${processor.phone}`} className="flex items-center gap-1 hover:text-green-700">
                <Phone className="h-4 w-4" />
                {processor.phone}
              </a>
            )}
            {processor.email && (
              <a href={`mailto:${processor.email}`} className="flex items-center gap-1 hover:text-green-700">
                <Mail className="h-4 w-4" />
                {processor.email}
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Availability */}
      <Card>
        <CardHeader>
          <CardTitle>Available Dates</CardTitle>
          <CardDescription>
            Showing availability for the next 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableDates.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableDates.map((date) => (
                <SlotCard
                  key={date}
                  processorId={processor.id}
                  date={date}
                  slots={slotsByDate[date]}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No availability posted yet</p>
              <p className="text-sm mt-1">
                Contact the processor directly to schedule
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action */}
      <div className="flex flex-wrap gap-4">
        <Link href={`/dashboard/orders/new?processor=${processor.id}`}>
          <Button className="bg-green-700 hover:bg-green-800">
            Create Order with This Processor
          </Button>
        </Link>
        <Link href={`/dashboard/messages/${processor.id}`}>
          <Button variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            Send Message
          </Button>
        </Link>
        <Link href="/dashboard/discover">
          <Button variant="outline">
            Back to All Processors
          </Button>
        </Link>
      </div>
    </div>
  )
}
