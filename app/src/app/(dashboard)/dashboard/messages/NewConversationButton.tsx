'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Organization {
  id: string
  name: string
  type: string
}

interface NewConversationButtonProps {
  availableOrgs: Organization[]
}

export function NewConversationButton({ availableOrgs }: NewConversationButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const handleSelect = (orgId: string) => {
    setOpen(false)
    router.push(`/dashboard/messages/${orgId}`)
  }

  if (availableOrgs.length === 0) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a New Conversation</DialogTitle>
          <DialogDescription>
            Select an organization to message
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mt-4">
          {availableOrgs.map((org) => (
            <button
              key={org.id}
              onClick={() => handleSelect(org.id)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                org.type === 'producer' ? 'bg-green-100' : 'bg-amber-100'
              }`}>
                {org.type === 'producer' ? '🐄' : '🥩'}
              </div>
              <div>
                <p className="font-medium">{org.name}</p>
                <p className="text-sm text-gray-500 capitalize">{org.type}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
