-- Migration: Create processing_orders table
-- Description: Core entity connecting producers, processors, and livestock

CREATE TABLE processing_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Reference number (human-readable)
    order_number SERIAL,

    -- Parties involved
    producer_id UUID NOT NULL REFERENCES organizations(id),
    processor_id UUID NOT NULL REFERENCES organizations(id),
    livestock_id UUID REFERENCES livestock(id) ON DELETE SET NULL,
    calendar_slot_id UUID REFERENCES calendar_slots(id) ON DELETE SET NULL,

    -- Status
    status order_status DEFAULT 'draft',
    processing_stage processing_stage DEFAULT 'pending',

    -- Dates
    scheduled_drop_off TIMESTAMPTZ,
    actual_drop_off TIMESTAMPTZ,
    estimated_ready_date DATE,
    actual_ready_date DATE,
    pickup_date TIMESTAMPTZ,

    -- Weights (in lbs)
    live_weight INTEGER,
    hanging_weight INTEGER,
    final_weight INTEGER,

    -- Pricing
    kill_fee DECIMAL(10, 2),
    processing_fee DECIMAL(10, 2),
    storage_fee DECIMAL(10, 2),
    additional_charges JSONB DEFAULT '[]'::jsonb,
    total_amount DECIMAL(10, 2),

    -- Notes
    producer_notes TEXT,
    processor_notes TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_processing_orders_producer ON processing_orders (producer_id);
CREATE INDEX idx_processing_orders_processor ON processing_orders (processor_id);
CREATE INDEX idx_processing_orders_status ON processing_orders (status);
CREATE INDEX idx_processing_orders_stage ON processing_orders (processing_stage);
CREATE INDEX idx_processing_orders_number ON processing_orders (order_number);
CREATE INDEX idx_processing_orders_active ON processing_orders (status)
    WHERE status NOT IN ('complete', 'cancelled');

-- Comments
COMMENT ON TABLE processing_orders IS 'Core order entity connecting producers, processors, livestock, and cut sheets';
COMMENT ON COLUMN processing_orders.order_number IS 'Auto-incrementing human-readable order number';
COMMENT ON COLUMN processing_orders.additional_charges IS 'Array of {name, amount, notes} for extra fees';
