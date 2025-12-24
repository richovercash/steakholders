-- Migration: Create processor_cut_config table
-- Description: Allows processors to configure which cuts they offer

-- Processor cut configuration
-- Stores which cuts, primals, and options each processor supports
CREATE TABLE processor_cut_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Which processor this config belongs to
    processor_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Which animal types they process
    -- If null/empty, use services_offered from organizations
    enabled_animals animal_type[] DEFAULT ARRAY['beef', 'pork', 'lamb', 'goat']::animal_type[],

    -- Disabled cuts (by cut ID from schema)
    -- Example: ['corned_beef', 'picanha', 'lamb_lollipops']
    disabled_cuts TEXT[] DEFAULT '{}',

    -- Disabled sausage flavors
    -- Example: ['chorizo', 'bratwurst']
    disabled_sausage_flavors TEXT[] DEFAULT '{}',

    -- Custom cuts this processor offers (beyond the standard schema)
    -- Example: [{"id": "custom_jerky", "name": "Beef Jerky", "primal": "round", "type": "cured", "additionalFee": true}]
    custom_cuts JSONB DEFAULT '[]'::jsonb,

    -- Default templates offered by this processor
    -- Example: [{"id": "family_pack", "name": "Family Pack", "description": "Standard family-friendly selection"}]
    default_templates JSONB DEFAULT '[]'::jsonb,

    -- Processing fees by type (optional pricing layer for future)
    -- Example: {"curing": 0.50, "smoking": 0.75, "sausage": 0.25}
    processing_fees JSONB DEFAULT '{}'::jsonb,

    -- Minimum/maximum hanging weight requirements
    min_hanging_weight INTEGER, -- in lbs
    max_hanging_weight INTEGER, -- in lbs

    -- Notes shown to producers when filling out cut sheet
    producer_notes TEXT,

    -- Ensure one config per processor
    CONSTRAINT unique_processor_config UNIQUE (processor_id)
);

-- Indexes
CREATE INDEX idx_processor_cut_config_processor ON processor_cut_config (processor_id);

-- Comments
COMMENT ON TABLE processor_cut_config IS 'Processor-specific cut sheet configuration controlling which options are available';
COMMENT ON COLUMN processor_cut_config.disabled_cuts IS 'Array of cut IDs from the schema that this processor does NOT offer';
COMMENT ON COLUMN processor_cut_config.custom_cuts IS 'Additional cuts unique to this processor';
COMMENT ON COLUMN processor_cut_config.default_templates IS 'Pre-configured cut sheet templates offered by this processor';
