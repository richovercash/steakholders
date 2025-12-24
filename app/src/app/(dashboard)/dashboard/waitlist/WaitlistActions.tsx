'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MoreVertical, X, CheckCircle } from 'lucide-react'
import { cancelWaitlistEntry, claimWaitlistSlot } from '@/lib/actions/waitlist'

interface WaitlistActionsProps {
  entryId: string
  isNotified: boolean
}

export function WaitlistActions({ entryId, isNotified }: WaitlistActionsProps) {
  const router = useRouter()
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleCancel = async () => {
    setLoading(true)
    const result = await cancelWaitlistEntry(entryId)
    setLoading(false)
    setShowCancelDialog(false)

    if (!result.success) {
      alert(result.error || 'Failed to cancel')
    }
    router.refresh()
  }

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

  return (
    <>
      <div className="flex items-center gap-2">
        {isNotified && (
          <Button
            size="sm"
            className="bg-green-700 hover:bg-green-800"
            onClick={handleClaim}
            disabled={loading}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            {loading ? 'Claiming...' : 'Claim Slot'}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-red-600"
              onClick={() => setShowCancelDialog(true)}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel Entry
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Waitlist Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove yourself from this waitlist?
              You&apos;ll lose your position and won&apos;t be notified when slots open.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Entry</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? 'Cancelling...' : 'Yes, Cancel'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
