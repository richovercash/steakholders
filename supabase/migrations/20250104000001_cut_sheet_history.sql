-- Cut Sheet Edit History Table
-- Tracks all changes made to cut sheets, including who made them and when

CREATE TABLE IF NOT EXISTS cut_sheet_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cut_sheet_id UUID NOT NULL REFERENCES cut_sheets(id) ON DELETE CASCADE,
  processing_order_id UUID REFERENCES processing_orders(id) ON DELETE SET NULL,

  -- Who made the change
  changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_by_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  changed_by_role TEXT CHECK (changed_by_role IN ('producer', 'processor')),

  -- What was changed
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'status_changed')),
  change_summary TEXT, -- Human-readable summary of changes

  -- Snapshot of the cut sheet at this point (for full history)
  previous_state JSONB, -- State before the change
  new_state JSONB, -- State after the change

  -- Specific field changes (for easier querying)
  changed_fields TEXT[], -- Array of field names that changed

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX idx_cut_sheet_history_cut_sheet_id ON cut_sheet_history(cut_sheet_id);
CREATE INDEX idx_cut_sheet_history_order_id ON cut_sheet_history(processing_order_id);
CREATE INDEX idx_cut_sheet_history_created_at ON cut_sheet_history(created_at DESC);

-- RLS Policies
ALTER TABLE cut_sheet_history ENABLE ROW LEVEL SECURITY;

-- Producers can view history for their own cut sheets
CREATE POLICY "Producers can view their cut sheet history"
  ON cut_sheet_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cut_sheets cs
      WHERE cs.id = cut_sheet_history.cut_sheet_id
      AND cs.producer_id = (
        SELECT organization_id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- Processors can view history for orders they're processing
CREATE POLICY "Processors can view cut sheet history for their orders"
  ON cut_sheet_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cut_sheets cs
      JOIN processing_orders po ON cs.processing_order_id = po.id
      WHERE cs.id = cut_sheet_history.cut_sheet_id
      AND po.processor_id = (
        SELECT organization_id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- Both can insert history entries for their cut sheets
CREATE POLICY "Users can insert history for accessible cut sheets"
  ON cut_sheet_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cut_sheets cs
      LEFT JOIN processing_orders po ON cs.processing_order_id = po.id
      WHERE cs.id = cut_sheet_history.cut_sheet_id
      AND (
        cs.producer_id = (SELECT organization_id FROM users WHERE auth_id = auth.uid())
        OR po.processor_id = (SELECT organization_id FROM users WHERE auth_id = auth.uid())
      )
    )
  );

COMMENT ON TABLE cut_sheet_history IS 'Audit trail for all cut sheet changes';
