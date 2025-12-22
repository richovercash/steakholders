# Steakholders

> Connecting livestock producers with meat processors

## Project Structure

```
steakholders-landing/
├── public/
│   └── index.html      # Landing page for validation/waitlist
├── supabase-schema.sql # Database schema for Supabase
├── vercel.json         # Vercel deployment config
└── README.md
```

## Quick Start

### 1. Deploy Landing Page to Vercel

**Option A: Via Vercel Dashboard**
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import this repository or drag/drop the folder
3. Deploy (no configuration needed)

**Option B: Via Vercel CLI**
```bash
npm i -g vercel
cd steakholders-landing
vercel
```

Your landing page will be live at `https://your-project.vercel.app`

### 2. Set Up Supabase Database

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor**
3. Copy the contents of `supabase-schema.sql`
4. Run the SQL to create all tables, policies, and indexes

### 3. Connect Waitlist to Supabase (Optional Enhancement)

To store waitlist signups in Supabase instead of localStorage:

1. Create a `waitlist_signups` table:
```sql
CREATE TABLE waitlist_signups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    email VARCHAR(255) UNIQUE NOT NULL,
    user_type VARCHAR(20), -- 'producer' or 'processor'
    source VARCHAR(50) DEFAULT 'landing_page'
);

-- Allow anonymous inserts
ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can sign up for waitlist"
    ON waitlist_signups FOR INSERT
    WITH CHECK (true);
```

2. Update the landing page JavaScript to use Supabase:
```javascript
// Add Supabase client
import { createClient } from '@supabase/supabase-js'
const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_ANON_KEY')

// In form handler:
const { error } = await supabase
    .from('waitlist_signups')
    .insert({ email: email })
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14+ (to be built)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Hosting**: Vercel
- **Email**: Resend (for notifications)

### Database Schema Highlights

- **organizations**: Multi-tenant container for both producers and processors
- **users**: Individual accounts linked to organizations
- **livestock**: Animals tracked from farm through processing
- **processing_orders**: The core entity connecting all parties
- **cut_sheets**: Producer's processing instructions
- **calendar_slots**: Processor availability management
- **messages**: Direct communication between parties

### Row-Level Security

All tables have RLS enabled:
- Users can only access data from their organization
- Processing orders visible to both producer AND processor
- Processor profiles publicly viewable for discovery

## Development Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Authentication & user signup
- [ ] Organization creation flow
- [ ] Producer/processor profile setup
- [ ] Discovery dashboard (find nearby processors)

### Phase 2: Core Workflow (Weeks 3-4)
- [ ] Livestock management (add/edit animals)
- [ ] Calendar & scheduling system
- [ ] Processing order creation

### Phase 3: Cut Sheets & Tracking (Weeks 5-6)
- [ ] Visual cut sheet builder
- [ ] Order progress tracking
- [ ] Email notifications

### Phase 4: Communication & Polish (Weeks 7-8)
- [ ] Messaging system
- [ ] Mobile optimization (PWA)
- [ ] Basic reporting

## Environment Variables

For the full MVP, you'll need:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Resend (for email)
RESEND_API_KEY=your-resend-key

# App
NEXT_PUBLIC_APP_URL=https://steakholders.us
```

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Original PRD](./docs/Product_Requirements_Document.pdf)

## License

Proprietary - Steakholders 2025
