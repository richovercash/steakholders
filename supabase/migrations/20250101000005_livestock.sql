-- Migration: Create livestock table
-- Description: Animals tracked from farm through processing

CREATE TABLE livestock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ownership
    producer_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Animal info
    animal_type animal_type NOT NULL,
    tag_number VARCHAR(50),
    name VARCHAR(100), -- Some farmers name their animals
    breed VARCHAR(100),

    -- Physical attributes
    estimated_live_weight INTEGER, -- in lbs
    birth_date DATE,
    sex VARCHAR(10), -- 'male', 'female', 'steer', 'heifer'

    -- Status tracking
    status livestock_status DEFAULT 'on_farm',

    -- Notes
    notes TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_livestock_producer ON livestock (producer_id);
CREATE INDEX idx_livestock_status ON livestock (status);
CREATE INDEX idx_livestock_type ON livestock (animal_type);
CREATE INDEX idx_livestock_tag ON livestock (producer_id, tag_number);

-- Comments
COMMENT ON TABLE livestock IS 'Animals owned by producers, tracked through processing lifecycle';
COMMENT ON COLUMN livestock.tag_number IS 'Farm-assigned tag or ear tag number';
COMMENT ON COLUMN livestock.estimated_live_weight IS 'Estimated weight in pounds';
