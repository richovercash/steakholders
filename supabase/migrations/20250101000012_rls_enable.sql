-- Migration: Enable Row Level Security on all tables
-- Description: Enable RLS and create helper function for organization lookup

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE livestock ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cut_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization ID
-- Uses SECURITY DEFINER to bypass RLS when looking up the user's org
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
    SELECT organization_id FROM users WHERE auth_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function to check if user is authenticated
CREATE OR REPLACE FUNCTION is_authenticated()
RETURNS BOOLEAN AS $$
    SELECT auth.uid() IS NOT NULL
$$ LANGUAGE SQL STABLE;

-- Comments
COMMENT ON FUNCTION get_user_org_id() IS 'Returns the organization_id for the currently authenticated user';
COMMENT ON FUNCTION is_authenticated() IS 'Returns true if a user is authenticated';
