'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { OrganizationType } from '@/types/database'

interface OnboardingData {
  type: OrganizationType
  name: string
  email?: string
  phone?: string
  city?: string
  state?: string
  zip?: string
  // Producer fields
  farm_name?: string
  // Processor fields
  license_number?: string
  license_type?: string
  capacity_per_week?: number
  services_offered?: string[]
}

export async function completeOnboarding(data: OnboardingData): Promise<{ success: boolean; error?: string }> {
  // Get the current user
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Use admin client to bypass RLS
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Create organization
  const orgData: Record<string, unknown> = {
    name: data.name,
    type: data.type,
    email: data.email,
    phone: data.phone,
    city: data.city,
    state: data.state,
    zip: data.zip,
  }

  if (data.type === 'producer') {
    orgData.farm_name = data.farm_name
  } else {
    orgData.license_number = data.license_number
    orgData.license_type = data.license_type
    orgData.capacity_per_week = data.capacity_per_week
    orgData.services_offered = data.services_offered || ['beef', 'pork']
  }

  const { data: org, error: orgError } = await adminClient
    .from('organizations')
    .insert(orgData)
    .select('id')
    .single()

  if (orgError) {
    console.error('Organization creation error:', orgError)
    return { success: false, error: orgError.message }
  }

  // Link user to organization
  const { error: userError } = await adminClient
    .from('users')
    .update({
      organization_id: org.id,
      role: 'owner',
    })
    .eq('auth_id', user.id)

  if (userError) {
    console.error('User update error:', userError)
    return { success: false, error: userError.message }
  }

  return { success: true }
}
