# ADR-008: Waitlist System Design

## Status

Accepted

## Date

2024-12-23

## Context

Processing facilities have limited capacity per day/week. When all slots for a date are booked, producers need a way to be notified if a slot opens up. This is critical for:

1. Producer satisfaction - they don't have to manually check back
2. Processor utilization - cancelled slots get filled quickly
3. Fair access - first-come-first-served queue ensures fairness

We needed to decide on:
- Queue management strategy (FIFO vs priority-based)
- Notification timing and expiration
- Claim window mechanics
- Integration points with existing booking flow

## Decision

### 1. FIFO Queue with 24-Hour Claim Window

We implemented a first-in-first-out (FIFO) queue with a 24-hour claim window:

```
Producer joins waitlist → Order cancelled → First in queue notified → 24 hours to claim → If expired, next in queue notified
```

**Rationale**:
- FIFO is simple and fair
- 24 hours gives producers time to respond without blocking slots indefinitely
- If claim expires, the entry is marked inactive and next person is notified

### 2. Server Actions for All Waitlist Operations

All waitlist operations use Server Actions (`'use server'`) rather than API routes:

```typescript
// lib/actions/waitlist.ts
'use server'

export async function createWaitlistEntry(input: CreateWaitlistEntryInput) {
  const supabase = await createClient()
  // ... validation and insert
  revalidatePath('/dashboard/waitlist')
  return { success: true, entry }
}
```

**Rationale**:
- Consistent with messaging system pattern (ADR-006)
- Server actions properly authenticate with RLS
- `revalidatePath()` ensures UI updates after mutations
- Type-safe end-to-end with TypeScript

### 3. Flexible Date Range

Each waitlist entry includes a `flexible_range_days` field:

```typescript
interface WaitlistEntry {
  preferred_date: string      // Target date
  flexible_range_days: number // e.g., 7 = +/- 7 days acceptable
}
```

**Rationale**:
- Producers rarely have a hard requirement for a specific day
- Increases match probability when slots open
- Default of 7 days balances flexibility with specificity

### 4. Event-Driven Notifications

Waitlist notifications are triggered by order cancellation:

```typescript
// In order detail page
const handleQuickStatusChange = async (newStatus: OrderStatus) => {
  await supabase.from('processing_orders').update({ status: newStatus })

  if (newStatus === 'cancelled' && order.scheduled_drop_off) {
    await notifyNextInWaitlist(
      order.processor.id,
      order.scheduled_drop_off.split('T')[0],
      order.livestock.animal_type
    )
  }
}
```

**Rationale**:
- Immediate notification when slot opens
- Coupled to the actual business event (cancellation)
- No background jobs or cron needed

### 5. Unified Waitlist Page for Both Roles

Single `/dashboard/waitlist` page serves both producers and processors:

- **Producers see**: Their waitlist entries, notification status, claim actions
- **Processors see**: Who's waiting for their slots (read-only view)

**Rationale**:
- Consistent URL structure
- Role-based content is a pattern we use elsewhere
- Reduces duplicate pages

## Consequences

### Positive

- **Simple queue mechanics**: FIFO is easy to understand and implement
- **Fair system**: No favoritism, pure chronological order
- **Responsive**: Notifications happen immediately on cancellation
- **No external dependencies**: No queue service or cron jobs needed
- **Consistent patterns**: Uses same Server Actions approach as messaging

### Negative

- **24-hour window may be too long**: If producer doesn't respond, slot sits empty
- **No priority tiers**: Can't prioritize certain producers (may be needed later)
- **Manual trigger**: Only cancellation triggers notification, not capacity increases
- **Polling for status**: No realtime updates on waitlist position

### Neutral

- **Flexible range matching is simple**: Could be more sophisticated (weighted preferences)
- **Single notification per event**: Could batch notify multiple waitlisters

## Alternatives Considered

### 1. Real-time Queue with WebSockets

Would use Supabase Realtime to push updates to waitlist position.

**Rejected because**:
- Realtime has been problematic with our RLS setup (see LEARNINGS.md)
- Waitlist position doesn't change frequently enough to justify
- Polling or page refresh is adequate

### 2. Priority-Based Queue

Allow processors to set priority rules (e.g., repeat customers first).

**Rejected for MVP because**:
- Adds complexity for edge case
- Can be added later as enhancement
- FIFO is more transparent/fair

### 3. Auction-Style Slot Release

When slot opens, notify all waitlisters and let them bid or race.

**Rejected because**:
- Creates anxiety and bad UX
- Favors those who are online at notification time
- Against the "fair queue" principle

### 4. Automatic Booking on Cancellation

Instead of notifying, automatically create an order for first in queue.

**Rejected because**:
- Producer may no longer want/need the slot
- Creates potential for unwanted bookings
- 24-hour claim gives producer agency

## Related

- ADR-006: Messaging System (Server Actions pattern)
- ADR-003: Database Design & RLS (waitlist table RLS policies)
- ROADMAP.md: Waitlist is part of Phase 1 Scheduling Platform
