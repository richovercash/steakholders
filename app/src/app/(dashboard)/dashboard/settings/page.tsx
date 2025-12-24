'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { Check, Beef, PiggyBank, Rabbit, Flame, Drumstick, Bell, Mail, MessageSquare, Package } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { GoatIcon } from '@/components/icons/AnimalIcons'
import type { User, Organization } from '@/types/database'

type LicenseType = 'usda' | 'state' | 'custom_exempt'

const SERVICES_OPTIONS = [
  { id: 'beef', label: 'Beef', icon: <Beef className="h-5 w-5 text-red-600" /> },
  { id: 'pork', label: 'Pork', icon: <PiggyBank className="h-5 w-5 text-pink-600" /> },
  { id: 'lamb', label: 'Lamb', icon: <Rabbit className="h-5 w-5 text-purple-600" /> },
  { id: 'goat', label: 'Goat', icon: <GoatIcon className="h-5 w-5 text-amber-600" size={20} /> },
  { id: 'smoking', label: 'Smoking', icon: <Flame className="h-5 w-5 text-orange-600" /> },
  { id: 'sausage', label: 'Sausage', icon: <Drumstick className="h-5 w-5 text-rose-600" /> },
]

const LICENSE_TYPES: { value: LicenseType; label: string }[] = [
  { value: 'usda', label: 'USDA Inspected' },
  { value: 'state', label: 'State Inspected' },
  { value: 'custom_exempt', label: 'Custom Exempt' },
]

interface ProfileWithOrg extends User {
  organization: Organization | null
}

