---
id: order_workflow_v1
version: 1
domain: orders
status: active
---

# Processing Order Workflow Protocol

## Purpose

Define the lifecycle and state transitions for processing orders.

## Order Status Flow

```
draft → submitted → confirmed → in_progress → ready → complete
                  ↘ cancelled
```

### Status Definitions

| Status | Description | Who Can Transition |
|--------|-------------|-------------------|
| `draft` | Order created but not submitted | Producer |
| `submitted` | Sent to processor for review | Producer |
| `confirmed` | Processor accepted the order | Processor |
| `in_progress` | Animal received, processing started | Processor |
| `ready` | Processing complete, ready for pickup | Processor |
| `complete` | Picked up by producer | Both |
| `cancelled` | Order cancelled | Both (before in_progress) |

## Processing Stage Flow

Within `in_progress`, track granular stages:

```
pending → received → hanging → cutting → wrapping → freezing → ready → picked_up
```

### Stage Definitions

| Stage | Description | Typical Duration |
|-------|-------------|-----------------|
| `pending` | Awaiting drop-off | Until drop-off |
| `received` | Animal received at facility | 0-1 day |
| `hanging` | Carcass hanging for aging | 7-21 days |
| `cutting` | Breaking down into cuts | 1-2 days |
| `wrapping` | Vacuum sealing/paper wrapping | 1 day |
| `freezing` | Flash freezing (if requested) | 1 day |
| `ready` | Ready for customer pickup | Until pickup |
| `picked_up` | Customer collected order | Final |

## The Rules

### 1. Order Creation

Producer creates order with:
- Selected processor
- Linked livestock (animal)
- Scheduled calendar slot
- Cut sheet (can be added later)

```typescript
interface CreateOrderInput {
  processor_id: string;
  livestock_id: string;
  calendar_slot_id: string;
  cut_sheet_id?: string;
  producer_notes?: string;
}
```

### 2. Status Transitions

Only valid transitions are allowed:

```typescript
const validTransitions = {
  draft: ['submitted', 'cancelled'],
  submitted: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['ready'],
  ready: ['complete'],
  complete: [], // terminal
  cancelled: [], // terminal
};
```

### 3. Stage Updates

- Only processor can update processing stages
- Stage updates trigger notifications to producer
- Each stage update records timestamp

### 4. Weight Recording

| Weight | When Recorded | By Whom |
|--------|--------------|---------|
| `live_weight` | At drop-off | Producer or Processor |
| `hanging_weight` | After processing | Processor |
| `final_weight` | After cutting | Processor |

### 5. Notifications

Trigger notifications on:
- Order confirmed
- Stage changes
- Ready for pickup
- Weight recorded

## Anti-Patterns

- Never skip status steps (draft → in_progress is invalid)
- Never allow processor to create orders (producer initiates)
- Never update stages without recording timestamp
- Never transition to `cancelled` after `in_progress`
