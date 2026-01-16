-- Migration: Add internal tracking ID to livestock
-- Description: Auto-generated tracking ID (STK-YYYY-NNNNN) for chain of custody

-- Add tracking_id column
ALTER TABLE livestock ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(20);

-- Create sequence for tracking ID numbers (starting from 1)
CREATE SEQUENCE IF NOT EXISTS livestock_tracking_seq START 1;

-- Function to generate tracking ID
CREATE OR REPLACE FUNCTION generate_livestock_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := 'STK-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' ||
                       LPAD(NEXTVAL('livestock_tracking_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate tracking ID on insert
DROP TRIGGER IF EXISTS trg_livestock_tracking_id ON livestock;
CREATE TRIGGER trg_livestock_tracking_id
  BEFORE INSERT ON livestock
  FOR EACH ROW
  EXECUTE FUNCTION generate_livestock_tracking_id();

-- Create unique index on tracking_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_livestock_tracking_id
  ON livestock(tracking_id) WHERE tracking_id IS NOT NULL;

-- Backfill existing livestock without tracking IDs
-- Uses ROW_NUMBER to generate sequential IDs based on creation order
WITH numbered AS (
  SELECT id, created_at,
         ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM livestock
  WHERE tracking_id IS NULL
)
UPDATE livestock l
SET tracking_id = 'STK-' || TO_CHAR(n.created_at, 'YYYY') || '-' || LPAD(n.rn::TEXT, 5, '0')
FROM numbered n
WHERE l.id = n.id;

-- Update sequence to start after the highest backfilled number
SELECT setval('livestock_tracking_seq',
  COALESCE(
    (SELECT MAX(NULLIF(SUBSTRING(tracking_id FROM 10)::INTEGER, 0)) FROM livestock),
    0
  ) + 1,
  false
);

COMMENT ON COLUMN livestock.tracking_id IS 'System-generated internal tracking ID (STK-YYYY-NNNNN) for chain of custody';
