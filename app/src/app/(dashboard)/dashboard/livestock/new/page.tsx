'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'
import type { AnimalType } from '@/types/database'

export default function NewLivestockPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authorized, setAuthorized] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Check if user is a producer
  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('organization:organizations(type)')
        .eq('auth_id', user.id)
        .single() as { data: { organization: { type: string } | null } | null }

      if (profile?.organization?.type !== 'producer') {
        router.push('/dashboard')
        return
      }

      setAuthorized(true)
    }
    checkAccess()
  }, [router, supabase])

  const [animalType, setAnimalType] = useState<AnimalType>('beef')
  const [tagNumber, setTagNumber] = useState('')
  const [name, setName] = useState('')
  const [breed, setBreed] = useState('')
  const [estimatedWeight, setEstimatedWeight] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [sex, setSex] = useState('')
  const [notes, setNotes] = useState('')

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

      // Get user's organization
      const { data: profile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('auth_id', user.id)
        .single() as { data: { organization_id: string | null } | null }

      if (!profile?.organization_id) {
        setError('No organization found')
        return
      }

      const livestockData = {
        producer_id: profile.organization_id,
        animal_type: animalType,
        tag_number: tagNumber || null,
        name: name || null,
        breed: breed || null,
        estimated_live_weight: estimatedWeight ? parseInt(estimatedWeight) : null,
        birth_date: birthDate || null,
        sex: sex || null,
        notes: notes || null,
        status: 'on_farm',
      }

      const { error: insertError } = await supabase
        .from('livestock')
        .insert(livestockData as never)

      if (insertError) {
        setError(insertError.message)
        return
      }

      router.push('/dashboard/livestock')
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
        <Link href="/dashboard/livestock" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Livestock
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Animal</CardTitle>
          <CardDescription>Enter the details for your livestock</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="animalType">Animal Type *</Label>
              <select
                id="animalType"
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={animalType}
                onChange={(e) => setAnimalType(e.target.value as AnimalType)}
                required
              >
                <option value="beef">Beef Cattle</option>
                <option value="pork">Pig</option>
                <option value="lamb">Lamb</option>
                <option value="goat">Goat</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tagNumber">Tag Number</Label>
                <Input
                  id="tagNumber"
                  placeholder="e.g., 1234"
                  value={tagNumber}
                  onChange={(e) => setTagNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  placeholder="e.g., Bessie"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="breed">Breed</Label>
                <Input
                  id="breed"
                  placeholder="e.g., Angus"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sex">Sex</Label>
                <select
                  id="sex"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="male">Male / Bull</option>
                  <option value="female">Female / Cow</option>
                  <option value="steer">Steer</option>
                  <option value="heifer">Heifer</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimatedWeight">Estimated Weight (lbs)</Label>
                <Input
                  id="estimatedWeight"
                  type="number"
                  placeholder="e.g., 1200"
                  value={estimatedWeight}
                  onChange={(e) => setEstimatedWeight(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate">Birth Date</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes about this animal..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="bg-green-700 hover:bg-green-800"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Animal'}
              </Button>
              <Link href="/dashboard/livestock">
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
