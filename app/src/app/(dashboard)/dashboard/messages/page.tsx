import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, ChevronRight, Building2, Warehouse } from 'lucide-react'
import { NewConversationButton } from './NewConversationButton'

interface ProfileResult {
  organization_id: string | null
}

interface MessageWithRelations {
  id: string
  content: string
  created_at: string
  read_at: string | null
  sender_id: string
  sender_org_id: string
  recipient_org_id: string
  sender: { full_name: string } | null
  sender_org: { name: string; type: string } | null
  recipient_org: { name: string; type: string } | null
}

export default async function MessagesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('auth_id', user!.id)
    .single() as { data: ProfileResult | null }

  // Get conversations (grouped by the other organization)
  const { data: messages } = await supabase
    .from('messages')
    .select(`
      *,
      sender:users!sender_id(full_name),
      sender_org:organizations!sender_org_id(name, type),
      recipient_org:organizations!recipient_org_id(name, type)
    `)
    .or(`sender_org_id.eq.${profile?.organization_id},recipient_org_id.eq.${profile?.organization_id}`)
    .order('created_at', { ascending: false })
    .limit(50) as { data: MessageWithRelations[] | null }

  // Group messages by conversation partner
  const conversations = new Map<string, {
    orgId: string
    orgName: string
    orgType: string
    lastMessage: MessageWithRelations
    unreadCount: number
  }>()

  messages?.forEach((msg) => {
    const partnerOrg = msg.sender_org_id === profile?.organization_id
      ? { id: msg.recipient_org_id, name: msg.recipient_org?.name, type: msg.recipient_org?.type }
      : { id: msg.sender_org_id, name: msg.sender_org?.name, type: msg.sender_org?.type }

    if (!conversations.has(partnerOrg.id)) {
      const unreadCount = messages?.filter(
        m => m.sender_org_id === partnerOrg.id && !m.read_at
      ).length || 0

      conversations.set(partnerOrg.id, {
        orgId: partnerOrg.id,
        orgName: partnerOrg.name || 'Unknown',
        orgType: partnerOrg.type || 'unknown',
        lastMessage: msg,
        unreadCount,
      })
    }
  })

  const conversationList = Array.from(conversations.values())

  // Get the user's organization type to determine messaging rules
  const { data: userOrg } = await supabase
    .from('organizations')
    .select('type')
    .eq('id', profile?.organization_id ?? '')
    .single() as { data: { type: string } | null }

  const isProcessor = userOrg?.type === 'processor'

  // Get available organizations to message
  // Producers can only message processors
  // Processors can message anyone (producers and other processors)
  let availableOrgsQuery = supabase
    .from('organizations')
    .select('id, name, type')
    .neq('id', profile?.organization_id ?? '')
    .eq('is_active', true)
    .order('name')

  if (!isProcessor) {
    // Producers can only message processors
    availableOrgsQuery = availableOrgsQuery.eq('type', 'processor')
  }

  const { data: availableOrgs } = await availableOrgsQuery as { data: { id: string; name: string; type: string }[] | null }

  // Filter out orgs we already have conversations with
  const existingOrgIds = new Set(conversationList.map(c => c.orgId))
  const newConversationOrgs = availableOrgs?.filter(org => !existingOrgIds.has(org.id)) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-gray-600">
            {isProcessor ? 'Communicate with farms and processors' : 'Communicate with your processors'}
          </p>
        </div>
        <NewConversationButton availableOrgs={newConversationOrgs} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
          <CardDescription>
            {conversationList.length} active conversation{conversationList.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {conversationList.length > 0 ? (
            <div className="divide-y">
              {conversationList.map((conv) => (
                <Link
                  key={conv.orgId}
                  href={`/dashboard/messages/${conv.orgId}`}
                  className="flex items-center justify-between py-4 hover:bg-gray-50 -mx-4 px-4 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      conv.orgType === 'producer' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {conv.orgType === 'producer' ? <Building2 className="h-5 w-5" /> : <Warehouse className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{conv.orgName}</span>
                        {conv.unreadCount > 0 && (
                          <span className="bg-green-700 text-white text-xs px-2 py-0.5 rounded-full">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-1">
                        {conv.lastMessage.content}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">
                      {new Date(conv.lastMessage.created_at).toLocaleDateString()}
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm mt-1">
                Start a conversation from an order or processor page
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
