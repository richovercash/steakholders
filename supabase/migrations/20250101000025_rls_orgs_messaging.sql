-- Migration: Add RLS policy for processors to view producers (for messaging)
-- Description: Allow processors to view producer organizations for messaging purposes

-- First, drop the old policies if they exist
DROP POLICY IF EXISTS "Processors can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view orgs they have messaged with" ON organizations;

-- Create a helper function to get user's organization type (avoids RLS recursion)
CREATE OR REPLACE FUNCTION get_user_org_type()
RETURNS TEXT AS $$
    SELECT o.type::TEXT
    FROM users u
    JOIN organizations o ON o.id = u.organization_id
    WHERE u.auth_id = auth.uid()
    LIMIT 1
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Processors can view all organizations (for messaging)
CREATE POLICY "Processors can view all organizations"
    ON organizations FOR SELECT
    USING (get_user_org_type() = 'processor');

-- Also allow users to view organizations they have messages with
CREATE POLICY "Users can view orgs they have messaged with"
    ON organizations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM messages m
            WHERE (m.sender_org_id = get_user_org_id() AND m.recipient_org_id = organizations.id)
               OR (m.recipient_org_id = get_user_org_id() AND m.sender_org_id = organizations.id)
        )
    );
