# ADR-003: Database Design & Row-Level Security

## Status

Accepted

## Date

2024-12

## Context

Steakholders is a multi-tenant B2B platform where:
- Multiple organizations (producers and processors) share the same database
- Users belong to one organization
- Data access must be strictly controlled by organization membership
- Some data needs cross-organization visibility (e.g., orders visible to both parties)

We needed a security model that:
- Prevents data leaks between organizations
- Allows legitimate cross-organization access
- Is enforced at the database level (not just application code)
- Scales with the application

## Decision

### PostgreSQL Row-Level Security (RLS)

All tables have RLS enabled with policies that check `auth.uid()` against organization membership.

### Core Schema Design

```
organizations (multi-tenant container)
    ├── users (belong to one org)
    ├── livestock (producer's animals)
    ├── calendar_slots (processor's availability)
    ├── cut_sheets (templates owned by org)
    └── notifications (user-specific)

processing_orders (links producer ↔ processor)
    ├── cut_sheets (order-specific)
    └── messages (order-related conversations)
```

### Key Tables

| Table | Owner | Visibility |
|-------|-------|------------|
| organizations | Self | Public (for discovery) |
| users | Organization | Own org only |
| livestock | Producer org | Own org only |
| calendar_slots | Processor org | Public (for booking) |
| processing_orders | Producer org | Producer AND processor |
| cut_sheets | Order/Template | Order parties / Own org |
| messages | Sender org | Sender AND receiver orgs |
| notifications | User | Own user only |

### RLS Policy Patterns

#### Pattern 1: Own Organization Only
```sql
CREATE POLICY "Users can view own org data"
ON livestock FOR SELECT
USING (
  organization_id = (
    SELECT organization_id FROM users
    WHERE auth_id = auth.uid()
  )
);
```

#### Pattern 2: Cross-Organization (Orders)
```sql
CREATE POLICY "Order parties can view orders"
ON processing_orders FOR SELECT
USING (
  producer_id = (SELECT organization_id FROM users WHERE auth_id = auth.uid())
  OR
  processor_id = (SELECT organization_id FROM users WHERE auth_id = auth.uid())
);
```

#### Pattern 3: Public Read, Owner Write
```sql
-- Anyone can view active processors
CREATE POLICY "Public can view processors"
ON organizations FOR SELECT
USING (type = 'processor' AND is_active = true);

-- Only org members can update
CREATE POLICY "Members can update own org"
ON organizations FOR UPDATE
USING (
  id = (SELECT organization_id FROM users WHERE auth_id = auth.uid())
);
```

### Enum Types

Custom PostgreSQL enums for type safety:

```sql
CREATE TYPE organization_type AS ENUM ('producer', 'processor');
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'worker');
CREATE TYPE animal_type AS ENUM ('beef', 'pork', 'lamb', 'goat');
CREATE TYPE livestock_status AS ENUM ('on_farm', 'scheduled', 'in_transit', 'processing', 'complete', 'sold');
CREATE TYPE order_status AS ENUM ('draft', 'submitted', 'confirmed', 'in_progress', 'ready', 'complete', 'cancelled');
CREATE TYPE processing_stage AS ENUM ('pending', 'received', 'hanging', 'cutting', 'wrapping', 'freezing', 'ready', 'picked_up');
```

### JSONB for Flexible Data

Used JSONB for semi-structured data:
- `services_offered`: Array of services `["beef", "pork", "smoking"]`
- `certifications`: Array of cert objects
- `notification_preferences`: User settings
- `settings`: Organization-specific config

## Consequences

### Positive

- **Security by default**: RLS enforced at database level, can't be bypassed by app bugs
- **Simpler application code**: No need to add `WHERE org_id = ?` to every query
- **Audit-friendly**: Security rules defined in SQL, easy to review
- **Performance**: PostgreSQL optimizes RLS checks efficiently
- **Type safety**: Enums prevent invalid values

### Negative

- **Complexity**: RLS policies can be tricky to debug
- **Testing difficulty**: Must test with different user contexts
- **Migration challenges**: Changing RLS policies requires careful planning
- **Supabase dependency**: RLS tied to Supabase Auth's `auth.uid()`

### Neutral

- Need to use service role key for admin operations that bypass RLS
- Each policy adds some query overhead (usually negligible)

## Implementation Notes

### User Context in Queries

Supabase automatically sets `auth.uid()` from the JWT:

```typescript
// Client-side - RLS automatically applied
const { data } = await supabase
  .from('livestock')
  .select('*')
// Only returns current user's organization's livestock

// Server-side with service role - bypasses RLS
const { data } = await supabaseAdmin
  .from('livestock')
  .select('*')
// Returns ALL livestock (use carefully)
```

### Cross-Org Messaging

Messages table allows organization-to-organization communication:

```sql
CREATE POLICY "Message parties can view"
ON messages FOR SELECT
USING (
  sender_organization_id = (SELECT organization_id FROM users WHERE auth_id = auth.uid())
  OR
  receiver_organization_id = (SELECT organization_id FROM users WHERE auth_id = auth.uid())
);
```

## Alternatives Considered

1. **Application-Level Authorization**: Faster to develop but error-prone, security bypasses possible
2. **Separate Databases per Org**: Maximum isolation but complex, expensive, hard to query across orgs
3. **Schema-per-Tenant**: Good isolation but migration complexity, connection pooling issues
4. **JWT Claims for Org ID**: Faster queries but tokens can be stale, less secure

## Learnings

1. **Test RLS early**: Discovered issues when real users couldn't see expected data
2. **Use `auth.uid()` correctly**: Must match `auth_id` in users table, not `id`
3. **Enum casting**: When inserting from TypeScript, cast strings to enum types explicitly
4. **Service role for setup**: Test data creation needs service role to bypass RLS

## Related

- [ADR-002: Dual-Role Architecture](./002-dual-role-architecture.md)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
