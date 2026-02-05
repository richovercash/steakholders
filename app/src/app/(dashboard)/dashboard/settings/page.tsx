'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProfileSettingsCard } from '@/components/settings/ProfileSettingsCard'
import {
  NotificationPreferencesCard,
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPreferences,
} from '@/components/settings/NotificationPreferencesCard'
import { OrganizationSettingsCard } from '@/components/settings/OrganizationSettingsCard'
import { ProcessorSettingsCard } from '@/components/settings/ProcessorSettingsCard'
import { ProcessorCutSheetConfig } from '@/components/settings/ProcessorCutSheetConfig'
import { DangerZoneCard } from '@/components/settings/DangerZoneCard'
import type { User, Organization } from '@/types/database'

interface ProfileWithOrg extends User {
  organization: Organization | null
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<User | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFS)
  const supabase = useMemo(() => createClient(), [])

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
      {profile && <ProfileSettingsCard profile={profile} />}

      {/* Notification Preferences */}
      {profile && (
        <NotificationPreferencesCard
          profile={profile}
          initialPrefs={notificationPrefs}
        />
      )}

      {/* Organization Settings */}
      {organization && <OrganizationSettingsCard organization={organization} />}

      {/* Processor Settings */}
      {isProcessor && organization && (
        <ProcessorSettingsCard organization={organization} />
      )}

      {/* Cut Sheet Configuration - Processors Only */}
      {isProcessor && <ProcessorCutSheetConfig />}

      {/* Danger Zone */}
      <DangerZoneCard />
    </div>
  )
}
