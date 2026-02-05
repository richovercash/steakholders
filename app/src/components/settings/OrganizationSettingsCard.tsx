'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import type { Organization } from '@/types/database'

interface OrganizationSettingsCardProps {
  organization: Organization
}

export function OrganizationSettingsCard({ organization }: OrganizationSettingsCardProps) {
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const isProducer = organization.type === 'producer'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)

    const formData = new FormData(e.currentTarget)

    const updateData: Record<string, string | number | null> = {
      name: formData.get('orgName') as string,
      email: formData.get('orgEmail') as string,
      phone: formData.get('orgPhone') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      zip: formData.get('zip') as string,
    }

    if (isProducer) {
      updateData.farm_name = formData.get('farmName') as string
    }

    const { error } = await supabase
      .from('organizations')
      .update(updateData as never)
      .eq('id', organization.id)

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
        description: 'Organization settings have been updated.',
      })
      router.refresh()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization</CardTitle>
        <CardDescription>
          {isProducer ? 'Your farm details' : 'Your facility details'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">
              {isProducer ? 'Business Name' : 'Facility Name'}
            </Label>
            <Input
              id="orgName"
              name="orgName"
              defaultValue={organization.name || ''}
            />
          </div>

          {isProducer && (
            <div className="space-y-2">
              <Label htmlFor="farmName">Farm Name</Label>
              <Input
                id="farmName"
                name="farmName"
                defaultValue={organization.farm_name || ''}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orgEmail">Email</Label>
              <Input
                id="orgEmail"
                name="orgEmail"
                type="email"
                defaultValue={organization.email || ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgPhone">Phone</Label>
              <Input
                id="orgPhone"
                name="orgPhone"
                type="tel"
                defaultValue={organization.phone || ''}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              name="city"
              defaultValue={organization.city || ''}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                name="state"
                maxLength={2}
                defaultValue={organization.state || ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                name="zip"
                defaultValue={organization.zip || ''}
              />
            </div>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Organization'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
