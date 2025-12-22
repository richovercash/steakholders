# Supabase Migrations

These SQL migrations set up the Steakholders database schema in Supabase.

## Running Migrations

### Option 1: Supabase Dashboard (Recommended for manual setup)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run each migration file **in order** (by filename number)
4. Wait for each to complete before running the next

### Option 2: Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### Option 3: Run All at Once

If you want to run all migrations at once, you can concatenate them:

```bash
cat 20250101*.sql > full_schema.sql
```

Then run `full_schema.sql` in the SQL Editor.

## Migration Order

| # | File | Description |
|---|------|-------------|
| 01 | `extensions.sql` | Enable uuid-ossp and postgis extensions |
| 02 | `enums.sql` | Create custom enum types |
| 03 | `organizations.sql` | Organizations table (producers & processors) |
| 04 | `users.sql` | User profiles linked to auth |
| 05 | `livestock.sql` | Animals tracked by producers |
| 06 | `calendar_slots.sql` | Processor availability |
| 07 | `processing_orders.sql` | Core order entity |
| 08 | `cut_sheets.sql` | Processing instructions |
| 09 | `messages.sql` | Direct messaging |
| 10 | `waitlist.sql` | Waitlist for booked slots |
| 11 | `notifications.sql` | User notifications |
| 12 | `rls_enable.sql` | Enable RLS + helper functions |
| 13-21 | `rls_*.sql` | RLS policies per table |
| 22 | `triggers.sql` | Auto-update triggers |
| 23 | `views.sql` | Helpful aggregate views |
| 24 | `seed_data.sql` | Optional sample data |

## PostGIS Note

If you don't need geolocation features, you can:
1. Skip or comment out the postgis extension in `01_extensions.sql`
2. Remove the `location` column from `03_organizations.sql`
3. Remove the `idx_organizations_location` index

## After Running Migrations

1. **Update environment variables** in your Next.js app:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

2. **Generate TypeScript types** (optional but recommended):
   ```bash
   supabase gen types typescript --project-id your-project-id > types/supabase.ts
   ```

## Troubleshooting

### "type already exists" error
If you're re-running migrations, you may need to drop existing types:
```sql
DROP TYPE IF EXISTS organization_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
-- etc.
```

### RLS blocking all access
Check that users have the correct `auth_id` linked to their Supabase Auth user.

### Views not working
Views inherit the permissions of the tables they query. Make sure RLS policies are in place first.
