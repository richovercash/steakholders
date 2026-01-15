-- Migration: RLS policies for organizations table
-- Description: Control access to organization data

-- Users can view their own organization
CREATE POLICY "Users can view their own organization"
    ON organizations FOR SELECT
    USING (id = get_user_org_id());

-- Users can view active processor profiles (for discovery)
CREATE POLICY "Anyone can view active processor profiles"
    ON organizations FOR SELECT
    USING (type = 'processor' AND is_active = true);

-- Owners can update their organization
CREATE POLICY "Owners can update their organization"
    ON organizations FOR UPDATE
    USING (id = get_user_org_id())
    WITH CHECK (id = get_user_org_id());

-- Allow authenticated users to create organizations (during onboarding)
CREATE POLICY "Authenticated users can create organizations"
    ON organizations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Note: DELETE is not allowed through RLS - use admin/service role
