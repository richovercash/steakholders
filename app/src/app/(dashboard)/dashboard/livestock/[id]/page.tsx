'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Trash2, Edit3, Save, X } from 'lucide-react'
import type { Livestock, AnimalType, LivestockStatus } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function LivestockDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const [livestock, setLivestock] = useState<Livestock | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Form state
  const [animalType, setAnimalType] = useState<AnimalType>('beef')
  const [tagNumber, setTagNumber] = useState('')
  const [name, setName] = useState('')
  const [breed, setBreed] = useState('')
  const [estimatedWeight, setEstimatedWeight] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [sex, setSex] = useState('')
  const [status, setStatus] = useState<LivestockStatus>('on_farm')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function loadLivestock() {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Get user's organization
        const { data: profile } = await supabase
          .from('users')
          .select('organization_id, organization:organizations(type)')
          .eq('auth_id', user.id)
          .single() as { data: { organization_id: string | null; organization: { type: string } | null } | null }

        if (profile?.organization?.type !== 'producer') {
          router.push('/dashboard')
          return
        }

        // Fetch livestock
        const { data: animal, error: fetchError } = await supabase
          .from('livestock')
          .select('*')
          .eq('id', id)
          .eq('producer_id', profile.organization_id || '')
          .single() as { data: Livestock | null; error: Error | null }

        if (fetchError || !animal) {
          setError('Animal not found')
          return
        }

        setLivestock(animal)
        // Initialize form with current values
        setAnimalType(animal.animal_type)
        setTagNumber(animal.tag_number || '')
        setName(animal.name || '')
        setBreed(animal.breed || '')
        setEstimatedWeight(animal.estimated_live_weight?.toString() || '')
        setBirthDate(animal.birth_date || '')
        setSex(animal.sex || '')
        setStatus(animal.status)
        setNotes(animal.notes || '')
      } catch {
        setError('Failed to load animal')
      } finally {
        setLoading(false)
      }
    }

    loadLivestock()
  }, [id, router, supabase])

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const updateData = {
        animal_type: animalType,
        tag_number: tagNumber || null,
        name: name || null,
        breed: breed || null,
        estimated_live_weight: estimatedWeight ? parseInt(estimatedWeight) : null,
        birth_date: birthDate || null,
        sex: sex || null,
        status: status,
        notes: notes || null,
      }

      const { error: updateError } = await supabase
        .from('livestock')
        .update(updateData as never)
        .eq('id', id)

      if (updateError) {
        setError(updateError.message)
        return
      }

      // Refetch to get updated data
      const { data: updated } = await supabase
        .from('livestock')
        .select('*')
        .eq('id', id)
        .single() as { data: Livestock | null }

      if (updated) {
        setLivestock(updated)
      }

      setIsEditing(false)
      router.refresh()
    } catch {
      setError('Failed to update animal')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('livestock')
        .delete()
        .eq('id', id)

      if (deleteError) {
        setError(deleteError.message)
        return
      }

      router.push('/dashboard/livestock')
      router.refresh()
    } catch {
      setError('Failed to delete animal')
    } finally {
      setDeleting(false)
    }
  }

  const cancelEdit = () => {
    // Reset form to original values
    if (livestock) {
      setAnimalType(livestock.animal_type)
      setTagNumber(livestock.tag_number || '')
      setName(livestock.name || '')
      setBreed(livestock.breed || '')
      setEstimatedWeight(livestock.estimated_live_weight?.toString() || '')
      setBirthDate(livestock.birth_date || '')
      setSex(livestock.sex || '')
      setStatus(livestock.status)
      setNotes(livestock.notes || '')
    }
    setIsEditing(false)
  }

  const statusColors: Record<string, string> = {
    on_farm: 'bg-green-100 text-green-800',
    scheduled: 'bg-blue-100 text-blue-800',
    in_transit: 'bg-purple-100 text-purple-800',
    processing: 'bg-amber-100 text-amber-800',
    complete: 'bg-gray-100 text-gray-800',
    sold: 'bg-gray-100 text-gray-800',
  }

  const animalIcons: Record<string, string> = {
    beef: '🐄',
    pork: '🐷',
    lamb: '🐑',
    goat: '🐐',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (error && !livestock) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard/livestock" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Livestock
          </Link>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-600">{error}</p>
            <Link href="/dashboard/livestock">
              <Button className="mt-4" variant="outline">
                Return to Livestock
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <Link href="/dashboard/livestock" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Livestock
        </Link>

        {!isEditing && livestock && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit3 className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md mx-4">
            <CardHeader>
              <CardTitle>Delete Animal</CardTitle>
              <CardDescription>
                Are you sure you want to delete this animal? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="text-5xl">
              {animalIcons[livestock?.animal_type || 'beef']}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <CardTitle>
                  {livestock?.name || livestock?.tag_number || 'Unnamed Animal'}
                </CardTitle>
                <Badge className={statusColors[livestock?.status || 'on_farm']}>
                  {livestock?.status.replace('_', ' ')}
                </Badge>
              </div>
              <CardDescription>
                {livestock?.breed || livestock?.animal_type}
                {livestock?.tag_number && ` • Tag #${livestock.tag_number}`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        {isEditing ? (
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="animalType">Animal Type</Label>
                <select
                  id="animalType"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={animalType}
                  onChange={(e) => setAnimalType(e.target.value as AnimalType)}
                >
                  <option value="beef">Beef Cattle</option>
                  <option value="pork">Pig</option>
                  <option value="lamb">Lamb</option>
                  <option value="goat">Goat</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as LivestockStatus)}
                >
                  <option value="on_farm">On Farm</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_transit">In Transit</option>
                  <option value="processing">Processing</option>
                  <option value="complete">Complete</option>
                  <option value="sold">Sold</option>
                </select>
              </div>
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
                <Label htmlFor="name">Name</Label>
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
                placeholder="Any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                className="bg-green-700 hover:bg-green-800"
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="outline"
                onClick={cancelEdit}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </CardContent>
        ) : (
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500">Animal Type</p>
                <p className="font-medium capitalize">{livestock?.animal_type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tag Number</p>
                <p className="font-medium">{livestock?.tag_number || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Breed</p>
                <p className="font-medium">{livestock?.breed || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Sex</p>
                <p className="font-medium capitalize">{livestock?.sex || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estimated Weight</p>
                <p className="font-medium">
                  {livestock?.estimated_live_weight
                    ? `${livestock.estimated_live_weight} lbs`
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Birth Date</p>
                <p className="font-medium">
                  {livestock?.birth_date
                    ? new Date(livestock.birth_date).toLocaleDateString()
                    : '-'}
                </p>
              </div>
            </div>

            {livestock?.notes && (
              <div>
                <p className="text-sm text-gray-500">Notes</p>
                <p className="mt-1">{livestock.notes}</p>
              </div>
            )}

            <div className="pt-4 border-t">
              <p className="text-xs text-gray-400">
                Added {new Date(livestock?.created_at || '').toLocaleDateString()}
                {livestock?.updated_at !== livestock?.created_at && (
                  <> • Updated {new Date(livestock?.updated_at || '').toLocaleDateString()}</>
                )}
              </p>
            </div>

            {/* Quick Actions */}
            {livestock?.status === 'on_farm' && (
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500 mb-3">Quick Actions</p>
                <Link href={`/dashboard/discover?animal=${livestock.id}`}>
                  <Button className="bg-green-700 hover:bg-green-800">
                    Find Processor & Book Slot
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
