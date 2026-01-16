---
id: ADR-001
title: Initial Technology Stack Selection
status: accepted
date: 2025-12-21
decision_makers: [Steakholders Team]
domain: organizations
---

# ADR-001: Initial Technology Stack Selection

## Context

Steakholders is a B2B platform connecting livestock producers with meat processors. We need to select a technology stack that:

1. Enables rapid MVP development
2. Minimizes infrastructure costs at launch
3. Scales with business growth
4. Provides excellent developer experience

## Decision

We will use the following technology stack:

### Frontend
- **Next.js 14+** with App Router for React framework
- **TypeScript** for type safety
- **Tailwind CSS** with shadcn/ui for styling

### Backend & Infrastructure
- **Supabase** for database, authentication, and real-time
- **Vercel** for hosting and CI/CD
- **Resend** for transactional email

### Database
- **PostgreSQL** (via Supabase) with Row-Level Security
- **PostGIS** extension for geolocation features

## Rationale

### Why Next.js + Supabase + Vercel

1. **Integrated Ecosystem**: Next.js on Vercel with Supabase provides seamless integration with minimal configuration
2. **Cost Effective**: All services have generous free tiers suitable for MVP
3. **Full-Stack TypeScript**: Type safety from database to frontend with generated types
4. **Real-Time Built-In**: Supabase provides WebSocket-based real-time subscriptions
5. **Authentication Handled**: Supabase Auth eliminates custom auth implementation
6. **RLS for Multi-Tenancy**: Row-Level Security provides database-level tenant isolation

### Why Not Alternatives

- **Firebase**: Less SQL flexibility, vendor lock-in concerns
- **Prisma + Custom API**: More setup, additional infrastructure
- **AWS/GCP**: Higher complexity and cost for MVP stage

## Consequences

### Positive
- Fast development velocity
- Low operational overhead
- Built-in security features (RLS, Auth)
- Zero-config deployments

### Negative
- Supabase platform dependency
- PostgreSQL-specific features may limit future migrations
- Vercel pricing at scale may require re-evaluation

### Risks
- Supabase is younger than Firebase; fewer community resources
- Edge function cold starts may affect API latency

## Related

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Steakholders Technical Architecture](../Steakholders_Technical_Architecture.docx)
