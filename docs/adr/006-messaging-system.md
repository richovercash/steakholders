# ADR-006: Organization-to-Organization Messaging

## Status

Accepted

## Date

2024-12

## Context

Producers and processors need to communicate about:
- Order details and clarifications
- Scheduling changes
- Cut sheet questions
- Pickup arrangements
- General inquiries before placing orders

Requirements:
- Messages between organizations (not individual users)
- Thread-like conversations
- Optionally linked to specific orders
- Read receipts
- Future: real-time updates

## Decision

### Organization-Level Messaging

Messages are sent between organizations, not users:

```sql
messages (
  id UUID PRIMARY KEY,
  sender_organization_id UUID REFERENCES organizations(id),
  receiver_organization_id UUID REFERENCES organizations(id),
  order_id UUID REFERENCES processing_orders(id), -- Optional
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ
)
```

### Conversation Model

Conversations are implicit based on the organization pair:

```typescript
// Get conversations for an organization
const { data: conversations } = await supabase
  .from('messages')
  .select('*, sender:organizations!sender_organization_id(*), receiver:organizations!receiver_organization_id(*)')
  .or(`sender_organization_id.eq.${orgId},receiver_organization_id.eq.${orgId}`)
  .order('created_at', { ascending: false })

// Group by conversation partner
const grouped = groupBy(conversations, msg =>
  msg.sender_organization_id === orgId
    ? msg.receiver_organization_id
    : msg.sender_organization_id
)
```

### UI Structure

```
/dashboard/messages          # Conversation list
/dashboard/messages/[orgId]  # Specific conversation thread
```

#### Conversation List View
- Shows each organization the user has messaged
- Displays last message preview
- Unread count badge
- Sorted by most recent activity

#### Conversation Thread View
- Chronological message list
- Input to send new message
- Auto-scroll to latest
- Mark messages as read on view

### Order-Linked Messages

Messages can optionally reference an order:

```typescript
// Send message about specific order
await supabase.from('messages').insert({
  sender_organization_id: myOrgId,
  receiver_organization_id: processorId,
  order_id: orderId, // Links to order
  content: 'Question about the cut sheet...'
})
```

This allows:
- Filtering messages by order
- Showing related messages on order detail page
- Context-aware conversations

### Read Status

Simple boolean per message:

```typescript
// Mark messages as read when viewing conversation
await supabase
  .from('messages')
  .update({ is_read: true })
  .eq('receiver_organization_id', myOrgId)
  .eq('sender_organization_id', otherOrgId)
  .eq('is_read', false)
```

### RLS Policies

```sql
-- Sender and receiver can view
CREATE POLICY "Message parties can view"
ON messages FOR SELECT
USING (
  sender_organization_id = get_user_org_id()
  OR receiver_organization_id = get_user_org_id()
);

-- Only sender org members can insert
CREATE POLICY "Org members can send"
ON messages FOR INSERT
WITH CHECK (
  sender_organization_id = get_user_org_id()
);
```

## Consequences

### Positive

- **Simple model**: No explicit conversation/thread tables
- **Organization-centric**: Matches B2B nature of platform
- **Order context**: Messages can be tied to specific orders
- **Scalable**: Easy to add real-time with Supabase Realtime

### Negative

- **No thread nesting**: Flat conversation, no reply-to
- **Organization granularity**: All org members see all messages
- **No message editing/deletion**: Once sent, permanent
- **Grouping logic**: Must be computed in app, not DB

### Neutral

- Read status is per-message, not per-user (org-level read)
- No file attachments in initial implementation

## Implementation Notes

### Dashboard Unread Count

```typescript
// In dashboard layout
const { count } = await supabase
  .from('messages')
  .select('*', { count: 'exact', head: true })
  .eq('receiver_organization_id', orgId)
  .eq('is_read', false)
```

### Auto-Scroll on Load

```tsx
const messagesEndRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
}, [messages])

return (
  <div>
    {messages.map(m => <Message key={m.id} {...m} />)}
    <div ref={messagesEndRef} />
  </div>
)
```

### Future: Real-Time

```typescript
// Subscribe to new messages
const channel = supabase
  .channel('messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `receiver_organization_id=eq.${orgId}`
  }, payload => {
    setMessages(prev => [...prev, payload.new])
  })
  .subscribe()
```

## Alternatives Considered

1. **User-to-User Messaging**: More granular but adds complexity, less B2B appropriate
2. **Explicit Threads/Channels**: Slack-like but overkill for this use case
3. **External Service (SendBird, Stream)**: Faster to implement but cost, vendor lock-in
4. **Email Only**: Simple but no in-app history, poor UX
5. **Order Comments Only**: Limits discovery/pre-order communication

## Related

- [ADR-002: Dual-Role Architecture](./002-dual-role-architecture.md) (producer ↔ processor communication)
- [ADR-003: Database Design](./003-database-design-rls.md) (RLS for message access)
