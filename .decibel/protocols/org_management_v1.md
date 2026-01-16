---
id: org_management_v1
version: 1
domain: organizations
status: active
---

# Organization Management Protocol

## Purpose

Define how organizations (producers and processors) are created and managed.

## Organization Types

```typescript
type OrganizationType = 'producer' | 'processor';

interface Organization {
  id: string;
  name: string;
  type: OrganizationType;

  // Contact
  email?: string;
  phone?: string;
  website?: string;

  // Address
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;  // 2-letter code
  zip?: string;

  // Geolocation (PostGIS)
  location?: Point;  // For proximity matching

  // Processor-specific
  license_number?: string;
  license_type?: 'usda' | 'state' | 'custom_exempt';
  certifications?: string[];  // JSONB array
  services_offered?: string[];  // ['beef', 'pork', 'smoking', 'sausage']
  capacity_per_week?: number;
  lead_time_days?: number;

  // Producer-specific
  farm_name?: string;

  // Status
  is_active: boolean;
  settings?: Record<string, any>;
}
```

## The Rules

### 1. Organization Creation Flow

After user signup:

1. Create user record linked to auth.users
2. Prompt user to create or join organization
3. First user becomes `owner` role
4. Organization type determines available features

```typescript
async function createOrganization(
  userId: string,
  input: CreateOrgInput
): Promise<Organization> {
  const org = await supabase
    .from('organizations')
    .insert(input)
    .select()
    .single();

  // Link user as owner
  await supabase
    .from('users')
    .update({
      organization_id: org.id,
      role: 'owner'
    })
    .eq('id', userId);

  return org;
}
```

### 2. User Invitation

Organization owners can invite users:

```typescript
interface Invitation {
  email: string;
  organization_id: string;
  role: 'manager' | 'worker';
  invited_by: string;
  expires_at: Date;
  accepted_at?: Date;
}
```

Flow:
1. Owner sends invitation
2. Email sent with signup/login link
3. User signs up or logs in
4. Invitation auto-applied, user linked to org

### 3. Processor Profile (Public)

Processor profiles are publicly viewable for discovery:

```typescript
// RLS policy allows SELECT on processors for all authenticated users
CREATE POLICY "Users can view processor profiles"
    ON organizations FOR SELECT
    USING (type = 'processor' AND is_active = true);
```

Required fields for processor visibility:
- name
- city, state (for geo search)
- services_offered
- At least one animal type supported

### 4. Producer Profile (Private)

Producer profiles only visible to:
- Members of the same organization
- Processors with active orders from this producer

### 5. Geolocation

For proximity matching:

```sql
-- Find processors within 50 miles
SELECT *,
  ST_Distance(location, ST_Point(-73.9857, 40.7484)::geography) / 1609.34 as miles
FROM organizations
WHERE type = 'processor'
  AND is_active = true
  AND ST_DWithin(location, ST_Point(-73.9857, 40.7484)::geography, 80467)  -- 50 miles in meters
ORDER BY miles;
```

## Role Permissions

| Action | Owner | Manager | Worker |
|--------|-------|---------|--------|
| Edit org profile | Yes | No | No |
| Invite users | Yes | No | No |
| Remove users | Yes | No | No |
| Create orders | Yes | Yes | No |
| View orders | Yes | Yes | Assigned only |
| Update order status | Yes | Yes | Assigned only |
| Manage calendar | Yes | Yes | No |
| Send messages | Yes | Yes | Yes |

## Anti-Patterns

- Never allow user without organization to access dashboard
- Never expose producer contact info publicly
- Never allow role escalation (worker → owner)
- Never delete organizations with active orders
