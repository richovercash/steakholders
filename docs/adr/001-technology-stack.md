# ADR-001: Technology Stack

## Status

Accepted

## Date

2024-12

## Context

We needed to choose a technology stack for building Steakholders, a B2B platform connecting livestock producers with meat processors. Key requirements:

- Rapid development (small team, MVP focus)
- Real-time capabilities for messaging and notifications
- Strong authentication and authorization
- Server-side rendering for SEO and performance
- Type safety across the stack
- Minimal DevOps overhead

## Decision

### Frontend Framework: Next.js 14 (App Router)

- **React 18** with Server Components for optimal performance
- **App Router** for file-based routing with layouts and loading states
- **TypeScript 5** for end-to-end type safety

### UI Library: Radix UI + Shadcn/ui

- **Radix UI primitives** for accessible, unstyled components
- **Shadcn/ui** for pre-built, customizable component patterns
- **Tailwind CSS** for utility-first styling
- **Lucide React** for consistent iconography

### Backend: Supabase

- **PostgreSQL** database with full SQL capabilities
- **Supabase Auth** for authentication (email/password initially)
- **Row-Level Security (RLS)** for authorization at the database level
- **Realtime subscriptions** for future messaging/notifications
- **Edge Functions** available for custom server logic

### Form Handling

- **React Hook Form** for performant form state management
- **Zod** for runtime schema validation
- **@hookform/resolvers** for Zod integration

### Testing: Playwright

- End-to-end testing with browser automation
- Authentication state persistence for test efficiency
- Cross-browser testing capability

### Hosting: Vercel

- Optimized for Next.js deployments
- Automatic preview deployments
- Edge network for global performance

## Consequences

### Positive

- **Rapid development**: Supabase eliminates need for custom backend
- **Type safety**: TypeScript + Zod + database types provide end-to-end safety
- **Authentication**: Supabase Auth handles complexity (sessions, tokens, refresh)
- **Security**: RLS policies enforce authorization at database level
- **DX**: Hot reload, excellent tooling, strong community
- **Accessibility**: Radix primitives are WCAG-compliant by default
- **Scalability**: PostgreSQL and Vercel scale well

### Negative

- **Vendor lock-in**: Tied to Supabase for database and auth
- **Learning curve**: RLS policies require PostgreSQL knowledge
- **Cost at scale**: Supabase pricing may increase with usage
- **Limited customization**: Supabase Auth has fixed flows

### Neutral

- Next.js App Router is relatively new (stable but evolving patterns)
- Shadcn/ui components are copied into the project (own the code)

## Alternatives Considered

1. **Prisma + Custom API**: More control but slower development, need to build auth
2. **Firebase**: Better realtime but weaker SQL querying, no RLS
3. **tRPC**: Strong typing but adds complexity, Supabase already provides typed client
4. **Remix**: Similar to Next.js but smaller ecosystem, less Vercel optimization
5. **Vue/Nuxt**: Good framework but React has larger ecosystem for our needs

## Related

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Shadcn/ui](https://ui.shadcn.com/)
