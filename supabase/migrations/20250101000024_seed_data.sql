-- Migration: Optional seed data for development
-- Description: Sample data for testing (can be skipped in production)

-- NOTE: This migration creates sample data for development/testing.
-- In production, you may want to skip this or remove it.

-- Uncomment the lines below to insert sample data:

/*
-- Sample processor
INSERT INTO organizations (
    name,
    type,
    email,
    phone,
    city,
    state,
    zip,
    license_number,
    license_type,
    services_offered,
    capacity_per_week,
    lead_time_days,
    is_active
) VALUES (
    'Valley Meat Processing',
    'processor',
    'info@valleymeat.example.com',
    '555-123-4567',
    'Cooperstown',
    'NY',
    '13326',
    'M1234',
    'usda',
    '["beef", "pork", "lamb", "smoking", "sausage"]'::jsonb,
    15,
    14,
    true
);

-- Sample producer
INSERT INTO organizations (
    name,
    type,
    email,
    phone,
    city,
    state,
    zip,
    farm_name,
    is_active
) VALUES (
    'Green Pastures Farm LLC',
    'producer',
    'farmer@greenpastures.example.com',
    '555-987-6543',
    'Cherry Valley',
    'NY',
    '13320',
    'Green Pastures Family Farm',
    true
);

-- Sample calendar slots for next 30 days
INSERT INTO calendar_slots (processor_id, date, animal_type, capacity, kill_fee)
SELECT
    (SELECT id FROM organizations WHERE name = 'Valley Meat Processing'),
    generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', INTERVAL '1 day')::date,
    'beef'::animal_type,
    3,
    75.00;

INSERT INTO calendar_slots (processor_id, date, animal_type, capacity, kill_fee)
SELECT
    (SELECT id FROM organizations WHERE name = 'Valley Meat Processing'),
    generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', INTERVAL '1 day')::date,
    'pork'::animal_type,
    5,
    50.00;
*/
