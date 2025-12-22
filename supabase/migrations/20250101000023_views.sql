-- Migration: Create helpful views
-- Description: Aggregate views for common queries

-- Active orders with all related details
CREATE VIEW orders_with_details AS
SELECT
    po.*,
    prod.name as producer_name,
    prod.farm_name,
    prod.city as producer_city,
    prod.state as producer_state,
    proc.name as processor_name,
    proc.city as processor_city,
    proc.state as processor_state,
    l.animal_type,
    l.tag_number,
    l.name as livestock_name,
    l.breed,
    cs.cuts as cut_sheet_cuts,
    cs.special_instructions
FROM processing_orders po
LEFT JOIN organizations prod ON po.producer_id = prod.id
LEFT JOIN organizations proc ON po.processor_id = proc.id
LEFT JOIN livestock l ON po.livestock_id = l.id
LEFT JOIN cut_sheets cs ON cs.processing_order_id = po.id AND cs.is_template = false;

-- Processor availability summary for discovery
CREATE VIEW processor_availability AS
SELECT
    o.id as processor_id,
    o.name as processor_name,
    o.city,
    o.state,
    o.license_type,
    o.services_offered,
    o.capacity_per_week,
    o.lead_time_days,
    cs.date,
    cs.animal_type,
    cs.capacity,
    cs.booked_count,
    cs.kill_fee,
    (cs.capacity - cs.booked_count) as available_slots
FROM organizations o
JOIN calendar_slots cs ON o.id = cs.processor_id
WHERE o.type = 'processor'
    AND o.is_active = true
    AND cs.is_available = true
    AND cs.date >= CURRENT_DATE
    AND cs.booked_count < cs.capacity;

-- Producer dashboard stats
CREATE VIEW producer_stats AS
SELECT
    o.id as organization_id,
    COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'on_farm') as livestock_on_farm,
    COUNT(DISTINCT po.id) FILTER (WHERE po.status IN ('submitted', 'confirmed', 'in_progress')) as active_orders,
    COUNT(DISTINCT po.id) FILTER (WHERE po.status = 'ready') as orders_ready_for_pickup,
    COUNT(DISTINCT m.id) FILTER (WHERE m.read_at IS NULL AND m.recipient_org_id = o.id) as unread_messages
FROM organizations o
LEFT JOIN livestock l ON l.producer_id = o.id
LEFT JOIN processing_orders po ON po.producer_id = o.id
LEFT JOIN messages m ON m.recipient_org_id = o.id
WHERE o.type = 'producer'
GROUP BY o.id;

-- Processor dashboard stats
CREATE VIEW processor_stats AS
SELECT
    o.id as organization_id,
    COUNT(DISTINCT po.id) FILTER (WHERE po.status = 'submitted') as pending_orders,
    COUNT(DISTINCT po.id) FILTER (WHERE po.status IN ('confirmed', 'in_progress')) as active_orders,
    COUNT(DISTINCT po.id) FILTER (WHERE po.status = 'ready') as orders_ready_for_pickup,
    COUNT(DISTINCT m.id) FILTER (WHERE m.read_at IS NULL AND m.recipient_org_id = o.id) as unread_messages,
    (SELECT SUM(capacity - booked_count)
     FROM calendar_slots
     WHERE processor_id = o.id
       AND date >= CURRENT_DATE
       AND date < CURRENT_DATE + INTERVAL '7 days'
       AND is_available = true) as available_slots_this_week
FROM organizations o
LEFT JOIN processing_orders po ON po.processor_id = o.id
LEFT JOIN messages m ON m.recipient_org_id = o.id
WHERE o.type = 'processor'
GROUP BY o.id;

-- Comments
COMMENT ON VIEW orders_with_details IS 'Orders with all related producer, processor, livestock, and cut sheet data';
COMMENT ON VIEW processor_availability IS 'Available processor slots for producer discovery';
COMMENT ON VIEW producer_stats IS 'Dashboard statistics for producers';
COMMENT ON VIEW processor_stats IS 'Dashboard statistics for processors';
