-- Migration: RLS policies for messages table
-- Description: Users can view and send messages for their organization

-- Users can view messages sent to or from their organization
CREATE POLICY "Users can view their organization's messages"
    ON messages FOR SELECT
    USING (
        sender_org_id = get_user_org_id()
        OR recipient_org_id = get_user_org_id()
    );

-- Users can send messages from their organization
CREATE POLICY "Users can send messages"
    ON messages FOR INSERT
    WITH CHECK (sender_org_id = get_user_org_id());

-- Users can update messages they sent (e.g., mark as read)
CREATE POLICY "Users can update their organization's messages"
    ON messages FOR UPDATE
    USING (
        sender_org_id = get_user_org_id()
        OR recipient_org_id = get_user_org_id()
    );

-- Messages cannot be deleted (audit trail)
-- No DELETE policy
