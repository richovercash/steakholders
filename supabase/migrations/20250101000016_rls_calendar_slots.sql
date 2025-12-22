-- Migration: RLS policies for calendar_slots table
-- Description: Processors manage their calendar, producers can view available slots

-- Processors can view their own calendar
CREATE POLICY "Processors can view their calendar"
    ON calendar_slots FOR SELECT
    USING (processor_id = get_user_org_id());

-- Processors can create slots
CREATE POLICY "Processors can create calendar slots"
    ON calendar_slots FOR INSERT
    WITH CHECK (processor_id = get_user_org_id());

-- Processors can update their slots
CREATE POLICY "Processors can update their calendar slots"
    ON calendar_slots FOR UPDATE
    USING (processor_id = get_user_org_id())
    WITH CHECK (processor_id = get_user_org_id());

-- Processors can delete their slots
CREATE POLICY "Processors can delete their calendar slots"
    ON calendar_slots FOR DELETE
    USING (processor_id = get_user_org_id());

-- Producers can view available slots from any processor
CREATE POLICY "Producers can view available calendar slots"
    ON calendar_slots FOR SELECT
    USING (is_available = true AND date >= CURRENT_DATE);
