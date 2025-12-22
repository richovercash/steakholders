import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardNav } from '@/components/dashboard/nav'
import { DevModeToggle } from '@/components/dashboard/DevModeToggle'
import { Toaster } from '@/components/ui/toaster'
import type { User, Organization } from '@/types/database'

interface ProfileWithOrg extends User {
  organization: Organization | null
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile with organization
  const { data: profile } = await supabase
    .from('users')
    .select(`
      *,
      organization:organizations(*)
    `)
    .eq('auth_id', user.id)
    .single() as { data: ProfileWithOrg | null }

  if (!profile?.organization_id) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav user={profile} organization={profile.organization!} />
      <main className="lg:pl-64">
        <div className="p-6">
          {children}
        </div>
      </main>
      <Toaster />
      <DevModeToggle
        currentType={profile.organization!.type}
        organizationId={profile.organization!.id}
        userEmail={user.email}
      />
    </div>
  )
}
