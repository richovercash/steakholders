-- Migration: RLS policies for livestock table
-- Description: Producers can manage their own livestock

-- Producers can view their own livestock
CREATE POLICY "Producers can view their livestock"
    ON livestock FOR SELECT
    USING (producer_id = get_user_org_id());

-- Producers can insert their own livestock
CREATE POLICY "Producers can create livestock"
    ON livestock FOR INSERT
    WITH CHECK (producer_id = get_user_org_id());

-- Producers can update their own livestock
CREATE POLICY "Producers can update their livestock"
    ON livestock FOR UPDATE
    USING (producer_id = get_user_org_id())
    WITH CHECK (producer_id = get_user_org_id());

-- Producers can delete their own livestock
CREATE POLICY "Producers can delete their livestock"
    ON livestock FOR DELETE
    USING (producer_id = get_user_org_id());

-- Processors can view livestock linked to their orders
CREATE POLICY "Processors can view livestock in their orders"
    ON livestock FOR SELECT
    USING (
        id IN (
            SELECT livestock_id FROM processing_orders
            WHERE processor_id = get_user_org_id()
        )
    );
