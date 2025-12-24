-- Migration: Enable Realtime for notifications and messages tables
-- Description: Allow real-time subscriptions for live updates

-- Enable Realtime on the notifications table
-- This allows clients to subscribe to INSERT/UPDATE/DELETE events
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Enable Realtime on the messages table for live chat updates
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Note: Realtime respects RLS policies, so users will only receive
-- events for rows they have permission to see.
