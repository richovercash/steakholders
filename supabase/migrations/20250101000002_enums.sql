-- Migration: Create custom enum types
-- Description: Define all enum types used throughout the schema

-- Organization types
CREATE TYPE organization_type AS ENUM ('producer', 'processor');

-- User roles within an organization
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'worker');

-- Types of animals for processing
CREATE TYPE animal_type AS ENUM ('beef', 'pork', 'lamb', 'goat');

-- Livestock lifecycle status
CREATE TYPE livestock_status AS ENUM (
    'on_farm',      -- Animal is at the farm
    'scheduled',    -- Scheduled for processing
    'in_transit',   -- Being transported
    'processing',   -- At processor facility
    'complete',     -- Processing complete
    'sold'          -- Sold/transferred
);

-- Stages during processing
CREATE TYPE processing_stage AS ENUM (
    'pending',      -- Awaiting drop-off
    'received',     -- Received at facility
    'hanging',      -- Hanging/aging
    'cutting',      -- Being cut
    'wrapping',     -- Being wrapped/packaged
    'freezing',     -- In freezer
    'ready',        -- Ready for pickup
    'picked_up'     -- Customer picked up
);

-- Order workflow status
CREATE TYPE order_status AS ENUM (
    'draft',        -- Being created
    'submitted',    -- Submitted by producer
    'confirmed',    -- Confirmed by processor
    'in_progress',  -- Processing underway
    'ready',        -- Ready for pickup
    'complete',     -- Order complete
    'cancelled'     -- Cancelled
);
