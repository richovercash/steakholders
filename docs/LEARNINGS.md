# Development Learnings

This document captures key learnings, gotchas, and tips discovered during the development of Steakholders.

---

## Supabase & Database

### RLS Policy Debugging

**Problem**: Users couldn't see data they should have access to.

**Root Cause**: RLS policies were checking `auth.uid()` against `users.id` instead of `users.auth_id`.

**Solution**: Always use `auth.uid()` with the `auth_id` column:
```sql
-- Wrong
WHERE user_id = auth.uid()

-- Right
WHERE auth_id = auth.uid()
-- Or with subquery
WHERE organization_id = (
  SELECT organization_id FROM users WHERE auth_id = auth.uid()
)
```

**Lesson**: Test RLS policies with actual user sessions, not just service role.

---

### RLS Policy Recursion with SECURITY DEFINER Fix

**Problem**: RLS policy on `organizations` table needed to check user's organization type, but querying `organizations` inside the policy caused infinite recursion.

**Root Cause**: When Supabase evaluates an RLS policy, any query to the protected table triggers the policy again, causing a loop.

**Solution**: Use `SECURITY DEFINER` helper functions that bypass RLS:

```sql
-- This function runs as superuser, bypassing RLS
CREATE OR REPLACE FUNCTION get_user_org_type()
RETURNS TEXT AS $$
  SELECT o.type::TEXT
  FROM users u
  JOIN organizations o ON o.id = u.organization_id
  WHERE u.auth_id = auth.uid()
  LIMIT 1
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Now safe to use in RLS policy
CREATE POLICY "Processors can view all organizations"
ON organizations FOR SELECT
USING (get_user_org_type() = 'processor');
```

**Key Points**:
- `SECURITY DEFINER` makes the function run with owner privileges (superuser)
- `STABLE` allows PostgreSQL to cache results within a transaction
- Always use `auth.uid()` to ensure user can only access their own context

**Lesson**: When RLS policies need to check user attributes that involve querying the same table, extract that logic into a SECURITY DEFINER function.

---

### Server Actions for RLS Bypass in Next.js

**Problem**: Client-side Supabase operations were blocked by RLS policies, even when the user should have access.

**Root Cause**: The client-side Supabase client may not properly carry auth context for all operations, especially with Next.js App Router.

**Solution**: Use Server Actions (`'use server'`) which create a fresh authenticated Supabase client:

```typescript
// lib/actions/messages.ts
'use server'

export async function getNewMessages(myOrgId: string, partnerOrgId: string, afterTimestamp: string) {
  const supabase = await createClient() // Server-side client with proper auth
  const { data } = await supabase
    .from('messages')
    .select('*')
    .gt('created_at', afterTimestamp)
  return data
}
```

**Pattern**: Server Component fetches initial data, Client Component calls Server Actions for updates.

**Lesson**: When RLS works in server components but fails in client components, move the data fetching to server actions.

---

### PostgreSQL Enum Type Casting

**Problem**: SQL insert failed with "column 'animal_type' is of type animal_type but expression is of type text"

**Root Cause**: PostgreSQL requires explicit casting when inserting string literals into enum columns.

**Solution**: Cast explicitly:
```sql
-- Wrong
INSERT INTO calendar_slots (animal_type) VALUES ('beef');

-- Right
INSERT INTO calendar_slots (animal_type) VALUES ('beef'::animal_type);

-- Or in dynamic queries
INSERT INTO calendar_slots (animal_type)
SELECT animal::animal_type FROM (VALUES ('beef'), ('pork')) AS t(animal);
```

---

### Email Confirmation vs Development

**Problem**: After signup, users were redirected to login instead of onboarding.

**Root Cause**: Supabase email confirmation was enabled, requiring email verification before session was valid.

**Solution for Development**:
1. Supabase Dashboard → Authentication → Providers → Email
2. Disable "Confirm email"

**Production**: Keep enabled, but handle the "check your email" state in the UI.

---

### Creating Test Users Directly

**Problem**: Needed test accounts for Playwright tests without going through signup flow.

**Solution**: Create users directly in Supabase:

1. Create auth users in Dashboard: Authentication → Users → Add User
2. Run SQL to create organization and user records:

```sql
-- Create organization
INSERT INTO organizations (id, name, type, ...)
VALUES ('uuid-here', 'Test Org', 'producer', ...);

-- Link user to organization
INSERT INTO users (auth_id, email, organization_id, role, ...)
VALUES ('auth-user-uuid', 'test@example.com', 'org-uuid', 'owner', ...);
```

