-- Migration: RLS policies for waitlist_entries table
-- Description: Producers manage their waitlist entries, processors can view

-- Producers can view their waitlist entries
CREATE POLICY "Producers can view their waitlist entries"
    ON waitlist_entries FOR SELECT
    USING (producer_id = get_user_org_id());

-- Producers can create waitlist entries
CREATE POLICY "Producers can create waitlist entries"
    ON waitlist_entries FOR INSERT
    WITH CHECK (producer_id = get_user_org_id());

-- Producers can update their waitlist entries
CREATE POLICY "Producers can update their waitlist entries"
    ON waitlist_entries FOR UPDATE
    USING (producer_id = get_user_org_id())
    WITH CHECK (producer_id = get_user_org_id());

-- Producers can delete their waitlist entries
CREATE POLICY "Producers can delete their waitlist entries"
    ON waitlist_entries FOR DELETE
    USING (producer_id = get_user_org_id());

-- Processors can view waitlist entries for their slots
CREATE POLICY "Processors can view waitlist for their slots"
    ON waitlist_entries FOR SELECT
    USING (processor_id = get_user_org_id());
