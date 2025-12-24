import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Calendar, Beef, AlertCircle } from 'lucide-react'
import { getProducerWaitlistEntries, getProcessorWaitlistEntries } from '@/lib/actions/waitlist'
import { WaitlistActions } from './WaitlistActions'
import { ClaimSlotBanner } from './ClaimSlotBanner'
import type { OrganizationType, AnimalType } from '@/types/database'

interface ProfileWithOrg {
  organization_id: string | null
  organization: { type: OrganizationType } | null
}

const ANIMAL_LABELS: Record<AnimalType, string> = {
  beef: 'Beef',
  pork: 'Pork',
  lamb: 'Lamb',
  goat: 'Goat',
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getFlexibleDateRange(preferredDate: string, flexibleDays: number): string {
  const preferred = new Date(preferredDate)
  const start = new Date(preferred)
  start.setDate(start.getDate() - flexibleDays)
  const end = new Date(preferred)
  end.setDate(end.getDate() + flexibleDays)

  const formatShort = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${formatShort(start)} - ${formatShort(end)}`
}

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: { claim?: string }
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, organization:organizations(type)')
    .eq('auth_id', user!.id)
    .single() as { data: ProfileWithOrg | null }

  const isProducer = profile?.organization?.type === 'producer'

  // Get entries based on role
  const entries = isProducer
    ? await getProducerWaitlistEntries()
    : await getProcessorWaitlistEntries()

  // Separate active and inactive entries for producers
  const activeEntries = entries.filter(e => e.is_active)
  const inactiveEntries = entries.filter(e => !e.is_active)

  // Check if there's a claim to process
  const claimEntryId = searchParams.claim

  return (
    <div className="space-y-6">
      {/* Claim Banner */}
      {claimEntryId && isProducer && (
        <ClaimSlotBanner entryId={claimEntryId} />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Waitlist</h1>
        <p className="text-gray-600">
          {isProducer
            ? 'Track your position for processing slots'
            : 'View producers waiting for open slots'}
        </p>
      </div>

      {/* Active Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Active Waitlist Entries</CardTitle>
          <CardDescription>
            {isProducer
              ? "You'll be notified when a slot becomes available"
              : 'Producers waiting for openings at your facility'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No active waitlist entries</p>
              {isProducer && (
                <p className="text-sm mt-2">
                  When a processor&apos;s slots are full, you can join their waitlist
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {activeEntries.map((entry) => (
                <div
                  key={entry.id}
                  className={`p-4 border rounded-lg ${
                    entry.notified_at ? 'border-green-300 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      {/* Processor/Producer name */}
                      <div className="font-medium text-lg">
                        {isProducer
                          ? entry.processor?.name || 'Unknown Processor'
                          : entry.producer?.name || 'Unknown Producer'}
                      </div>

                      {/* Details */}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Preferred: {formatDate(entry.preferred_date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>Flexible: {getFlexibleDateRange(entry.preferred_date, entry.flexible_range_days)}</span>
                        </div>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Beef className="h-3 w-3" />
                          {ANIMAL_LABELS[entry.animal_type]}
                        </Badge>
                      </div>

                      {/* Livestock info */}
                      {entry.livestock && (
                        <div className="text-sm text-gray-500">
                          Animal: {entry.livestock.name || entry.livestock.tag_number || 'Unspecified'}
                        </div>
                      )}

                      {/* Notes */}
                      {entry.notes && (
                        <div className="text-sm text-gray-500 italic">
                          &quot;{entry.notes}&quot;
                        </div>
                      )}

                      {/* Notification status */}
                      {entry.notified_at && (
                        <div className="flex items-center gap-2 text-green-700 font-medium">
                          <AlertCircle className="h-4 w-4" />
                          Slot available! Claim within 24 hours
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {isProducer && (
                      <WaitlistActions
                        entryId={entry.id}
                        isNotified={!!entry.notified_at}
                      />
                    )}
                  </div>

                  {/* Joined date */}
                  <div className="mt-3 pt-3 border-t text-xs text-gray-400">
                    Joined waitlist: {formatDate(entry.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past/Inactive Entries (Producer only) */}
      {isProducer && inactiveEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Entries</CardTitle>
            <CardDescription>
              Claimed, expired, or cancelled waitlist entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inactiveEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 border rounded-lg border-gray-200 bg-gray-50 opacity-75"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">
                        {entry.processor?.name || 'Unknown Processor'}
                      </span>
                      <span className="text-gray-500 mx-2">-</span>
                      <span className="text-sm text-gray-600">
                        {formatDate(entry.preferred_date)}
                      </span>
                      <Badge variant="outline" className="ml-2">
                        {ANIMAL_LABELS[entry.animal_type]}
                      </Badge>
                    </div>
                    <Badge variant={entry.converted_to_order_id ? 'default' : 'secondary'}>
                      {entry.converted_to_order_id ? 'Converted to Order' : 'Expired/Cancelled'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
