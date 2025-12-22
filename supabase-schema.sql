-- Steakholders MVP Database Schema
-- Run this in your Supabase SQL Editor to set up the initial schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For geolocation features

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE organization_type AS ENUM ('producer', 'processor');
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'worker');
CREATE TYPE animal_type AS ENUM ('beef', 'pork', 'lamb', 'goat');
CREATE TYPE livestock_status AS ENUM ('on_farm', 'scheduled', 'in_transit', 'processing', 'complete', 'sold');
CREATE TYPE processing_stage AS ENUM ('pending', 'received', 'hanging', 'cutting', 'wrapping', 'freezing', 'ready', 'picked_up');
CREATE TYPE order_status AS ENUM ('draft', 'submitted', 'confirmed', 'in_progress', 'ready', 'complete', 'cancelled');

-- ============================================
-- ORGANIZATIONS
-- ============================================

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

-- Create index for geolocation queries
CREATE INDEX idx_organizations_location ON organizations USING GIST (location);
CREATE INDEX idx_organizations_type ON organizations (type);
CREATE INDEX idx_organizations_state ON organizations (state);

-- ============================================
-- USERS
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Link to Supabase Auth
    auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Profile
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    
    -- Organization membership
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    role user_role DEFAULT 'worker',
    
    -- Settings
    notification_preferences JSONB DEFAULT '{"email": true, "sms": false}'::jsonb,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_users_auth_id ON users (auth_id);
CREATE INDEX idx_users_organization ON users (organization_id);
CREATE INDEX idx_users_email ON users (email);

-- ============================================
-- LIVESTOCK
-- ============================================

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

CREATE INDEX idx_livestock_producer ON livestock (producer_id);
CREATE INDEX idx_livestock_status ON livestock (status);
CREATE INDEX idx_livestock_type ON livestock (animal_type);

-- ============================================
-- CALENDAR SLOTS (Processor Availability)
-- ============================================

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
    
    UNIQUE(processor_id, date, animal_type)
);

CREATE INDEX idx_calendar_slots_processor ON calendar_slots (processor_id);
CREATE INDEX idx_calendar_slots_date ON calendar_slots (date);
CREATE INDEX idx_calendar_slots_availability ON calendar_slots (processor_id, date, is_available);

-- ============================================
-- PROCESSING ORDERS
-- ============================================

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
    
    -- Weights
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

CREATE INDEX idx_processing_orders_producer ON processing_orders (producer_id);
CREATE INDEX idx_processing_orders_processor ON processing_orders (processor_id);
CREATE INDEX idx_processing_orders_status ON processing_orders (status);
CREATE INDEX idx_processing_orders_stage ON processing_orders (processing_stage);
CREATE INDEX idx_processing_orders_number ON processing_orders (order_number);

-- ============================================
-- CUT SHEETS
-- ============================================

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

CREATE INDEX idx_cut_sheets_order ON cut_sheets (processing_order_id);
CREATE INDEX idx_cut_sheets_producer ON cut_sheets (producer_id);
CREATE INDEX idx_cut_sheets_template ON cut_sheets (is_template, producer_id);

-- ============================================
-- MESSAGES
-- ============================================

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Sender
    sender_id UUID NOT NULL REFERENCES users(id),
    sender_org_id UUID NOT NULL REFERENCES organizations(id),
    
    -- Recipient (organization level)
    recipient_org_id UUID NOT NULL REFERENCES organizations(id),
    
    -- Optional context
    processing_order_id UUID REFERENCES processing_orders(id) ON DELETE SET NULL,
    
    -- Content
    content TEXT NOT NULL,
    
    -- Status
    read_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_messages_sender ON messages (sender_org_id);
CREATE INDEX idx_messages_recipient ON messages (recipient_org_id);
CREATE INDEX idx_messages_order ON messages (processing_order_id);
CREATE INDEX idx_messages_created ON messages (created_at DESC);

-- ============================================
-- WAITLIST (For full calendar slots)
-- ============================================

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

