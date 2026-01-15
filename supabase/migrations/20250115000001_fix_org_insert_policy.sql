-- Migration: Fix organization INSERT policy
-- Description: Use auth.uid() directly instead of is_authenticated() function

-- Drop the existing policy
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;

-- Recreate with direct auth.uid() check (more reliable)
CREATE POLICY "Authenticated users can create organizations"
    ON organizations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
