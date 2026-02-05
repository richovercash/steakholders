'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { Bell, Mail, MessageSquare, Package } from 'lucide-react'
import type { User } from '@/types/database'

export interface NotificationPreferences {
  email_order_updates: boolean
  email_messages: boolean
  email_system: boolean
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  email_order_updates: true,
  email_messages: true,
  email_system: false,
}

interface NotificationPreferencesCardProps {
  profile: User
  initialPrefs: NotificationPreferences
}

export function NotificationPreferencesCard({ profile, initialPrefs }: NotificationPreferencesCardProps) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(initialPrefs)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  const handleChange = async (key: keyof NotificationPreferences, value: boolean) => {
    const newPrefs = { ...prefs, [key]: value }
    setPrefs(newPrefs)
    setSaving(true)

    const { error } = await supabase
      .from('users')
      .update({ notification_preferences: newPrefs } as never)
      .eq('id', profile.id)

    setSaving(false)

    if (error) {
      // Revert on error
      setPrefs(prefs)
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

  return (
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
                checked={prefs.email_order_updates}
                onCheckedChange={(checked: boolean) => handleChange('email_order_updates', checked)}
                disabled={saving}
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
                checked={prefs.email_messages}
                onCheckedChange={(checked: boolean) => handleChange('email_messages', checked)}
                disabled={saving}
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
                checked={prefs.email_system}
                onCheckedChange={(checked: boolean) => handleChange('email_system', checked)}
                disabled={saving}
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
  )
}