interface NotificationPreferences {
  email_order_updates: boolean
  email_messages: boolean
  email_system: boolean
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  email_order_updates: true,
  email_messages: true,
  email_system: false,
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<User | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFS)
  const [savingNotifications, setSavingNotifications] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { toast } = useToast()

  const isProcessor = organization?.type === 'processor'

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('users')
        .select('*, organization:organizations(*)')
        .eq('auth_id', user.id)
        .single() as { data: ProfileWithOrg | null }

      if (data) {
        setProfile(data)
        setOrganization(data.organization)
        if (data.organization?.services_offered) {
          setSelectedServices(data.organization.services_offered as string[])
        }
        // Load notification preferences
        if (data.notification_preferences && typeof data.notification_preferences === 'object') {
          const prefs = data.notification_preferences as unknown as Partial<NotificationPreferences>
          setNotificationPrefs({
            ...DEFAULT_NOTIFICATION_PREFS,
            ...prefs,
          })
        }
      }
      setLoading(false)
    }

    loadData()
  }, [supabase])

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)

    const formData = new FormData(e.currentTarget)

    const { error } = await supabase
      .from('users')
      .update({
        full_name: formData.get('fullName') as string,
        phone: formData.get('phone') as string,
      } as never)
      .eq('id', profile!.id)

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

  const handleOrgUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
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

    if (organization?.type === 'producer') {
      updateData.farm_name = formData.get('farmName') as string
    }

    const { error } = await supabase
      .from('organizations')
      .update(updateData as never)
      .eq('id', organization!.id)

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

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(s => s !== serviceId)
        : [...prev, serviceId]
    )
  }

  const handleNotificationPrefChange = async (key: keyof NotificationPreferences, value: boolean) => {
    const newPrefs = { ...notificationPrefs, [key]: value }
    setNotificationPrefs(newPrefs)
    setSavingNotifications(true)

    const { error } = await supabase
      .from('users')
      .update({ notification_preferences: newPrefs } as never)
      .eq('id', profile!.id)

    setSavingNotifications(false)

    if (error) {
      // Revert on error
      setNotificationPrefs(notificationPrefs)
      toast({
        title: 'Error',
        description: 'Failed to update notification preferences',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Saved',
        description: 'Notification preferences updated',
      })
    }
  }

  const handleProcessorUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)

    const formData = new FormData(e.currentTarget)

    const updateData = {
      capacity_per_week: parseInt(formData.get('capacityPerWeek') as string) || null,
      lead_time_days: parseInt(formData.get('leadTimeDays') as string) || null,
      license_number: formData.get('licenseNumber') as string || null,
      license_type: formData.get('licenseType') as string || null,
      services_offered: selectedServices,
    }

    const { error } = await supabase
      .from('organizations')
      .update(updateData as never)
      .eq('id', organization!.id)

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
        description: 'Processor settings have been updated.',
      })
      router.refresh()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-600">Manage your account and organization</p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                defaultValue={profile?.full_name || ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile?.email || ''}
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
                defaultValue={profile?.phone || ''}
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Control how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Notifications Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Mail className="h-4 w-4" />
              Email Notifications
            </div>

            <div className="space-y-4 pl-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-500" />
                    <Label htmlFor="email_order_updates" className="font-medium">
                      Order Updates
                    </Label>
                  </div>
                  <p className="text-sm text-gray-500">
                    Receive emails when orders are submitted, confirmed, or ready
                  </p>
                </div>
                <Switch
                  id="email_order_updates"
                  checked={notificationPrefs.email_order_updates}
                  onCheckedChange={(checked: boolean) => handleNotificationPrefChange('email_order_updates', checked)}
                  disabled={savingNotifications}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-500" />
                    <Label htmlFor="email_messages" className="font-medium">
                      New Messages
                    </Label>
                  </div>
                  <p className="text-sm text-gray-500">
                    Get notified when you receive a new message
                  </p>
                </div>
                <Switch
                  id="email_messages"
                  checked={notificationPrefs.email_messages}
                  onCheckedChange={(checked: boolean) => handleNotificationPrefChange('email_messages', checked)}
                  disabled={savingNotifications}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-gray-500" />
                    <Label htmlFor="email_system" className="font-medium">
                      System Announcements
                    </Label>
                  </div>
                  <p className="text-sm text-gray-500">
                    Platform updates, maintenance notices, and tips
                  </p>
                </div>
                <Switch
                  id="email_system"
                  checked={notificationPrefs.email_system}
                  onCheckedChange={(checked: boolean) => handleNotificationPrefChange('email_system', checked)}
                  disabled={savingNotifications}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
            <p>
              <strong>Note:</strong> You&apos;ll always receive in-app notifications.
              These settings only control email delivery.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Organization Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>
            {organization?.type === 'producer' ? 'Your farm details' : 'Your facility details'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleOrgUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">
                {organization?.type === 'producer' ? 'Business Name' : 'Facility Name'}
              </Label>
              <Input
                id="orgName"
                name="orgName"
                defaultValue={organization?.name || ''}
              />
            </div>

            {organization?.type === 'producer' && (
              <div className="space-y-2">
                <Label htmlFor="farmName">Farm Name</Label>
                <Input
                  id="farmName"
                  name="farmName"
                  defaultValue={organization?.farm_name || ''}
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
                  defaultValue={organization?.email || ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgPhone">Phone</Label>
                <Input
                  id="orgPhone"
                  name="orgPhone"
                  type="tel"
                  defaultValue={organization?.phone || ''}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                defaultValue={organization?.city || ''}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  maxLength={2}
                  defaultValue={organization?.state || ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  name="zip"
                  defaultValue={organization?.zip || ''}
                />
              </div>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Organization'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Processor Settings */}
      {isProcessor && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="text-amber-800">Processor Settings</CardTitle>
            <CardDescription>Configure your processing facility</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProcessorUpdate} className="space-y-6">
              {/* Services Offered */}
              <div className="space-y-3">
                <Label>Services Offered</Label>
                <div className="grid grid-cols-3 gap-2">
                  {SERVICES_OPTIONS.map(service => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => toggleService(service.id)}
                      className={`p-3 rounded-lg border-2 flex items-center gap-2 transition-all ${
                        selectedServices.includes(service.id)
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedServices.includes(service.id)
                            ? 'bg-amber-500 border-amber-500'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedServices.includes(service.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="shrink-0">{service.icon}</span>
                      <span className="text-sm">{service.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Capacity & Lead Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="capacityPerWeek">Weekly Capacity</Label>
                  <Input
                    id="capacityPerWeek"
                    name="capacityPerWeek"
                    type="number"
                    min="1"
                    placeholder="Animals per week"
                    defaultValue={organization?.capacity_per_week || ''}
                  />
                  <p className="text-xs text-gray-500">Max animals you can process per week</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leadTimeDays">Lead Time (days)</Label>
                  <Input
                    id="leadTimeDays"
                    name="leadTimeDays"
                    type="number"
                    min="1"
                    placeholder="Days in advance"
                    defaultValue={organization?.lead_time_days || ''}
                  />
                  <p className="text-xs text-gray-500">How far ahead producers should book</p>
                </div>
              </div>

              <Separator />

              {/* License Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="licenseType">License Type</Label>
                  <select
                    id="licenseType"
                    name="licenseType"
                    defaultValue={organization?.license_type || ''}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="">Select license type...</option>
                    {LICENSE_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">License Number</Label>
                  <Input
                    id="licenseNumber"
                    name="licenseNumber"
                    placeholder="Your license/permit number"
                    defaultValue={organization?.license_number || ''}
                  />
                </div>
              </div>

              <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={saving}>
                {saving ? 'Saving...' : 'Save Processor Settings'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" disabled>
            Delete Account
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            Contact support to delete your account
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
