'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Clock } from 'lucide-react'
import { createWaitlistEntry } from '@/lib/actions/waitlist'
import type { AnimalType } from '@/types/database'

interface CalendarSlot {
  id: string
  date: string
  animal_type: string
  capacity: number
  booked: number
  kill_fee: number | null
}

interface SlotCardProps {
  processorId: string
  date: string
  slots: CalendarSlot[]
}

export function SlotCard({ processorId, date, slots }: SlotCardProps) {
  const router = useRouter()
  const [joiningWaitlist, setJoiningWaitlist] = useState<string | null>(null)
  const [waitlistSuccess, setWaitlistSuccess] = useState<string | null>(null)

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  // Check if any slots have availability
  const hasAvailability = slots.some(slot => slot.capacity - slot.booked > 0)

  const handleJoinWaitlist = async (slot: CalendarSlot) => {
    setJoiningWaitlist(slot.id)

    const result = await createWaitlistEntry({
      processor_id: processorId,
      preferred_date: date,
      animal_type: slot.animal_type as AnimalType,
      flexible_range_days: 7,
    })

    setJoiningWaitlist(null)

    if (result.success) {
      setWaitlistSuccess(slot.id)
      setTimeout(() => {
        router.push('/dashboard/waitlist')
      }, 1500)
    } else {
      alert(result.error || 'Failed to join waitlist')
    }
  }

  return (
    <div className="border rounded-lg p-4">
      <h4 className="font-medium mb-2">{formattedDate}</h4>
      <div className="space-y-2">
        {slots.map((slot) => {
          const available = slot.capacity - slot.booked

          return (
            <div key={slot.id} className="flex justify-between items-center text-sm">
              <span className="capitalize">{slot.animal_type}</span>
              <div className="flex items-center gap-2">
                <span className={available > 0 ? 'text-green-600' : 'text-red-500'}>
                  {available > 0 ? `${available} spots` : 'Full'}
                </span>
                {slot.kill_fee && (
                  <span className="text-gray-500">${slot.kill_fee}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Action Buttons */}
      <div className="mt-3 space-y-2">
        {hasAvailability ? (
          <Link href={`/dashboard/orders/new?processor=${processorId}&date=${date}`}>
            <Button className="w-full bg-green-700 hover:bg-green-800" size="sm">
              Book This Date
            </Button>
          </Link>
        ) : (
          <>
            {slots.map((slot) => {
              const isJoining = joiningWaitlist === slot.id
              const isSuccess = waitlistSuccess === slot.id

              return (
                <Button
                  key={slot.id}
                  variant="outline"
                  className={`w-full ${isSuccess ? 'border-green-500 text-green-700' : ''}`}
                  size="sm"
                  onClick={() => handleJoinWaitlist(slot)}
                  disabled={isJoining || isSuccess}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  {isSuccess
                    ? 'Added to Waitlist!'
                    : isJoining
                    ? 'Joining...'
                    : `Join Waitlist (${slot.animal_type})`}
                </Button>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