**Tip**: Use service role in SQL Editor to bypass RLS during setup.

---

### Polling vs Supabase Realtime

**Problem**: Supabase Realtime subscriptions weren't receiving updates in the Next.js App Router.

**Root Cause**: Client-side Supabase Realtime requires proper authentication setup which can be tricky with App Router's server-first approach. The subscription would connect but not receive row-level-security-filtered data.

**Solution**: Use polling with Server Actions instead:

```typescript
// Client component
const POLL_INTERVAL = 5000

const lastMessageTimeRef = useRef<string>(lastTimestamp)

const pollForMessages = useCallback(async () => {
  const newMsgs = await getNewMessages(myOrgId, partnerOrgId, lastMessageTimeRef.current)
  if (newMsgs.length > 0) {
    setMessages(prev => {
      const existingIds = new Set(prev.map(m => m.id))
      const uniqueNewMsgs = newMsgs.filter(m => !existingIds.has(m.id))
      if (uniqueNewMsgs.length > 0) {
        lastMessageTimeRef.current = uniqueNewMsgs[uniqueNewMsgs.length - 1].created_at
        return [...prev, ...uniqueNewMsgs]
      }
      return prev
    })
  }
}, [myOrgId, partnerOrgId])

useEffect(() => {
  const intervalId = setInterval(pollForMessages, POLL_INTERVAL)
  return () => clearInterval(intervalId)
}, [pollForMessages])
```

**Key Points**:
- Use `useRef` for timestamps to avoid stale closures
- Deduplicate by ID to handle race conditions
- Server Actions properly authenticate with RLS
- 5 seconds is a good balance between responsiveness and server load

**Lesson**: When Supabase Realtime doesn't work with your auth setup, polling via Server Actions is a reliable alternative.

---

## Next.js & React

### Server + Client Component Pattern for Data + Interactivity

**Problem**: Page needs server-side data fetching (for RLS/auth) but also client-side interactivity (real-time updates, form handling).

**Solution**: Server Component wrapper that fetches data and passes to Client Component:

```typescript
// page.tsx - Server Component
export default async function ConversationPage({ params }: { params: { orgId: string } }) {
  const { orgId } = await params
  const supabase = await createClient()

  // Server-side data fetching (proper RLS context)
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true })

  // Pass data to client component
  return <ConversationClient initialMessages={messages || []} orgId={orgId} />
}

// ConversationClient.tsx - Client Component
'use client'

export default function ConversationClient({ initialMessages, orgId }: Props) {
  const [messages, setMessages] = useState(initialMessages)
  // Now can use hooks, polling, event handlers, etc.
}
```

**Lesson**: When you need both server-side auth/data AND client interactivity, split into Server wrapper + Client child.

---

### Server vs Client Components

**Learning**: Default to Server Components, use Client only when needed.

```typescript
// Server Component (default) - can use async/await directly
export default async function Page() {
  const data = await fetchData()
  return <div>{data}</div>
}

// Client Component - needs 'use client' directive
'use client'
export default function InteractiveWidget() {
  const [state, setState] = useState()
  // ...
}
```

**When to use Client Components**:
- Event handlers (onClick, onChange)
- useState, useEffect, useRef
- Browser-only APIs
- Third-party libraries that use React hooks

---

### Supabase in Server Components

**Pattern**: Create fresh client per request:

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set(name, value, options) { cookieStore.set({ name, value, ...options }) },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  )
}
```

---

### Form Handling Patterns

**Pattern 1: Server Actions (simpler)**
```typescript
async function submitForm(formData: FormData) {
  'use server'
  const name = formData.get('name')
  await supabase.from('table').insert({ name })
  revalidatePath('/path')
}
```

**Pattern 2: React Hook Form + API Route (more control)**
```typescript
const { register, handleSubmit } = useForm()

const onSubmit = async (data) => {
  await fetch('/api/endpoint', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}
```

---

## Playwright Testing

### Authentication State Persistence

**Problem**: Running login for every test is slow.

**Solution**: Use `storageState` to save and restore auth:

```typescript
// auth.setup.ts - runs once before tests
test('authenticate', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type="email"]', process.env.TEST_EMAIL!)
  await page.fill('input[type="password"]', process.env.TEST_PASSWORD!)
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard')
  await page.context().storageState({ path: './playwright/.auth/user.json' })
})

