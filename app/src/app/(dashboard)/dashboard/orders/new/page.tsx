'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'

interface Livestock {
  id: string
  animal_type: string
  tag_number: string | null
  name: string | null
  status: string
}

interface Processor {
  id: string
  name: string
  city: string | null
  state: string | null
  services_offered: string[] | null
}

export default function NewOrderPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authorized, setAuthorized] = useState(false)
  const [livestock, setLivestock] = useState<Livestock[]>([])
  const [processors, setProcessors] = useState<Processor[]>([])
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Get pre-selected values from URL params
  const preselectedProcessor = searchParams.get('processor')
  const preselectedDate = searchParams.get('date')

  const [selectedLivestock, setSelectedLivestock] = useState('')
  const [selectedProcessor, setSelectedProcessor] = useState(preselectedProcessor || '')
  const [scheduledDate, setScheduledDate] = useState(preselectedDate || '')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Check if user is a producer
      const { data: orgCheck } = await supabase
        .from('users')
        .select('organization:organizations(type)')
        .eq('auth_id', user.id)
        .single() as { data: { organization: { type: string } | null } | null }

      if (orgCheck?.organization?.type !== 'producer') {
        router.push('/dashboard')
        return
      }

      setAuthorized(true)

      const { data: profile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('auth_id', user.id)
        .single() as { data: { organization_id: string | null } | null }

      if (!profile?.organization_id) return

      // Load available livestock
      const { data: livestockData } = await supabase
        .from('livestock')
        .select('id, animal_type, tag_number, name, status')
        .eq('producer_id', profile.organization_id)
        .eq('status', 'on_farm') as { data: Livestock[] | null }

      if (livestockData) {
        setLivestock(livestockData)
      }

      // Load processors
      const { data: processorData } = await supabase
        .from('organizations')
        .select('id, name, city, state, services_offered')
        .eq('type', 'processor')
        .eq('is_active', true) as { data: Processor[] | null }

      if (processorData) {
        setProcessors(processorData)
        // Update selected processor if preselected and processors are loaded
        if (preselectedProcessor && processorData.some(p => p.id === preselectedProcessor)) {
          setSelectedProcessor(preselectedProcessor)
        }
      }
    }

    loadData()
  }, [supabase, preselectedProcessor, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not authenticated')
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('auth_id', user.id)
        .single() as { data: { organization_id: string | null } | null }

      if (!profile?.organization_id) {
        setError('No organization found')
        return
      }

      const orderData = {
        producer_id: profile.organization_id,
        processor_id: selectedProcessor,
        livestock_id: selectedLivestock || null,
        status: 'draft',
        scheduled_drop_off: scheduledDate ? new Date(scheduledDate).toISOString() : null,
        producer_notes: notes || null,
      }

      const { data: newOrder, error: insertError } = await supabase
        .from('processing_orders')
        .insert(orderData as never)
        .select('id')
        .single() as { data: { id: string } | null; error: Error | null }

      if (insertError || !newOrder) {
        setError(insertError?.message || 'Failed to create order')
        return
      }

      // Redirect to the order detail page where they can create a cut sheet
      router.push(`/dashboard/orders/${newOrder.id}`)
      router.refresh()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Show loading while checking authorization
  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/orders" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Orders
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Order</CardTitle>
          <CardDescription>Schedule a processing appointment</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="processor">Select Processor *</Label>
              <select
                id="processor"
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={selectedProcessor}
                onChange={(e) => setSelectedProcessor(e.target.value)}
                required
              >
                <option value="">Choose a processor...</option>
                {processors.map((proc) => (
                  <option key={proc.id} value={proc.id}>
                    {proc.name} {proc.city && proc.state && `- ${proc.city}, ${proc.state}`}
                  </option>
                ))}
              </select>
              {processors.length === 0 && (
                <p className="text-sm text-gray-500">No processors available. Check back later.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="livestock">Select Animal (optional)</Label>
              <select
                id="livestock"
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={selectedLivestock}
                onChange={(e) => setSelectedLivestock(e.target.value)}
              >
                <option value="">Choose an animal...</option>
                {livestock.map((animal) => (
                  <option key={animal.id} value={animal.id}>
                    {animal.animal_type.charAt(0).toUpperCase() + animal.animal_type.slice(1)}
                    {animal.tag_number && ` #${animal.tag_number}`}
                    {animal.name && ` (${animal.name})`}
                  </option>
                ))}
              </select>
              {livestock.length === 0 && (
                <p className="text-sm text-gray-500">
                  No animals on farm.{' '}
                  <Link href="/dashboard/livestock/new" className="text-green-700 hover:underline">
                    Add one first
                  </Link>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledDate">Preferred Drop-off Date</Label>
              <input
                id="scheduledDate"
                type="date"
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes for Processor</Label>
              <Textarea
                id="notes"
                placeholder="Any special instructions or requests..."
                value={notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="bg-green-700 hover:bg-green-800"
                disabled={loading || !selectedProcessor}
              >
                {loading ? 'Creating...' : 'Create Order'}
              </Button>
              <Link href="/dashboard/orders">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
