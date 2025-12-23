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

## Next.js & React

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
