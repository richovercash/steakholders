-- Migration: Enhance cut_sheet_history with more detail
-- Description: Add change categories and affected item tracking

-- Add change category for easier filtering
ALTER TABLE cut_sheet_history
  ADD COLUMN IF NOT EXISTS change_category TEXT CHECK (
    change_category IN (
      'initial_creation',
      'cut_added',
      'cut_removed',
      'cut_modified',
      'weight_entered',
      'package_created',
      'notes_updated',
      'general'
    )
  );

-- Add references to affected items
ALTER TABLE cut_sheet_history
  ADD COLUMN IF NOT EXISTS affected_cut_id TEXT,
  ADD COLUMN IF NOT EXISTS affected_package_id UUID REFERENCES produced_packages(id) ON DELETE SET NULL;

-- Index for efficient category queries
CREATE INDEX IF NOT EXISTS idx_cut_sheet_history_category
  ON cut_sheet_history(cut_sheet_id, change_category);

-- Index for affected cut queries
CREATE INDEX IF NOT EXISTS idx_cut_sheet_history_affected_cut
  ON cut_sheet_history(cut_sheet_id, affected_cut_id)
  WHERE affected_cut_id IS NOT NULL;

-- Update existing entries to have a category
UPDATE cut_sheet_history
SET change_category = CASE
  WHEN change_type = 'created' THEN 'initial_creation'
  ELSE 'general'
END
WHERE change_category IS NULL;

COMMENT ON COLUMN cut_sheet_history.change_category IS 'Specific type of change for filtering and reporting';
COMMENT ON COLUMN cut_sheet_history.affected_cut_id IS 'Which cut was affected by this change';
COMMENT ON COLUMN cut_sheet_history.affected_package_id IS 'Which produced package was affected';
