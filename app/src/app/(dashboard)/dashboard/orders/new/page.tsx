'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Check } from 'lucide-react'

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

  const [selectedLivestock, setSelectedLivestock] = useState<string[]>([])
  const [selectedProcessor, setSelectedProcessor] = useState(preselectedProcessor || '')
  const [scheduledDate, setScheduledDate] = useState(preselectedDate || '')
  const [notes, setNotes] = useState('')

  // Toggle livestock selection
  const toggleLivestock = (id: string) => {
    setSelectedLivestock(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    )
  }

  // Select all livestock
  const selectAllLivestock = () => {
    if (selectedLivestock.length === livestock.length) {
      setSelectedLivestock([])
    } else {
      setSelectedLivestock(livestock.map(l => l.id))
    }
  }

  // Filter by animal type
  const [filterType, setFilterType] = useState<string>('all')

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

      // Create orders for each selected animal (or one order with no animal if none selected)
      const animalsToProcess = selectedLivestock.length > 0 ? selectedLivestock : [null]
      const createdOrders: string[] = []

      for (const livestockId of animalsToProcess) {
        const orderData = {
          producer_id: profile.organization_id,
          processor_id: selectedProcessor,
          livestock_id: livestockId,
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

        createdOrders.push(newOrder.id)
      }

      // If single order, go to order detail. If multiple, go to orders list
      if (createdOrders.length === 1) {
        router.push(`/dashboard/orders/${createdOrders[0]}`)
      } else {
        router.push('/dashboard/orders')
      }
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Select Animals (optional)</Label>
                {livestock.length > 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      className="text-sm border rounded px-2 py-1"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                    >
                      <option value="all">All Types</option>
                      <option value="beef">Beef</option>
                      <option value="pork">Pork</option>
                      <option value="lamb">Lamb</option>
                      <option value="goat">Goat</option>
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectAllLivestock}
                    >
                      {selectedLivestock.length === livestock.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                )}
              </div>

              {livestock.length > 0 ? (
                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                  {livestock
                    .filter(animal => filterType === 'all' || animal.animal_type === filterType)
                    .map((animal) => {
                      const isSelected = selectedLivestock.includes(animal.id)
                      return (
                        <div
                          key={animal.id}
                          onClick={() => toggleLivestock(animal.id)}
                          className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                            isSelected ? 'bg-green-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected ? 'bg-green-600 border-green-600' : 'border-gray-300'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">
                              {animal.animal_type.charAt(0).toUpperCase() + animal.animal_type.slice(1)}
                              {animal.tag_number && ` #${animal.tag_number}`}
                            </div>
                            {animal.name && (
                              <div className="text-sm text-gray-500">{animal.name}</div>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            animal.animal_type === 'beef' ? 'bg-red-100 text-red-700' :
                            animal.animal_type === 'pork' ? 'bg-pink-100 text-pink-700' :
                            animal.animal_type === 'lamb' ? 'bg-purple-100 text-purple-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {animal.animal_type}
                          </span>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No animals on farm.{' '}
                  <Link href="/dashboard/livestock/new" className="text-green-700 hover:underline">
                    Add one first
                  </Link>
                </p>
              )}

              {selectedLivestock.length > 0 && (
                <p className="text-sm text-green-700 font-medium">
                  {selectedLivestock.length} animal{selectedLivestock.length !== 1 ? 's' : ''} selected
                  {selectedLivestock.length > 1 && ' - One order will be created per animal'}
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
                {loading
                  ? 'Creating...'
                  : selectedLivestock.length > 1
                    ? `Create ${selectedLivestock.length} Orders`
                    : 'Create Order'
                }
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
