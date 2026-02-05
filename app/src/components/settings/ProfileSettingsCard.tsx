'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types/database'

interface ProfileSettingsCardProps {
  profile: User
}

export function ProfileSettingsCard({ profile }: ProfileSettingsCardProps) {
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)

    const formData = new FormData(e.currentTarget)

    const { error } = await supabase
      .from('users')
      .update({
        full_name: formData.get('fullName') as string,
        phone: formData.get('phone') as string,
      } as never)
      .eq('id', profile.id)

    setSaving(false)

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Saved',
        description: 'Your profile has been updated.',
      })
      router.refresh()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your personal information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              name="fullName"
              defaultValue={profile.full_name || ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email || ''}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500">Email cannot be changed</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={profile.phone || ''}
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
