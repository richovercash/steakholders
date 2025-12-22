'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw, Plus } from 'lucide-react'
import type { OrganizationType } from '@/types/database'

// Emails allowed to see dev mode (comma-separated env var or hardcoded)
const DEV_MODE_USERS = process.env.NEXT_PUBLIC_DEV_MODE_USERS?.split(',') || []

interface DevModeToggleProps {
  currentType: OrganizationType
  organizationId: string
  userEmail?: string
}

export function DevModeToggle({ currentType, organizationId, userEmail }: DevModeToggleProps) {
  const [loading, setLoading] = useState(false)
  const [seedingProcessor, setSeedingProcessor] = useState(false)
  const [processorCount, setProcessorCount] = useState<number | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Show dev mode in local development OR for allowed users in production
  const isLocalDev = process.env.NODE_ENV === 'development'
  const isAllowedUser = userEmail && DEV_MODE_USERS.includes(userEmail)
  const showDevMode = isLocalDev || isAllowedUser

  // Check processor count on mount
  useEffect(() => {
    if (!showDevMode) return
    async function checkProcessors() {
      const { count } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'processor')
        .eq('is_active', true)
      setProcessorCount(count ?? 0)
    }
    checkProcessors()
  }, [supabase, showDevMode])

  // Only show for allowed users
  if (!showDevMode) {
    return null
  }

  const handleToggle = async () => {
    setLoading(true)
    const newType: OrganizationType = currentType === 'producer' ? 'processor' : 'producer'

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ type: newType } as never)
        .eq('id', organizationId)

      if (error) {
        console.error('Error switching org type:', error)
        return
      }

      // Force a full page refresh to reload server-side data
      router.refresh()
      window.location.reload()
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSeedProcessor = async () => {
    setSeedingProcessor(true)
    try {
      // Check if test processor already exists
      const { data: existing } = await supabase
        .from('organizations')
        .select('id')
        .eq('name', 'Valley Meat Processing (Test)')
        .single()

      if (existing) {
        alert('Test processor already exists!')
        setSeedingProcessor(false)
        return
      }

      // Create a test processor
      const { error } = await supabase
        .from('organizations')
        .insert({
          name: 'Valley Meat Processing (Test)',
          type: 'processor',
          email: 'test-processor@example.com',
          phone: '555-123-4567',
          city: 'Cooperstown',
          state: 'NY',
          zip: '13326',
          license_number: 'TEST-1234',
          license_type: 'usda',
          services_offered: ['beef', 'pork', 'lamb', 'smoking', 'sausage'],
          capacity_per_week: 15,
          lead_time_days: 14,
          is_active: true,
        } as never)

      if (error) {
        console.error('Error seeding processor:', error)
        alert('Error creating test processor: ' + error.message)
        return
      }

      // Refresh to show the new processor
      setProcessorCount((prev) => (prev ?? 0) + 1)
      router.refresh()
      alert('Test processor created! Refresh the page to see it in listings.')
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setSeedingProcessor(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-gray-900 text-white rounded-lg shadow-lg p-3 space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono">DEV MODE</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded ${currentType === 'producer' ? 'bg-green-600' : 'bg-gray-600'}`}>
              Producer
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-white hover:bg-gray-700"
              onClick={handleToggle}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <span className={`text-xs px-2 py-1 rounded ${currentType === 'processor' ? 'bg-amber-600' : 'bg-gray-600'}`}>
              Processor
            </span>
          </div>
        </div>
        {/* Show processor count and seed button when in producer mode */}
        {currentType === 'producer' && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-700">
            <span className="text-xs text-gray-400">
              Processors: {processorCount ?? '...'}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2 text-white hover:bg-gray-700"
              onClick={handleSeedProcessor}
              disabled={seedingProcessor}
            >
              <Plus className="h-3 w-3 mr-1" />
              {seedingProcessor ? 'Creating...' : 'Add Test Processor'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
