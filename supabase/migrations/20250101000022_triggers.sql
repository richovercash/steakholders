-- Migration: Create triggers for automatic timestamps
-- Description: Auto-update updated_at on row changes

-- Generic function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_livestock_updated_at
    BEFORE UPDATE ON livestock
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_slots_updated_at
    BEFORE UPDATE ON calendar_slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processing_orders_updated_at
    BEFORE UPDATE ON processing_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cut_sheets_updated_at
    BEFORE UPDATE ON cut_sheets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to increment booked_count when order is confirmed
CREATE OR REPLACE FUNCTION increment_calendar_booking()
RETURNS TRIGGER AS $$
BEGIN
    -- When order status changes to 'confirmed'
    IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
        UPDATE calendar_slots
        SET booked_count = booked_count + 1
        WHERE id = NEW.calendar_slot_id;
    END IF;

    -- When order is cancelled after being confirmed
    IF NEW.status = 'cancelled' AND OLD.status = 'confirmed' THEN
        UPDATE calendar_slots
        SET booked_count = GREATEST(0, booked_count - 1)
        WHERE id = OLD.calendar_slot_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendar_booking_count
    AFTER UPDATE ON processing_orders
    FOR EACH ROW EXECUTE FUNCTION increment_calendar_booking();

-- Trigger to update livestock status when order status changes
CREATE OR REPLACE FUNCTION update_livestock_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.livestock_id IS NOT NULL THEN
        CASE NEW.status
            WHEN 'confirmed' THEN
                UPDATE livestock SET status = 'scheduled' WHERE id = NEW.livestock_id;
            WHEN 'in_progress' THEN
                UPDATE livestock SET status = 'processing' WHERE id = NEW.livestock_id;
            WHEN 'complete' THEN
                UPDATE livestock SET status = 'complete' WHERE id = NEW.livestock_id;
            ELSE
                NULL;
        END CASE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_livestock_status
    AFTER UPDATE ON processing_orders
    FOR EACH ROW EXECUTE FUNCTION update_livestock_status();
