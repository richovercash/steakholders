-- Migration: RLS policies for processor_cut_config
-- Description: Access control for processor cut configuration

-- Enable RLS
ALTER TABLE processor_cut_config ENABLE ROW LEVEL SECURITY;

-- Processors can view and manage their own config
CREATE POLICY "Processors can view own cut config"
    ON processor_cut_config FOR SELECT
    USING (
        processor_id IN (
            SELECT organization_id FROM users
            WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "Processors can insert own cut config"
    ON processor_cut_config FOR INSERT
    WITH CHECK (
        processor_id IN (
            SELECT organization_id FROM users
            WHERE auth_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM organizations
            WHERE id = processor_id
            AND type = 'processor'
        )
    );

CREATE POLICY "Processors can update own cut config"
    ON processor_cut_config FOR UPDATE
    USING (
        processor_id IN (
            SELECT organization_id FROM users
            WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "Processors can delete own cut config"
    ON processor_cut_config FOR DELETE
    USING (
        processor_id IN (
            SELECT organization_id FROM users
            WHERE auth_id = auth.uid()
        )
    );

-- Producers can view processor configs (to see what cuts are available)
-- This is needed when building a cut sheet for an order with that processor
CREATE POLICY "Producers can view processor cut configs"
    ON processor_cut_config FOR SELECT
    USING (
        -- User is a producer
        EXISTS (
            SELECT 1 FROM users u
            JOIN organizations o ON u.organization_id = o.id
            WHERE u.auth_id = auth.uid()
            AND o.type = 'producer'
        )
    );

-- Comments
COMMENT ON POLICY "Processors can view own cut config" ON processor_cut_config IS 'Processors can see their own cut configuration';
COMMENT ON POLICY "Producers can view processor cut configs" ON processor_cut_config IS 'Producers need to see processor configs when filling out cut sheets';
