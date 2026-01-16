---
id: auth_flow_v1
version: 1
domain: auth
status: active
---

# Authentication Flow Protocol

## Purpose

Define the authentication and authorization flow for Steakholders using Supabase Auth.

## The Rules

### 1. Authentication Method

- Use Supabase Auth with email/password for MVP
- Magic link support planned for processor floor workers
- All auth state managed through Supabase client

### 2. Session Management

```typescript
// Server-side session check
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

const supabase = createServerComponentClient({ cookies })
const { data: { session } } = await supabase.auth.getSession()
```

### 3. Protected Routes

All routes under `/(dashboard)/*` require authentication:

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const supabase = createMiddlewareClient({ req: request, res })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
```

### 4. Organization Context

After authentication, user must be linked to an organization:

1. Check `users.organization_id`
2. If null, redirect to organization setup flow
3. Store org context in React context for client components

### 5. Role-Based Access

Roles: `owner`, `manager`, `worker`

- **owner**: Full access, can invite/remove users, manage org settings
- **manager**: Can create orders, manage livestock, update schedules
- **worker**: Can view and update assigned orders only

## Anti-Patterns

- Never store session tokens in localStorage manually
- Never expose service role key to client
- Never skip middleware for protected routes
- Never assume organization context without checking
