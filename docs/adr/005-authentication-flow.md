# ADR-005: Authentication & Onboarding Flow

## Status

Accepted

## Date

2024-12

## Context

New users to Steakholders need to:
1. Create an account (authentication)
2. Set up their organization (producer or processor)
3. Configure organization-specific settings
4. Be directed to the appropriate dashboard

This flow has several challenges:
- Two distinct user types with different setup requirements
- Organization must be created before user can access protected routes
- User record in our database must link to Supabase Auth user
- Email confirmation may or may not be required (configurable)

## Decision

### Two-Step Onboarding Flow

```
/signup → Supabase Auth user created
    ↓
/onboarding (step 1) → Select organization type
    ↓
/onboarding (step 2) → Enter organization details
    ↓
Organization + User records created
    ↓
/dashboard → Role-appropriate view
```

### Authentication: Supabase Auth

- Email/password authentication (initial implementation)
- Session managed via HTTP-only cookies using `@supabase/ssr`
- Middleware checks authentication state on protected routes

### User/Organization Creation

On onboarding completion:
1. Create organization with type and details
2. Create user record linking `auth.uid()` to organization
3. Set user role to 'owner' (first user of org)

```typescript
// Onboarding submission
const { data: org } = await supabase
  .from('organizations')
  .insert({
    name: formData.organizationName,
    type: formData.type, // 'producer' | 'processor'
    // ... other fields
  })
  .select()
  .single()

await supabase
  .from('users')
  .insert({
    auth_id: session.user.id,
    email: session.user.email,
    full_name: formData.fullName,
    organization_id: org.id,
    role: 'owner'
  })
```

### Route Protection

#### Middleware (`middleware.ts`)

```typescript
export async function middleware(request: NextRequest) {
  const supabase = createServerClient(...)
  const { data: { session } } = await supabase.auth.getSession()

  // Redirect unauthenticated users from protected routes
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users from auth pages
  if (session && ['/login', '/signup'].includes(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
}
```

#### Onboarding Check (Dashboard Layout)

```typescript
// Check if user has completed onboarding
const { data: user } = await supabase
  .from('users')
  .select('organization_id')
  .eq('auth_id', session.user.id)
  .single()

if (!user?.organization_id) {
  redirect('/onboarding')
}
```

### Session Management

Using `@supabase/ssr` for cookie-based sessions:

```typescript
// Server component
import { createServerClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  // ...
}

// Client component
import { createBrowserClient } from '@/lib/supabase/client'

export function Component() {
  const supabase = createBrowserClient()
  // ...
}
```

### Email Confirmation

- Configurable in Supabase Dashboard
- When enabled: user must click email link before accessing app
- When disabled: user proceeds directly to onboarding after signup

## Consequences

### Positive

- **Clear separation**: Auth (Supabase) vs app data (users table)
- **Flexible**: Can add OAuth providers later without changing onboarding
- **Secure**: Session cookies are HTTP-only, managed by Supabase
- **Type-safe**: User type is known after onboarding, drives UI

### Negative

- **Two-step onboarding**: More friction than single form
- **Redirect complexity**: Multiple redirect scenarios to handle
- **Orphan auth users**: If user abandons onboarding, auth user exists but no org
- **Email confirmation UX**: When enabled, adds friction

### Neutral

- First user of org is always 'owner' - simple but may need admin override later
- Organization type chosen early, affects all subsequent flow

## Implementation Notes

### Handling Orphaned Auth Users

Users who sign up but don't complete onboarding:
- Remain in Supabase Auth
- Have no users table record
- Onboarding check redirects them back to /onboarding

### Login Flow

```
/login → Enter credentials
    ↓
Supabase Auth validates
    ↓
Check users table for organization_id
    ↓
If no org: /onboarding
If has org: /dashboard
```

### Signout

```typescript
await supabase.auth.signOut()
// Supabase clears session cookies
redirect('/login')
```

## Alternatives Considered

1. **Single-Step Registration**: Combine signup + org creation - complex form, poor UX
2. **Magic Link Only**: Simpler but users expect password option
3. **OAuth First**: Good UX but more Supabase config, may not suit B2B users
4. **Self-Hosted Auth**: Full control but significant development effort
5. **No Onboarding**: Require org code/invite - limits organic signup

## Learnings

1. **Email confirmation toggle**: Keep disabled for development/testing, enable for production
2. **RLS during onboarding**: User creates org before user record exists - needs careful policy design
3. **Cookie debugging**: Use browser dev tools to verify session cookies are set correctly
4. **Redirect loops**: Carefully handle all auth state combinations to avoid loops

## Related

- [ADR-001: Technology Stack](./001-technology-stack.md) (Supabase Auth choice)
- [ADR-002: Dual-Role Architecture](./002-dual-role-architecture.md) (organization type selection)
- [ADR-003: Database Design](./003-database-design-rls.md) (users/organizations tables)
