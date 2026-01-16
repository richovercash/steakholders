---
id: ADR-002
title: Multi-Tenant Architecture with Row-Level Security
status: accepted
date: 2025-12-21
decision_makers: [Steakholders Team]
domain: auth
---

# ADR-002: Multi-Tenant Architecture with Row-Level Security

## Context

Steakholders serves two distinct user types (producers and processors) who must:

1. Only see their own organization's data
2. Share specific data with counterparties (processing orders)
3. Have role-based access within their organization

We need an architecture that enforces data isolation while enabling controlled data sharing.

## Decision

Implement multi-tenancy using PostgreSQL Row-Level Security (RLS) with organization-based isolation.

### Key Design Elements

1. **Organization as Tenant**: Each producer farm or processor facility is an `organization`
2. **Users Belong to Organizations**: Every user has an `organization_id` foreign key
3. **RLS Policies on All Tables**: Database enforces access control
4. **Helper Function**: `get_user_org_id()` returns current user's organization

### RLS Policy Pattern

```sql
-- Standard policy: users see only their org's data
CREATE POLICY "Users can access their organization's data"
    ON table_name FOR ALL
    USING (organization_id = get_user_org_id());

-- Shared policy: both parties can see processing orders
CREATE POLICY "Both parties can view orders"
    ON processing_orders FOR SELECT
    USING (
        producer_id = get_user_org_id()
        OR processor_id = get_user_org_id()
    );
```

## Rationale

### Why RLS Over Application-Level Filtering

1. **Defense in Depth**: Even if application bugs expose queries, database blocks unauthorized access
2. **Consistent Enforcement**: Every query path (API, direct client, migrations) respects policies
3. **Audit Friendly**: Policies are declarative and inspectable
4. **Performance**: PostgreSQL optimizes queries with RLS predicates

### Why Organization-Based (Not User-Based)

1. **Team Collaboration**: Multiple users from same org need shared access
2. **Simpler Permissions**: Role within org determines capabilities
3. **Business Model Match**: Organizations are the billing/contracting entities

## Consequences

### Positive
- Data breaches limited to single organization
- No accidental cross-tenant data leaks
- Simplified application code (no WHERE clauses for tenant filtering)

### Negative
- RLS policies must be maintained alongside schema
- Testing requires simulating different auth contexts
- Complex policies can impact query performance

### Migration Path
If RLS becomes a bottleneck, we can:
1. Add materialized views for complex queries
2. Implement read replicas for reporting
3. Consider schema-per-tenant for largest customers

## Implementation

See `supabase-schema.sql` for full RLS policy definitions.

Key helper function:
```sql
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
    SELECT organization_id FROM users WHERE auth_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;
```
