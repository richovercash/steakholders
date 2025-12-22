-- Migration: RLS policies for processing_orders table
-- Description: Both producers and processors can access their orders

-- Producers can view their orders
CREATE POLICY "Producers can view their orders"
    ON processing_orders FOR SELECT
    USING (producer_id = get_user_org_id());

-- Processors can view orders assigned to them
CREATE POLICY "Processors can view their orders"
    ON processing_orders FOR SELECT
    USING (processor_id = get_user_org_id());

-- Producers can create orders
CREATE POLICY "Producers can create orders"
    ON processing_orders FOR INSERT
    WITH CHECK (producer_id = get_user_org_id());

-- Producers can update their draft orders
CREATE POLICY "Producers can update their orders"
    ON processing_orders FOR UPDATE
    USING (producer_id = get_user_org_id())
    WITH CHECK (producer_id = get_user_org_id());

-- Processors can update orders assigned to them
CREATE POLICY "Processors can update their orders"
    ON processing_orders FOR UPDATE
    USING (processor_id = get_user_org_id())
    WITH CHECK (processor_id = get_user_org_id());

-- Producers can delete their draft orders
CREATE POLICY "Producers can delete draft orders"
    ON processing_orders FOR DELETE
    USING (producer_id = get_user_org_id() AND status = 'draft');
