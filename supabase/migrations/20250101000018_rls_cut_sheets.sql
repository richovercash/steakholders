-- Migration: RLS policies for cut_sheets table
-- Description: Access follows order access, plus template management

-- Users can view cut sheets for their orders
CREATE POLICY "Users can view cut sheets for their orders"
    ON cut_sheets FOR SELECT
    USING (
        -- Linked to an order they have access to
        processing_order_id IN (
            SELECT id FROM processing_orders
            WHERE producer_id = get_user_org_id() OR processor_id = get_user_org_id()
        )
        -- Or it's their own template
        OR (is_template = true AND producer_id = get_user_org_id())
    );

-- Producers can create cut sheets
CREATE POLICY "Producers can create cut sheets"
    ON cut_sheets FOR INSERT
    WITH CHECK (
        -- For an order they own
        processing_order_id IN (
            SELECT id FROM processing_orders WHERE producer_id = get_user_org_id()
        )
        -- Or creating their own template
        OR (is_template = true AND producer_id = get_user_org_id())
    );

-- Producers can update their cut sheets
CREATE POLICY "Producers can update their cut sheets"
    ON cut_sheets FOR UPDATE
    USING (
        processing_order_id IN (
            SELECT id FROM processing_orders WHERE producer_id = get_user_org_id()
        )
        OR (is_template = true AND producer_id = get_user_org_id())
    )
    WITH CHECK (
        processing_order_id IN (
            SELECT id FROM processing_orders WHERE producer_id = get_user_org_id()
        )
        OR (is_template = true AND producer_id = get_user_org_id())
    );

-- Producers can delete their templates
CREATE POLICY "Producers can delete their templates"
    ON cut_sheets FOR DELETE
    USING (is_template = true AND producer_id = get_user_org_id());