// Other tests reuse auth state
test.use({ storageState: './playwright/.auth/user.json' })
```

---

### Handling Conditional Content

**Problem**: Tests fail when expected elements don't exist (e.g., empty order list).

**Solution**: Use conditional assertions:

```typescript
// Check if element exists before asserting on it
const element = page.locator('text=Some Text')
if (await element.isVisible()) {
  await expect(element).toContainText('Expected')
}

// Or use catch for optional elements
const isVisible = await element.isVisible().catch(() => false)
```

---

### UUID Pattern Matching in Selectors

**Problem**: Test clicked wrong link (`/orders/new` instead of `/orders/[uuid]`).

**Solution**: Use regex to match UUID pattern:

```typescript
const orderLink = page.locator('a[href*="/dashboard/orders/"]:not([href*="/new"])').first()
const href = await orderLink.getAttribute('href')
if (href && href.match(/\/dashboard\/orders\/[a-f0-9-]{36}/)) {
  await orderLink.click()
}
```

---

## UI/UX Patterns

### Role-Based Navigation

```tsx
const isProcessor = organization.type === 'processor'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', show: true },
  { href: '/dashboard/livestock', label: 'Livestock', show: !isProcessor },
  { href: '/dashboard/calendar', label: 'Calendar', show: isProcessor },
  { href: '/dashboard/orders', label: 'Orders', show: true },
  { href: '/dashboard/discover', label: 'Discover', show: !isProcessor },
  { href: '/dashboard/messages', label: 'Messages', show: true },
]

{navItems.filter(item => item.show).map(item => (
  <Link key={item.href} href={item.href}>{item.label}</Link>
))}
```

---

### Loading States

Always show loading state while data fetches:

```tsx
// Server component with Suspense
<Suspense fallback={<LoadingSkeleton />}>
  <DataComponent />
</Suspense>

// Client component
const [loading, setLoading] = useState(true)
const [data, setData] = useState(null)

useEffect(() => {
  fetchData().then(d => {
    setData(d)
    setLoading(false)
  })
}, [])

if (loading) return <Spinner />
```

---

### Toast Notifications

Using Radix Toast for user feedback:

```tsx
import { useToast } from '@/components/ui/use-toast'

function Component() {
  const { toast } = useToast()

  const handleAction = async () => {
    try {
      await doSomething()
      toast({ title: 'Success', description: 'Action completed' })
    } catch (error) {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
    }
  }
}
```

---

## Common Gotchas

### 1. Forgetting `await` in Server Components

```typescript
// Wrong - returns Promise, not data
export default function Page() {
  const data = supabase.from('table').select()
  return <div>{data}</div> // Renders [object Promise]
}

// Right
export default async function Page() {
  const { data } = await supabase.from('table').select()
  return <div>{JSON.stringify(data)}</div>
}
```

### 2. Using hooks in Server Components

```typescript
// Wrong - will throw error
export default async function Page() {
  const [state, setState] = useState() // ERROR: hooks not allowed
}

// Right - move to client component
'use client'
export default function InteractivePart() {
  const [state, setState] = useState()
}
```

### 3. Mutating data without revalidating

```typescript
// Wrong - UI won't update
async function deleteItem(id: string) {
  'use server'
  await supabase.from('items').delete().eq('id', id)
}

// Right - revalidate to refresh UI
async function deleteItem(id: string) {
  'use server'
  await supabase.from('items').delete().eq('id', id)
  revalidatePath('/items')
}
```

### 4. Environment variables in client code

```typescript
// Wrong - server-only env var not available
const apiKey = process.env.SECRET_KEY // undefined in browser

// Right - use NEXT_PUBLIC_ prefix for client-side
const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL // works
```

---

## Performance Tips

1. **Use `select()` to limit columns**: Only fetch what you need
2. **Avoid N+1 queries**: Use joins or `select('*, related(*)')`
3. **Add database indexes**: On frequently queried columns
4. **Use `revalidatePath` strategically**: Don't over-invalidate cache
5. **Lazy load heavy components**: Use `dynamic()` with `ssr: false`

---

## Security Checklist

- [ ] RLS enabled on all tables
- [ ] Service role key only used server-side
- [ ] User input validated with Zod
- [ ] No secrets in client-side code
- [ ] HTTPS enforced in production
- [ ] Auth tokens in HTTP-only cookies
