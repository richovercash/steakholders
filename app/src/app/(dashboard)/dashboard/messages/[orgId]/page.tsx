import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Message } from '@/types/database'
import ConversationClient from './ConversationClient'

interface MessageWithSender extends Message {
  sender: { full_name: string } | null
}

interface PageProps {
  params: Promise<{ orgId: string }>
}

export default async function ConversationPage({ params }: PageProps) {
  const { orgId } = await params
  console.log('[ConversationPage] Loading conversation for partner orgId:', orgId)

  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.log('[ConversationPage] No user found, redirecting to login')
    redirect('/login')
  }
  console.log('[ConversationPage] Auth user:', user.email)

  // Get user's profile and organization
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, organization_id')
    .eq('auth_id', user.id)
    .single() as { data: { id: string; organization_id: string | null } | null; error: Error | null }

  console.log('[ConversationPage] Profile lookup result:', { profile, error: profileError?.message })

  if (profileError || !profile?.organization_id) {
    console.error('[ConversationPage] Profile error or missing org_id:', profileError?.message, 'Profile:', profile)
    redirect('/login')
  }

  console.log('[ConversationPage] My org ID:', profile.organization_id, 'Looking up partner:', orgId)

  // Get the partner organization
  const { data: partnerOrg, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, type')
    .eq('id', orgId)
    .single() as { data: { id: string; name: string; type: string } | null; error: Error | null }

  console.log('[ConversationPage] Partner org lookup:', { partnerOrg, error: orgError?.message })

  if (orgError || !partnerOrg) {
    console.error('[ConversationPage] Partner org error:', orgError?.message, 'for orgId:', orgId)
    // List available orgs for debugging
    const { data: allOrgs } = await supabase.from('organizations').select('id, name, type').limit(10)
    console.log('[ConversationPage] Available orgs:', allOrgs)
    notFound()
  }

  // Fetch messages between the two organizations
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select(`
      *,
      sender:users!sender_id(full_name)
    `)
    .or(`and(sender_org_id.eq.${profile.organization_id},recipient_org_id.eq.${orgId}),and(sender_org_id.eq.${orgId},recipient_org_id.eq.${profile.organization_id})`)
    .order('created_at', { ascending: true })

  if (messagesError) {
    console.error('[ConversationPage] Messages error:', messagesError.message)
  }

  return (
    <ConversationClient
      partnerOrgId={partnerOrg.id}
      partnerOrgName={partnerOrg.name}
      partnerOrgType={partnerOrg.type}
      myOrgId={profile.organization_id}
      userId={profile.id}
      initialMessages={(messages || []) as MessageWithSender[]}
    />
  )
}
