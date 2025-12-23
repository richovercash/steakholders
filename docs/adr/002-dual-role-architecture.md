# ADR-002: Dual-Role Architecture (Producer/Processor)

## Status

Accepted

## Date

2024-12

## Context

Steakholders serves two distinct user types with different needs:

1. **Producers** (farmers/ranchers): Manage livestock, find processors, submit orders, specify cut preferences
2. **Processors** (butchers/meat plants): Manage calendar availability, receive orders, track processing, update status

These roles have:
- Different dashboard views
- Different navigation options
- Different actions available
- Some shared features (messaging, order viewing)

We needed to decide how to model these roles in the application.

## Decision

### Single Organization Model with Type Discriminator

Each organization has a `type` field that determines role:

```typescript
type OrganizationType = 'producer' | 'processor'
```

### Role-Based UI Rendering

- Single dashboard layout with conditional rendering based on organization type
- Shared components where functionality overlaps
- Role-specific pages/features gated by organization type

### Database Design

```sql
organizations (
  id UUID PRIMARY KEY,
  type organization_type NOT NULL, -- 'producer' or 'processor'
  -- Producer-specific fields (nullable for processors)
  farm_name VARCHAR(255),
  -- Processor-specific fields (nullable for producers)
  license_number VARCHAR(100),
  license_type VARCHAR(50),
  services_offered JSONB,
  capacity_per_week INTEGER,
  lead_time_days INTEGER
)
```

### Route Structure

```
/dashboard              # Role-adaptive main dashboard
/dashboard/livestock    # Producer only
/dashboard/calendar     # Processor only
/dashboard/orders       # Both (different views)
/dashboard/discover     # Producer only (find processors)
/dashboard/messages     # Both
/dashboard/settings     # Both (different fields)
```

### Conditional Navigation

Navigation sidebar shows different links based on `organization.type`:

| Feature | Producer | Processor |
|---------|----------|-----------|
| Dashboard | Yes | Yes |
| Livestock | Yes | No |
| Calendar | No | Yes |
| Orders | Yes | Yes |
| Discover | Yes | No |
| Messages | Yes | Yes |
| Settings | Yes | Yes |

## Consequences

### Positive

- **Simple data model**: Single organizations table with nullable role-specific fields
- **Easy querying**: Filter by type for role-specific listings
- **Shared code**: Common components/layouts reduce duplication
- **Future flexibility**: Could add hybrid roles (producer who also processes)
- **Clear authorization**: Check organization type for access control

### Negative

- **Nullable fields**: Some columns are only relevant for one type
- **Conditional complexity**: UI code has many `if (isProducer)` checks
- **Potential for bugs**: Must remember to check role in new features

### Neutral

- Order detail page shows different actions based on viewer's organization type
- Settings page dynamically shows relevant configuration sections

## Alternatives Considered

1. **Separate Tables (producers/processors)**: Cleaner schema but duplicated common fields, harder to query across types
2. **Role-Based Permissions**: More granular but overkill for two distinct roles with clear separation
3. **Separate Apps**: Maximum isolation but duplicated code, harder maintenance
4. **Polymorphic Inheritance**: PostgreSQL table inheritance adds complexity without clear benefit

## Implementation Notes

### Middleware Check (Example)
```typescript
// In dashboard layout
const { data: user } = await supabase.from('users').select('organization:organizations(*)')
const isProcessor = user?.organization?.type === 'processor'
```

### Conditional Rendering Pattern
```tsx
{organization.type === 'producer' && (
  <Link href="/dashboard/livestock">Livestock</Link>
)}
{organization.type === 'processor' && (
  <Link href="/dashboard/calendar">Calendar</Link>
)}
```

## Related

- [ADR-003: Database Design & RLS](./003-database-design-rls.md)
- [ADR-005: Authentication Flow](./005-authentication-flow.md)
