'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon, Beef, PiggyBank, Rabbit } from 'lucide-react'
import { GoatIcon } from '@/components/icons/AnimalIcons'
import type { AnimalType } from '@/types/database'

interface CalendarSlot {
  id: string
  date: string
  animal_type: AnimalType
  capacity: number
  booked_count: number
  kill_fee: number | null
  is_available: boolean
  notes: string | null
}

interface SlotsByDate {
  [date: string]: CalendarSlot[]
}

const ANIMAL_TYPES: { value: AnimalType; label: string; icon: React.ReactNode }[] = [
  { value: 'beef', label: 'Beef', icon: <Beef className="h-5 w-5 text-red-600" /> },
  { value: 'pork', label: 'Pork', icon: <PiggyBank className="h-5 w-5 text-pink-600" /> },
  { value: 'lamb', label: 'Lamb', icon: <Rabbit className="h-5 w-5 text-purple-600" /> },
  { value: 'goat', label: 'Goat', icon: <GoatIcon className="h-5 w-5 text-amber-600" size={20} /> },
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function CalendarPage() {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [slots, setSlots] = useState<SlotsByDate>({})
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showSlotModal, setShowSlotModal] = useState(false)
  const [editingSlot, setEditingSlot] = useState<CalendarSlot | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state for new/edit slot
  const [slotForm, setSlotForm] = useState({
    animal_type: 'beef' as AnimalType,
    capacity: 1,
    kill_fee: '',
    is_available: true,
    notes: '',
  })

  const router = useRouter()
  const supabase = createClient()

  // Get calendar days for current month
  const getCalendarDays = useCallback(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPadding = firstDay.getDay()
    const days: (Date | null)[] = []

    // Add padding for days before month starts
    for (let i = 0; i < startPadding; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }, [currentDate])

  // Format date to YYYY-MM-DD
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  // Load slots for current month
  const loadSlots = useCallback(async () => {
    if (!organizationId) return

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 0)

    const { data, error } = await supabase
      .from('calendar_slots')
      .select('*')
      .eq('processor_id', organizationId)
      .gte('date', formatDate(startDate))
      .lte('date', formatDate(endDate))
      .order('date') as { data: CalendarSlot[] | null; error: Error | null }

    if (error) {
      console.error('Error loading slots:', error)
      return
    }

    // Group slots by date
    const grouped: SlotsByDate = {}
    data?.forEach(slot => {
      if (!grouped[slot.date]) {
        grouped[slot.date] = []
      }
      grouped[slot.date].push(slot)
    })
    setSlots(grouped)
  }, [organizationId, currentDate, supabase])

  // Initial auth check
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('organization:organizations(id, type)')
        .eq('auth_id', user.id)
        .single() as { data: { organization: { id: string; type: string } | null } | null }

      if (profile?.organization?.type !== 'processor') {
        router.push('/dashboard')
        return
      }

      setOrganizationId(profile.organization.id)
      setAuthorized(true)
      setLoading(false)
    }

    checkAuth()
  }, [router, supabase])

  // Load slots when organization or month changes
  useEffect(() => {
    if (organizationId) {
      loadSlots()
    }
  }, [organizationId, loadSlots])

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1))
  }

  const openSlotModal = (date: string, slot?: CalendarSlot) => {
    setSelectedDate(date)
    if (slot) {
      setEditingSlot(slot)
      setSlotForm({
        animal_type: slot.animal_type,
        capacity: slot.capacity,
        kill_fee: slot.kill_fee?.toString() || '',
        is_available: slot.is_available,
        notes: slot.notes || '',
      })
    } else {
      setEditingSlot(null)
      setSlotForm({
        animal_type: 'beef',
        capacity: 1,
        kill_fee: '',
        is_available: true,
        notes: '',
      })
    }
    setShowSlotModal(true)
  }

  const closeSlotModal = () => {
    setShowSlotModal(false)
    setSelectedDate(null)
    setEditingSlot(null)
  }

  const handleSaveSlot = async () => {
    if (!selectedDate || !organizationId) return

    setSaving(true)

    const slotData = {
      processor_id: organizationId,
      date: selectedDate,
      animal_type: slotForm.animal_type,
      capacity: slotForm.capacity,
      kill_fee: slotForm.kill_fee ? parseFloat(slotForm.kill_fee) : null,
      is_available: slotForm.is_available,
      notes: slotForm.notes || null,
    }

    let error
    if (editingSlot) {
      const result = await supabase
        .from('calendar_slots')
        .update(slotData as never)
        .eq('id', editingSlot.id)
      error = result.error
    } else {
      const result = await supabase
        .from('calendar_slots')
        .insert(slotData as never)
      error = result.error
    }

    if (error) {
      console.error('Error saving slot:', error)
      alert('Error saving slot: ' + error.message)
    } else {
      await loadSlots()
      closeSlotModal()
    }

    setSaving(false)
  }

  const handleDeleteSlot = async () => {
    if (!editingSlot) return

    if (!confirm('Delete this slot?')) return

    setSaving(true)

    const { error } = await supabase
      .from('calendar_slots')
      .delete()
      .eq('id', editingSlot.id)

    if (error) {
      console.error('Error deleting slot:', error)
      alert('Error deleting slot: ' + error.message)
    } else {
      await loadSlots()
      closeSlotModal()
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading calendar...</p>
        </div>
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  const calendarDays = getCalendarDays()
  const today = formatDate(new Date())

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar Management</h1>
          <p className="text-gray-500">Manage your processing availability</p>
        </div>
      </div>

      {/* Month Navigation */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-xl">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigateMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="min-h-[100px] bg-gray-50 rounded" />
              }

              const dateStr = formatDate(day)
              const daySlots = slots[dateStr] || []
              const isToday = dateStr === today
              const isPast = dateStr < today

              return (
                <div
                  key={dateStr}
                  className={`min-h-[100px] border rounded p-1 ${
                    isToday ? 'border-amber-500 bg-amber-50' : 'border-gray-200'
                  } ${isPast ? 'bg-gray-50' : 'bg-white'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm font-medium ${isToday ? 'text-amber-700' : 'text-gray-700'}`}>
                      {day.getDate()}
                    </span>
                    {!isPast && (
                      <button
                        onClick={() => openSlotModal(dateStr)}
                        className="text-gray-400 hover:text-amber-600 p-0.5"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Slots for this day */}
                  <div className="space-y-1">
                    {daySlots.map(slot => {
                      const animal = ANIMAL_TYPES.find(a => a.value === slot.animal_type)
                      const available = slot.capacity - slot.booked_count

                      return (
                        <button
                          key={slot.id}
                          onClick={() => openSlotModal(dateStr, slot)}
                          className={`w-full text-left text-xs p-1 rounded flex items-center ${
                            slot.is_available && available > 0
                              ? 'bg-green-100 hover:bg-green-200'
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          <span className="shrink-0">{animal?.icon}</span>
                          <span className="ml-1">
                            {slot.booked_count}/{slot.capacity}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 rounded"></div>
              <span>Full / Unavailable</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-amber-500 bg-amber-50 rounded"></div>
              <span>Today</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slot Modal */}
      {showSlotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {editingSlot ? 'Edit Slot' : 'Add Slot'} - {selectedDate}
              </CardTitle>
              <button onClick={closeSlotModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Animal Type</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {ANIMAL_TYPES.map(animal => (
                    <button
                      key={animal.value}
                      onClick={() => setSlotForm({ ...slotForm, animal_type: animal.value })}
                      className={`p-2 rounded border-2 text-center flex flex-col items-center ${
                        slotForm.animal_type === animal.value
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="mb-1">{animal.icon}</div>
                      <div className="text-xs">{animal.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={slotForm.capacity}
                    onChange={e => setSlotForm({ ...slotForm, capacity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="kill_fee">Kill Fee ($)</Label>
                  <Input
                    id="kill_fee"
                    type="number"
                    step="0.01"
                    placeholder="Optional"
                    value={slotForm.kill_fee}
                    onChange={e => setSlotForm({ ...slotForm, kill_fee: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_available"
                  checked={slotForm.is_available}
                  onChange={e => setSlotForm({ ...slotForm, is_available: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_available">Available for booking</Label>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Optional notes for this slot..."
                  value={slotForm.notes}
                  onChange={e => setSlotForm({ ...slotForm, notes: e.target.value })}
                  rows={2}
                />
              </div>

              {editingSlot && (
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <span className="text-gray-500">Current bookings:</span>{' '}
                  <span className="font-medium">{editingSlot.booked_count} / {editingSlot.capacity}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                  onClick={handleSaveSlot}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Slot'}
                </Button>
                {editingSlot && (
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={handleDeleteSlot}
                    disabled={saving}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
