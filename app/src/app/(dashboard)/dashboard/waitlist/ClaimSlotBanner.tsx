'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AlertCircle, Clock, CheckCircle, X } from 'lucide-react'
import { claimWaitlistSlot, getWaitlistPosition } from '@/lib/actions/waitlist'

interface ClaimSlotBannerProps {
  entryId: string
}

export function ClaimSlotBanner({ entryId }: ClaimSlotBannerProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [position, setPosition] = useState<number | null>(null)

  useEffect(() => {
    // Fetch position
    getWaitlistPosition(entryId).then(setPosition)
  }, [entryId])

  const handleClaim = async () => {
    setLoading(true)
    const result = await claimWaitlistSlot(entryId)
    setLoading(false)

    if (result.success && result.orderId) {
      router.push(`/dashboard/orders/${result.orderId}`)
    } else {
      alert(result.error || 'Failed to claim slot')
      router.refresh()
    }
  }

  if (dismissed) return null

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="bg-green-100 rounded-full p-2">
            <AlertCircle className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <h3 className="font-semibold text-green-800">
              A Processing Slot is Available!
            </h3>
            <p className="text-green-700 text-sm mt-1">
              A slot you were waiting for has opened up.
              {position === 1 && " You're first in line!"}
              {position && position > 1 && ` You're #${position} in line.`}
            </p>
            <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
              <Clock className="h-4 w-4" />
              <span>Claim within 24 hours or it goes to the next person</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="bg-green-700 hover:bg-green-800"
            onClick={handleClaim}
            disabled={loading}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            {loading ? 'Claiming...' : 'Claim Slot'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
