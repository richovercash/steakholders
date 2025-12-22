-- Migration: Create calendar_slots table
-- Description: Processor availability management

CREATE TABLE calendar_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    processor_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Slot details
    date DATE NOT NULL,
    animal_type animal_type NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 1, -- How many animals can be processed
    booked_count INTEGER DEFAULT 0,

    -- Pricing (optional)
    kill_fee DECIMAL(10, 2),

    -- Status
    is_available BOOLEAN DEFAULT true,
    notes TEXT,

    -- Ensure unique slots per processor/date/animal type
    UNIQUE(processor_id, date, animal_type)
);

-- Indexes
CREATE INDEX idx_calendar_slots_processor ON calendar_slots (processor_id);
CREATE INDEX idx_calendar_slots_date ON calendar_slots (date);
CREATE INDEX idx_calendar_slots_availability ON calendar_slots (processor_id, date, is_available);
-- Note: Can't use CURRENT_DATE in partial index (not immutable). Query optimizer will use idx_calendar_slots_date instead.

-- Comments
COMMENT ON TABLE calendar_slots IS 'Processor scheduling availability by date and animal type';
COMMENT ON COLUMN calendar_slots.capacity IS 'Maximum number of animals that can be processed on this date';
COMMENT ON COLUMN calendar_slots.booked_count IS 'Current number of confirmed bookings';
