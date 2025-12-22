-- Migration: Create waitlist_entries table
-- Description: Waitlist for fully booked processor calendar slots

CREATE TABLE waitlist_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    producer_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    processor_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Requested dates
    preferred_date DATE NOT NULL,
    flexible_range_days INTEGER DEFAULT 7, -- How many days +/- they're flexible

    -- Animal info
    animal_type animal_type NOT NULL,
    livestock_id UUID REFERENCES livestock(id) ON DELETE SET NULL,

    -- Status
    is_active BOOLEAN DEFAULT true,
    notified_at TIMESTAMPTZ,
    converted_to_order_id UUID REFERENCES processing_orders(id),

    -- Notes
    notes TEXT
);

-- Indexes
CREATE INDEX idx_waitlist_processor ON waitlist_entries (processor_id, preferred_date);
CREATE INDEX idx_waitlist_producer ON waitlist_entries (producer_id);
CREATE INDEX idx_waitlist_active ON waitlist_entries (is_active, processor_id);
CREATE INDEX idx_waitlist_date_range ON waitlist_entries (processor_id, preferred_date, flexible_range_days)
    WHERE is_active = true;

-- Comments
COMMENT ON TABLE waitlist_entries IS 'Waitlist for when processor slots are fully booked';
COMMENT ON COLUMN waitlist_entries.flexible_range_days IS 'How many days before/after preferred_date the producer is flexible';
