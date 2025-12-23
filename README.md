# Steakholders

> Connecting livestock producers with meat processors

A B2B platform that streamlines the process of booking custom meat processing, managing cut sheets, and tracking orders from farm to freezer.

## Quick Links

- [Architecture Decision Records](./docs/adr/README.md)
- [Development Learnings](./docs/LEARNINGS.md)
- [Technical Architecture](./Steakholders_Technical_Architecture.docx)

## Project Structure

```
steakholders/
├── app/                    # Next.js 14 application
│   ├── src/
│   │   ├── app/           # App Router pages
│   │   ├── components/    # React components
│   │   ├── lib/           # Utilities & Supabase clients
│   │   └── types/         # TypeScript types
│   ├── tests/             # Playwright E2E tests
│   └── playwright/        # Test configuration & auth state
├── docs/
│   ├── adr/               # Architecture Decision Records
│   └── LEARNINGS.md       # Development tips & gotchas
├── supabase/
│   └── migrations/        # Database migrations
└── supabase-schema.sql    # Full database schema
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript |
| UI | Radix UI, Shadcn/ui, Tailwind CSS |
| Backend | Supabase (PostgreSQL, Auth, Realtime) |
| Forms | React Hook Form, Zod |
| Testing | Playwright |
| Hosting | Vercel |

## Features

### Producer Features
- Livestock management (add, track, schedule animals)
- Discover and browse processors
- Create processing orders
- Build detailed cut sheets
- Message processors
- Track order status

### Processor Features
- Calendar availability management
- View and manage incoming orders
- Update processing stages
- View cut sheet specifications
- Message producers
- Track order completion

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### 1. Clone and Install

```bash
cd steakholders/app
npm install
```

### 2. Environment Setup

Create `.env.local` in the `app` directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run `supabase-schema.sql` to create tables and policies
4. Or run migrations from `supabase/migrations/` in order

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Testing

### Setup Test Accounts

Create test users in Supabase Authentication, then run SQL to link them to organizations. See [LEARNINGS.md](./docs/LEARNINGS.md) for details.

### Run Tests

```bash
# Set test credentials
export TEST_PRODUCER_EMAIL='your-producer@test.com'
export TEST_PRODUCER_PASSWORD='password'
export TEST_PROCESSOR_EMAIL='your-processor@test.com'
export TEST_PROCESSOR_PASSWORD='password'

# Run all tests
npm run test

# Run with UI
npm run test:ui

# Run headed (visible browser)
npm run test:headed
```

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| organizations | Producers and processors (multi-tenant) |
| users | Individual accounts linked to organizations |
| livestock | Producer's animals |
| calendar_slots | Processor availability |
| processing_orders | Orders linking producer to processor |
| cut_sheets | Processing instructions |
| messages | Organization-to-organization messaging |
| notifications | User notifications |

### Key Relationships

```
Organization (Producer)
    ├── Users (team members)
    ├── Livestock (animals)
    └── Processing Orders
            ├── Cut Sheets
            └── Messages

Organization (Processor)
    ├── Users (team members)
    ├── Calendar Slots
    └── Processing Orders (received)
            ├── Cut Sheets (view)
            └── Messages
```

## Architecture Decisions

Key architectural decisions are documented in [docs/adr/](./docs/adr/):

- [ADR-001: Technology Stack](./docs/adr/001-technology-stack.md)
- [ADR-002: Dual-Role Architecture](./docs/adr/002-dual-role-architecture.md)
- [ADR-003: Database Design & RLS](./docs/adr/003-database-design-rls.md)
- [ADR-004: Cut Sheet Architecture](./docs/adr/004-cut-sheet-architecture.md)
- [ADR-005: Authentication Flow](./docs/adr/005-authentication-flow.md)
- [ADR-006: Messaging System](./docs/adr/006-messaging-system.md)

## Development Roadmap

### Completed
- [x] Authentication & onboarding
- [x] Dual-role dashboard (producer/processor)
- [x] Livestock management
- [x] Processor discovery
- [x] Calendar & availability
- [x] Order creation & tracking
- [x] Cut sheet builder
- [x] Messaging system

### Planned
- [ ] Notification system (email/push)
- [ ] Waitlist management
- [ ] Payment integration
- [ ] Reporting & analytics
- [ ] Mobile optimization

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only) | For admin |
| `RESEND_API_KEY` | Email service API key | For notifications |

## Contributing

1. Read the [ADRs](./docs/adr/) to understand architectural decisions
2. Check [LEARNINGS.md](./docs/LEARNINGS.md) for development tips
3. Run tests before submitting changes
4. Follow existing code patterns

## License

Proprietary - Steakholders 2025
