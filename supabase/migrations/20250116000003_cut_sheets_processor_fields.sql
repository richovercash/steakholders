-- Migration: Add processor modification fields to cut_sheets
-- Description: Track processor changes to cut specifications

-- Add processor-specific fields to cut_sheets
ALTER TABLE cut_sheets
  ADD COLUMN IF NOT EXISTS processor_modifications JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS removed_cuts JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS added_cuts JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS processor_notes TEXT,
  ADD COLUMN IF NOT EXISTS last_modified_by_role TEXT CHECK (last_modified_by_role IN ('producer', 'processor')),
  ADD COLUMN IF NOT EXISTS last_modified_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS hanging_weight_lbs DECIMAL(8, 2),
  ADD COLUMN IF NOT EXISTS final_weight_lbs DECIMAL(8, 2);

-- Index for querying modified cut sheets
CREATE INDEX IF NOT EXISTS idx_cut_sheets_modified
  ON cut_sheets(last_modified_by_role)
  WHERE last_modified_by_role IS NOT NULL;

-- Comments explaining the JSONB structures
COMMENT ON COLUMN cut_sheets.processor_modifications IS 'Processor changes to original cuts: { "cutId": { "thickness": "1.5", "notes": "..." } }';
COMMENT ON COLUMN cut_sheets.removed_cuts IS 'Cuts removed by processor: [{ "cutId": "...", "reason": "..." }]';
COMMENT ON COLUMN cut_sheets.added_cuts IS 'Cuts added by processor: [{ "cutId": "...", "name": "...", "params": {...} }]';
COMMENT ON COLUMN cut_sheets.hanging_weight_lbs IS 'Actual hanging weight entered by processor';
COMMENT ON COLUMN cut_sheets.final_weight_lbs IS 'Total final weight of all packages';
