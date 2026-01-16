---
id: messaging_v1
version: 1
domain: messaging
status: active
---

# Messaging Protocol

## Purpose

Define real-time messaging between producers and processors.

## Message Structure

```typescript
interface Message {
  id: string;
  created_at: Date;

  // Sender
  sender_id: string;      // user ID
  sender_org_id: string;  // organization ID

  // Recipient
  recipient_org_id: string;

  // Context (optional)
  processing_order_id?: string;

  // Content
  content: string;

  // Status
  read_at?: Date;

  metadata?: Record<string, any>;
}
```

## The Rules

### 1. Message Threading

Messages are grouped by conversation:
- Between two organizations
- Optionally scoped to a specific order

```typescript
// Get conversation between two orgs
async function getConversation(
  orgA: string,
  orgB: string,
  orderId?: string
): Promise<Message[]> {
  let query = supabase
    .from('messages')
    .select('*, sender:users!sender_id(full_name)')
    .or(`sender_org_id.eq.${orgA},sender_org_id.eq.${orgB}`)
    .or(`recipient_org_id.eq.${orgA},recipient_org_id.eq.${orgB}`)
    .order('created_at', { ascending: true });

  if (orderId) {
    query = query.eq('processing_order_id', orderId);
  }

  return query;
}
```

### 2. Real-Time Updates

Use Supabase Realtime for live messages:

```typescript
// Subscribe to new messages
const subscription = supabase
  .channel('messages')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `recipient_org_id=eq.${currentOrgId}`,
    },
    (payload) => {
      // Add new message to UI
      addMessage(payload.new as Message);
    }
  )
  .subscribe();
```

### 3. Read Receipts

Mark messages as read when viewed:

```typescript
async function markAsRead(messageIds: string[]): Promise<void> {
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .in('id', messageIds)
    .eq('recipient_org_id', currentOrgId)
    .is('read_at', null);
}
```

### 4. Notifications

New messages trigger notifications:
- In-app notification (bell icon)
- Email if user has email notifications enabled
- Track notification preferences in user settings

### 5. Message Types

Future extension for structured messages:

```typescript
type MessageType =
  | 'text'           // Plain text
  | 'status_update'  // Order status changed
  | 'weight_update'  // Weight recorded
  | 'schedule_change'; // Appointment rescheduled

interface StructuredMessage extends Message {
  type: MessageType;
  structured_data?: {
    order_id?: string;
    old_value?: string;
    new_value?: string;
  };
}
```

## UI Guidelines

### Message Thread

```
┌────────────────────────────────────────────┐
│ Green Pastures Farm                    [X] │
│ Order #2847 - Beef (Angus Steer)           │
├────────────────────────────────────────────┤
│                                            │
│  [Valley Meat] 10:32 AM                    │
│  Your animal has been received. Hanging    │
│  weight: 642 lbs. Starting 14-day age.     │
│                                            │
│                    [You] 10:45 AM          │
│                    Great! Can we do 1-inch │
│                    ribeyes instead of      │
│                    1.5-inch?               │
│                                            │
│  [Valley Meat] 11:02 AM                    │
│  Sure, I'll update the cut sheet now.      │
│                                            │
├────────────────────────────────────────────┤
│ [Type a message...              ] [Send]   │
└────────────────────────────────────────────┘
```

## Anti-Patterns

- Never allow messages to unrelated organizations
- Never show message content in notifications (privacy)
- Never store sensitive data (SSN, payment) in messages
- Never allow message editing/deletion (audit trail)
