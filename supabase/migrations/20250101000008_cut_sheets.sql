-- Migration: Create cut_sheets table
-- Description: Processing instructions for how to cut the animal

CREATE TABLE cut_sheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Link to order (or standalone template)
    processing_order_id UUID REFERENCES processing_orders(id) ON DELETE CASCADE,

    -- Template info (for reusable cut sheets)
    is_template BOOLEAN DEFAULT false,
    template_name VARCHAR(255),
    producer_id UUID REFERENCES organizations(id), -- Owner of template

    -- Animal type this applies to
    animal_type animal_type NOT NULL,

    -- The actual cuts specification
    -- Structure: { "primal": { "cut_name": { "quantity": 2, "thickness": "1in", "notes": "" } } }
    cuts JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Special instructions
    special_instructions TEXT,

    -- Ground meat preferences
    ground_meat_preferences JSONB DEFAULT '{}'::jsonb,

    -- Organ meats
    keep_organs JSONB DEFAULT '{"heart": false, "liver": false, "tongue": false}'::jsonb,

    -- Bones
    keep_bones BOOLEAN DEFAULT false,
    bone_preferences JSONB DEFAULT '{}'::jsonb,

    -- Validation
    is_complete BOOLEAN DEFAULT false,
    validation_errors JSONB DEFAULT '[]'::jsonb
);

-- Indexes
CREATE INDEX idx_cut_sheets_order ON cut_sheets (processing_order_id);
CREATE INDEX idx_cut_sheets_producer ON cut_sheets (producer_id);
CREATE INDEX idx_cut_sheets_template ON cut_sheets (is_template, producer_id);
CREATE INDEX idx_cut_sheets_animal_type ON cut_sheets (animal_type);

-- Comments
COMMENT ON TABLE cut_sheets IS 'Processing instructions defining how the animal should be cut';
COMMENT ON COLUMN cut_sheets.cuts IS 'JSON structure defining cuts by primal section';
COMMENT ON COLUMN cut_sheets.is_template IS 'If true, this is a reusable template, not tied to a specific order';
