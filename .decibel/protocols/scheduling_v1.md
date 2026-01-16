---
id: scheduling_v1
version: 1
domain: scheduling
status: active
---

# Scheduling Protocol

## Purpose

Define how processor availability and booking works.

## Calendar Slot Structure

```typescript
interface CalendarSlot {
  id: string;
  processor_id: string;
  date: Date;
  animal_type: 'beef' | 'pork' | 'lamb' | 'goat';
  capacity: number;      // max animals
  booked_count: number;  // current bookings
  kill_fee?: number;     // optional pricing
  is_available: boolean;
  notes?: string;
}
```

## The Rules

### 1. Slot Management (Processor)

Processors define their availability:

```typescript
// Create recurring slots
interface SlotTemplate {
  day_of_week: 0-6;  // Sunday = 0
  animal_type: AnimalType;
  capacity: number;
  kill_fee?: number;
}

// Generate slots for date range
function generateSlots(
  template: SlotTemplate,
  startDate: Date,
  endDate: Date
): CalendarSlot[]
```

### 2. Booking (Producer)

When producer books a slot:

1. Check `booked_count < capacity`
2. Create processing order linked to slot
3. Increment `booked_count`
4. If `booked_count === capacity`, slot appears full

```typescript
async function bookSlot(
  slotId: string,
  livestockId: string,
  producerId: string
): Promise<ProcessingOrder> {
  const slot = await getSlot(slotId);

  if (slot.booked_count >= slot.capacity) {
    throw new Error('Slot is full');
  }

  // Create order and increment count in transaction
  return await supabase.rpc('book_slot', {
    p_slot_id: slotId,
    p_livestock_id: livestockId,
    p_producer_id: producerId,
  });
}
```

### 3. Waitlist

When slot is full, producers can join waitlist:

```typescript
interface WaitlistEntry {
  id: string;
  producer_id: string;
  processor_id: string;
  preferred_date: Date;
  flexible_range_days: number;  // +/- days flexibility
  animal_type: AnimalType;
  livestock_id?: string;
  is_active: boolean;
  notified_at?: Date;
  converted_to_order_id?: string;
}
```

### 4. Waitlist Notifications

When slot opens (cancellation):

1. Find waitlist entries matching date range
2. Sort by created_at (FIFO)
3. Notify first entry
4. Give 24 hours to claim
5. If unclaimed, notify next

### 5. Cancellation

- Orders cancelled before `confirmed`: refund slot
- Orders cancelled after `confirmed`: processor discretion
- Always decrement `booked_count` on cancellation

## Viewing Availability

### Producer View

```typescript
// Get available slots for a processor
async function getAvailableSlots(
  processorId: string,
  animalType: AnimalType,
  startDate: Date,
  endDate: Date
): Promise<CalendarSlot[]> {
  return supabase
    .from('calendar_slots')
    .select('*')
    .eq('processor_id', processorId)
    .eq('animal_type', animalType)
    .gte('date', startDate)
    .lte('date', endDate)
    .eq('is_available', true)
    .lt('booked_count', supabase.raw('capacity'));
}
```

### Processor View

```typescript
// Get all slots with booking details
async function getProcessorCalendar(
  processorId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarSlot[]> {
  return supabase
    .from('calendar_slots')
    .select(`
      *,
      processing_orders (
        id,
        producer:organizations!producer_id (name),
        livestock (tag_number, animal_type)
      )
    `)
    .eq('processor_id', processorId)
    .gte('date', startDate)
    .lte('date', endDate);
}
```

## Anti-Patterns

- Never allow overbooking (booked_count > capacity)
- Never show past dates as bookable
- Never auto-claim waitlist spots (always notify first)
- Never delete slots with active bookings
