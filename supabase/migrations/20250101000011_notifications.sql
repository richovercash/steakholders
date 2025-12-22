-- Migration: Create notifications table
-- Description: User notifications for order updates, messages, etc.

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Content
    type VARCHAR(50) NOT NULL, -- 'order_update', 'message', 'slot_available', etc.
    title VARCHAR(255) NOT NULL,
    body TEXT,

    -- Related entities
    processing_order_id UUID REFERENCES processing_orders(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,

    -- Status
    read_at TIMESTAMPTZ,

    -- Delivery tracking
    email_sent_at TIMESTAMPTZ,
    sms_sent_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_notifications_user ON notifications (user_id, read_at);
CREATE INDEX idx_notifications_created ON notifications (created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id) WHERE read_at IS NULL;

-- Comments
COMMENT ON TABLE notifications IS 'In-app and push notifications for users';
COMMENT ON COLUMN notifications.type IS 'Notification category: order_update, message, slot_available, reminder, etc.';
