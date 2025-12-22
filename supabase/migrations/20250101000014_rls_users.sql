-- Migration: RLS policies for users table
-- Description: Control access to user profiles

-- Users can view other users in their organization
CREATE POLICY "Users can view users in their organization"
    ON users FOR SELECT
    USING (organization_id = get_user_org_id() OR auth_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE
    USING (auth_id = auth.uid())
    WITH CHECK (auth_id = auth.uid());

-- Allow authenticated users to create their profile (during signup)
CREATE POLICY "Authenticated users can create their profile"
    ON users FOR INSERT
    WITH CHECK (auth_id = auth.uid());

-- Users can view their own profile even without an organization
CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (auth_id = auth.uid());
