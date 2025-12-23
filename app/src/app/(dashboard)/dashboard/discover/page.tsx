import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Organization } from '@/types/database'
import { DiscoverClient } from './discover-client'

export default async function DiscoverPage() {
  const supabase = await createClient()

  // Check if user is a producer
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('organization:organizations(type)')
      .eq('auth_id', user.id)
      .single() as { data: { organization: { type: string } | null } | null }

    if (profile?.organization?.type !== 'producer') {
      redirect('/dashboard')
    }
  }

  // Get all active processors
  const { data: processors } = await supabase
    .from('organizations')
    .select('*')
    .eq('type', 'processor')
    .eq('is_active', true)
    .order('name') as { data: Organization[] | null }

  return <DiscoverClient processors={processors || []} />
}
