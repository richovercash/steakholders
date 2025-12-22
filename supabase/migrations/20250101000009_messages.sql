-- Migration: Create messages table
-- Description: Direct communication between producers and processors

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Sender
    sender_id UUID NOT NULL REFERENCES users(id),
    sender_org_id UUID NOT NULL REFERENCES organizations(id),

    -- Recipient (organization level)
    recipient_org_id UUID NOT NULL REFERENCES organizations(id),

    -- Optional context
    processing_order_id UUID REFERENCES processing_orders(id) ON DELETE SET NULL,

    -- Content
    content TEXT NOT NULL,

    -- Status
    read_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_messages_sender ON messages (sender_org_id);
CREATE INDEX idx_messages_recipient ON messages (recipient_org_id);
CREATE INDEX idx_messages_order ON messages (processing_order_id);
CREATE INDEX idx_messages_created ON messages (created_at DESC);
CREATE INDEX idx_messages_unread ON messages (recipient_org_id, read_at) WHERE read_at IS NULL;

-- Comments
COMMENT ON TABLE messages IS 'Direct messaging between organizations';
COMMENT ON COLUMN messages.processing_order_id IS 'Optional link to a specific order for context';
