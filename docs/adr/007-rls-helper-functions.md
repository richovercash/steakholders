# ADR-007: RLS Helper Functions with SECURITY DEFINER

## Status

Accepted

## Date

2024-12

## Context

RLS (Row Level Security) policies in Supabase often need to check the current user's organization or role. A naive approach causes **infinite recursion** when a policy on a table queries that same table.

**Example of the problem**:

```sql
-- This causes infinite recursion!
CREATE POLICY "Processors can view all orgs" ON organizations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM organizations o  -- Queries organizations table
    JOIN users u ON u.organization_id = o.id
    WHERE u.auth_id = auth.uid() AND o.type = 'processor'
  )
);
```

When Supabase evaluates this policy on the `organizations` table, it needs to query `organizations` again, which triggers the policy again, causing infinite recursion.

**Real-world scenario**: Processors needed to view all organizations (including producers) to enable messaging. The initial RLS policy failed with recursion errors.

## Decision

Use `SECURITY DEFINER` helper functions to bypass RLS when checking user context.

### Pattern: SECURITY DEFINER Helper Functions

```sql
-- Helper function that bypasses RLS
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id
  FROM users
  WHERE auth_id = auth.uid()
  LIMIT 1
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper to get user's organization type
CREATE OR REPLACE FUNCTION get_user_org_type()
RETURNS TEXT AS $$
  SELECT o.type::TEXT
  FROM users u
  JOIN organizations o ON o.id = u.organization_id
  WHERE u.auth_id = auth.uid()
  LIMIT 1
$$ LANGUAGE SQL SECURITY DEFINER STABLE;
```

### Why This Works

1. **SECURITY DEFINER**: Function runs with the privileges of the function owner (superuser), not the calling user
2. **Bypasses RLS**: Because it runs as superuser, RLS policies don't apply to queries inside the function
3. **Safe**: Only returns the calling user's own data (uses `auth.uid()`)
4. **STABLE**: PostgreSQL can cache results within a transaction

### Using in RLS Policies

```sql
-- Now works without recursion!
CREATE POLICY "Processors can view all organizations"
ON organizations FOR SELECT
USING (get_user_org_type() = 'processor');

-- Policy for messaging visibility
CREATE POLICY "Users can view orgs they have messaged with"
ON organizations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    WHERE (m.sender_org_id = get_user_org_id() AND m.recipient_org_id = organizations.id)
       OR (m.recipient_org_id = get_user_org_id() AND m.sender_org_id = organizations.id)
  )
);
```

## Consequences

### Positive

- **Eliminates recursion**: Helper functions bypass RLS entirely
- **Reusable**: Same functions work across multiple policies
- **Performant**: STABLE hint allows PostgreSQL to cache results per-transaction
- **Type-safe**: Functions have explicit return types

### Negative

- **Security consideration**: SECURITY DEFINER functions must be carefully written to only return the calling user's data
- **Maintenance**: Changes to user/org relationship require updating helper functions
- **Debugging complexity**: Errors in helper functions can be harder to trace

### Neutral

- Requires migration to create functions before policies can use them
- Functions must be created by database owner/superuser

## Implementation Notes

### Migration Order

1. Create helper functions first
2. Drop existing conflicting policies
3. Create new policies using helper functions

```sql
-- Migration: 20250101000025_rls_orgs_messaging.sql

-- Step 1: Create helper function
CREATE OR REPLACE FUNCTION get_user_org_type()
RETURNS TEXT AS $$
  SELECT o.type::TEXT
  FROM users u
  JOIN organizations o ON o.id = u.organization_id
  WHERE u.auth_id = auth.uid()
  LIMIT 1
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Step 2: Drop old policies
DROP POLICY IF EXISTS "Processors can view all organizations" ON organizations;

-- Step 3: Create new policy using helper
CREATE POLICY "Processors can view all organizations"
ON organizations FOR SELECT
USING (get_user_org_type() = 'processor');
```

### Existing Helper Functions

| Function | Returns | Purpose |
|----------|---------|---------|
| `get_user_org_id()` | UUID | Current user's organization ID |
| `get_user_org_type()` | TEXT | Current user's organization type ('producer' or 'processor') |

### When to Use This Pattern

- Policy needs to check current user's organization attributes
- Policy is on a table that would be queried to determine access
- Cross-table joins would cause RLS evaluation loops

### When NOT to Use

- Simple policies that only use `auth.uid()` directly
- Policies that don't query the table they're protecting
- Policies that use only foreign key relationships to other tables

## Alternatives Considered

1. **Subqueries in policies**: Caused recursion when querying same table
2. **Disable RLS for specific operations**: Too permissive, security risk
3. **Application-level checks**: Bypasses database-level security, inconsistent enforcement
4. **Separate lookup tables**: Added complexity, data duplication

## Related

- [ADR-003: Database Design and RLS](./003-database-design-rls.md)
- [ADR-006: Messaging System](./006-messaging-system.md)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