CREATE INDEX idx_waitlist_processor ON waitlist_entries (processor_id, preferred_date);
CREATE INDEX idx_waitlist_producer ON waitlist_entries (producer_id);
CREATE INDEX idx_waitlist_active ON waitlist_entries (is_active, processor_id);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Content
    type VARCHAR(50) NOT NULL, -- 'order_update', 'message', 'slot_available', etc.
    title VARCHAR(255) NOT NULL,
    body TEXT,
    
    -- Related entities
    processing_order_id UUID REFERENCES processing_orders(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    
    -- Status
    read_at TIMESTAMPTZ,
    
    -- Delivery
    email_sent_at TIMESTAMPTZ,
    sms_sent_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user ON notifications (user_id, read_at);
CREATE INDEX idx_notifications_created ON notifications (created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE livestock ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cut_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
    SELECT organization_id FROM users WHERE auth_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Organizations: Users can see their own org + public processor profiles
CREATE POLICY "Users can view their own organization"
    ON organizations FOR SELECT
    USING (id = get_user_org_id());

CREATE POLICY "Users can view processor profiles"
    ON organizations FOR SELECT
    USING (type = 'processor' AND is_active = true);

CREATE POLICY "Owners can update their organization"
    ON organizations FOR UPDATE
    USING (id = get_user_org_id())
    WITH CHECK (id = get_user_org_id());

-- Users: Can only see users in their org
CREATE POLICY "Users can view users in their organization"
    ON users FOR SELECT
    USING (organization_id = get_user_org_id());

CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE
    USING (auth_id = auth.uid())
    WITH CHECK (auth_id = auth.uid());

-- Livestock: Producers can manage their own
CREATE POLICY "Producers can manage their livestock"
    ON livestock FOR ALL
    USING (producer_id = get_user_org_id());

-- Calendar Slots: Processors manage their own, producers can view
CREATE POLICY "Processors can manage their calendar"
    ON calendar_slots FOR ALL
    USING (processor_id = get_user_org_id());

CREATE POLICY "Producers can view processor calendars"
    ON calendar_slots FOR SELECT
    USING (is_available = true);

-- Processing Orders: Both parties can view and update
CREATE POLICY "Producers can view their orders"
    ON processing_orders FOR SELECT
    USING (producer_id = get_user_org_id());

CREATE POLICY "Processors can view orders assigned to them"
    ON processing_orders FOR SELECT
    USING (processor_id = get_user_org_id());

CREATE POLICY "Producers can create orders"
    ON processing_orders FOR INSERT
    WITH CHECK (producer_id = get_user_org_id());

CREATE POLICY "Both parties can update orders"
    ON processing_orders FOR UPDATE
    USING (producer_id = get_user_org_id() OR processor_id = get_user_org_id());

-- Cut Sheets: Follow order access
CREATE POLICY "Users can access cut sheets for their orders"
    ON cut_sheets FOR ALL
    USING (
        processing_order_id IN (
            SELECT id FROM processing_orders 
            WHERE producer_id = get_user_org_id() OR processor_id = get_user_org_id()
        )
        OR producer_id = get_user_org_id()
    );

-- Messages: Sender and recipient orgs
CREATE POLICY "Users can view messages for their organization"
    ON messages FOR SELECT
    USING (sender_org_id = get_user_org_id() OR recipient_org_id = get_user_org_id());

CREATE POLICY "Users can send messages from their organization"
    ON messages FOR INSERT
    WITH CHECK (sender_org_id = get_user_org_id());

-- Notifications: User's own only
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR ALL
    USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Waitlist: Producer sees their own, processor sees theirs
CREATE POLICY "Producers can manage their waitlist entries"
    ON waitlist_entries FOR ALL
    USING (producer_id = get_user_org_id());

CREATE POLICY "Processors can view waitlist for their slots"
    ON waitlist_entries FOR SELECT
    USING (processor_id = get_user_org_id());

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- ============================================
-- HELPFUL VIEWS
-- ============================================

-- Active orders with all details
CREATE VIEW orders_with_details AS
SELECT 
    po.*,
    prod.name as producer_name,
    prod.farm_name,
    proc.name as processor_name,
    l.animal_type,
    l.tag_number,
    cs.cuts as cut_sheet_cuts
FROM processing_orders po
LEFT JOIN organizations prod ON po.producer_id = prod.id
LEFT JOIN organizations proc ON po.processor_id = proc.id
LEFT JOIN livestock l ON po.livestock_id = l.id
LEFT JOIN cut_sheets cs ON cs.processing_order_id = po.id;

-- Processor availability summary
CREATE VIEW processor_availability AS
SELECT 
    o.id as processor_id,
    o.name as processor_name,
    o.city,
    o.state,
    cs.date,
    cs.animal_type,
    cs.capacity,
    cs.booked_count,
    (cs.capacity - cs.booked_count) as available_slots
FROM organizations o
JOIN calendar_slots cs ON o.id = cs.processor_id
WHERE o.type = 'processor' 
    AND o.is_active = true 
    AND cs.is_available = true
    AND cs.date >= CURRENT_DATE;

-- ============================================
-- SAMPLE DATA FOR TESTING (Optional)
-- ============================================

-- Uncomment to add sample data for development

/*
-- Insert sample processor
INSERT INTO organizations (name, type, email, city, state, zip, license_number, license_type, services_offered, capacity_per_week)
VALUES (
    'Valley Meat Processing',
    'processor',
    'info@valleymeat.com',
    'Cooperstown',
    'NY',
    '13326',
    'M1234',
    'usda',
    '["beef", "pork", "lamb", "smoking", "sausage"]'::jsonb,
    15
);

-- Insert sample producer
INSERT INTO organizations (name, type, email, city, state, zip, farm_name)
VALUES (
    'Green Pastures Farm',
    'producer',
    'farmer@greenpastures.com',
    'Cherry Valley',
    'NY',
    '13320',
    'Green Pastures Family Farm'
);
*/
