-- Migration: Create organizations table
-- Description: Multi-tenant container for both producers and processors

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Basic info
    name VARCHAR(255) NOT NULL,
    type organization_type NOT NULL,

    -- Contact
    email VARCHAR(255),
    phone VARCHAR(20),
    website VARCHAR(255),

    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    zip VARCHAR(10),

    -- Geolocation for proximity matching
    location GEOGRAPHY(POINT, 4326),

    -- Processor-specific fields
    license_number VARCHAR(100),
    license_type VARCHAR(50), -- 'usda', 'state', 'custom_exempt'
    certifications JSONB DEFAULT '[]'::jsonb,
    services_offered JSONB DEFAULT '[]'::jsonb, -- ['beef', 'pork', 'smoking', 'sausage']
    capacity_per_week INTEGER,
    lead_time_days INTEGER, -- typical days from drop-off to pickup

    -- Producer-specific fields
    farm_name VARCHAR(255),

    -- Settings
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_organizations_location ON organizations USING GIST (location);
CREATE INDEX idx_organizations_type ON organizations (type);
CREATE INDEX idx_organizations_state ON organizations (state);
CREATE INDEX idx_organizations_active ON organizations (is_active);

-- Comments
COMMENT ON TABLE organizations IS 'Multi-tenant container for producer farms and processor facilities';
COMMENT ON COLUMN organizations.type IS 'Whether this is a producer (farm) or processor (meat facility)';
COMMENT ON COLUMN organizations.location IS 'PostGIS geography point for proximity searches';
COMMENT ON COLUMN organizations.services_offered IS 'Array of services: beef, pork, lamb, goat, smoking, sausage, etc.';
