-- Migration: Create produced_packages table
-- Description: Tracks actual packages produced by processor with weights for chain of custody

CREATE TABLE produced_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Link to cut sheet
  cut_sheet_id UUID NOT NULL REFERENCES cut_sheets(id) ON DELETE CASCADE,

  -- Was this added by processor (not in original request)?
  processor_added BOOLEAN DEFAULT FALSE,

  -- Cut identification
  cut_id TEXT NOT NULL,           -- References cut ID from schema (e.g., 'tbone', 'ribeye')
  cut_name TEXT NOT NULL,         -- Human-readable name
  primal_id TEXT,                 -- Primal section (e.g., 'shortLoin', 'rib')

  -- Package details
  package_number INTEGER NOT NULL DEFAULT 1,  -- 1, 2, 3... for same cut type
  quantity_in_package INTEGER DEFAULT 1,      -- How many pieces in this package
  actual_weight_lbs DECIMAL(6, 2),            -- Actual weight of this package

  -- Cut parameters (may differ from original request)
  thickness TEXT,                 -- e.g., '1"', '1.5"'
  processing_style TEXT,          -- e.g., 'bone-in', 'boneless'

  -- Labeling for e-commerce
  label_printed BOOLEAN DEFAULT FALSE,
  label_printed_at TIMESTAMPTZ,

  -- Traceability - denormalized for efficient label generation
  livestock_tracking_id VARCHAR(20),

  -- Notes
  processor_notes TEXT,

  -- Metadata for future expansion
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Ensure unique package numbers per cut type per cut sheet
  UNIQUE(cut_sheet_id, cut_id, package_number)
);

-- Indexes for common queries
CREATE INDEX idx_produced_packages_cut_sheet ON produced_packages(cut_sheet_id);
CREATE INDEX idx_produced_packages_tracking ON produced_packages(livestock_tracking_id);
CREATE INDEX idx_produced_packages_cut_id ON produced_packages(cut_id);
CREATE INDEX idx_produced_packages_label ON produced_packages(label_printed) WHERE NOT label_printed;

-- Auto-update timestamp trigger
CREATE TRIGGER update_produced_packages_updated_at
  BEFORE UPDATE ON produced_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE produced_packages ENABLE ROW LEVEL SECURITY;

-- Processors can manage packages for their orders
CREATE POLICY "Processors can manage produced packages"
  ON produced_packages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cut_sheets cs
      JOIN processing_orders po ON cs.processing_order_id = po.id
      WHERE cs.id = produced_packages.cut_sheet_id
      AND po.processor_id = (SELECT organization_id FROM users WHERE auth_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cut_sheets cs
      JOIN processing_orders po ON cs.processing_order_id = po.id
      WHERE cs.id = produced_packages.cut_sheet_id
      AND po.processor_id = (SELECT organization_id FROM users WHERE auth_id = auth.uid())
    )
  );

-- Producers can view packages for their orders
CREATE POLICY "Producers can view their produced packages"
  ON produced_packages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cut_sheets cs
      JOIN processing_orders po ON cs.processing_order_id = po.id
      WHERE cs.id = produced_packages.cut_sheet_id
      AND po.producer_id = (SELECT organization_id FROM users WHERE auth_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM cut_sheets cs
      WHERE cs.id = produced_packages.cut_sheet_id
      AND cs.producer_id = (SELECT organization_id FROM users WHERE auth_id = auth.uid())
    )
  );

COMMENT ON TABLE produced_packages IS 'Actual packages produced during processing with weights and traceability';
COMMENT ON COLUMN produced_packages.processor_added IS 'True if this cut was added by processor, not in original producer request';
COMMENT ON COLUMN produced_packages.livestock_tracking_id IS 'Denormalized tracking ID for efficient label generation';
