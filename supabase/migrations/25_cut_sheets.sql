-- Cut Sheets Migration
-- Stores producer cut preferences for processing orders

-- Cut sheet main table
CREATE TABLE IF NOT EXISTS cut_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processing_order_id UUID REFERENCES processing_orders(id) ON DELETE CASCADE,
  producer_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  animal_type animal_type NOT NULL,

  -- Template functionality
  is_template BOOLEAN DEFAULT FALSE,
  template_name TEXT,

  -- Hanging weight (entered by processor typically)
  hanging_weight_lbs DECIMAL(8, 2),

  -- Ground meat preferences
  ground_type TEXT CHECK (ground_type IN ('bulk', 'vacuum', 'patties')),
  ground_package_weight_lbs DECIMAL(4, 2) DEFAULT 1.0,
  patty_size TEXT CHECK (patty_size IN ('1/4', '1/3', '1/2')),

  -- Organ preferences (binary keep/don't keep)
  keep_liver BOOLEAN DEFAULT FALSE,
  keep_heart BOOLEAN DEFAULT FALSE,
  keep_tongue BOOLEAN DEFAULT FALSE,
  keep_kidneys BOOLEAN DEFAULT FALSE,
  keep_oxtail BOOLEAN DEFAULT FALSE,
  keep_bones BOOLEAN DEFAULT FALSE,

  -- Other preferences
  keep_stew_meat BOOLEAN DEFAULT FALSE,
  keep_short_ribs BOOLEAN DEFAULT FALSE,
  keep_soup_bones BOOLEAN DEFAULT FALSE,

  -- Pork specific
  bacon_or_belly TEXT CHECK (bacon_or_belly IN ('bacon', 'fresh_belly', 'both', 'none')),
  ham_preference TEXT CHECK (ham_preference IN ('sliced', 'roast', 'both', 'none')),
  shoulder_preference TEXT CHECK (shoulder_preference IN ('sliced', 'roast', 'both', 'none')),
  keep_jowls BOOLEAN DEFAULT FALSE,
  keep_fat_back BOOLEAN DEFAULT FALSE,
  keep_lard_fat BOOLEAN DEFAULT FALSE,

  special_instructions TEXT,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'confirmed', 'in_progress', 'complete')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT template_has_name CHECK (
    (is_template = FALSE) OR (is_template = TRUE AND template_name IS NOT NULL)
  ),
  CONSTRAINT order_or_template CHECK (
    (is_template = TRUE AND processing_order_id IS NULL) OR
    (is_template = FALSE AND processing_order_id IS NOT NULL) OR
    (is_template = FALSE AND processing_order_id IS NULL)
  )
);

-- Individual cut selections
CREATE TABLE IF NOT EXISTS cut_sheet_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cut_sheet_id UUID NOT NULL REFERENCES cut_sheets(id) ON DELETE CASCADE,

  -- Cut identification
  cut_category TEXT NOT NULL CHECK (cut_category IN ('steak', 'roast', 'ground', 'ribs', 'bacon', 'sausage', 'other')),
  cut_id TEXT NOT NULL,  -- e.g., 'ribeye', 'chuck_roast', 'sausage_mild'
  cut_name TEXT NOT NULL,  -- Display name

  -- Parameters (nullable based on cut type)
  thickness TEXT,  -- For steaks: '1/2"', '3/4"', '1"', '1 1/2"', '2"'
  weight_lbs DECIMAL(4, 2),  -- For roasts: 2, 3, 4, 5 lbs
  pieces_per_package INTEGER CHECK (pieces_per_package BETWEEN 1 AND 6),
  pounds DECIMAL(6, 2),  -- For sausage: total pounds

  -- Metadata
  notes TEXT,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint per cut per sheet
  UNIQUE(cut_sheet_id, cut_id)
);

-- Sausage selections for pork (many flavors possible)
CREATE TABLE IF NOT EXISTS cut_sheet_sausages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cut_sheet_id UUID NOT NULL REFERENCES cut_sheets(id) ON DELETE CASCADE,

  flavor TEXT NOT NULL CHECK (flavor IN (
    'mild', 'medium', 'hot',
    'sweet_italian', 'hot_italian',
    'chorizo', 'bratwurst', 'polish',
    'breakfast', 'maple_breakfast'
  )),
  pounds DECIMAL(6, 2) NOT NULL CHECK (pounds > 0),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(cut_sheet_id, flavor)
);

-- Indexes
CREATE INDEX idx_cut_sheets_order ON cut_sheets(processing_order_id);
CREATE INDEX idx_cut_sheets_producer ON cut_sheets(producer_id);
CREATE INDEX idx_cut_sheets_template ON cut_sheets(producer_id, is_template) WHERE is_template = TRUE;
CREATE INDEX idx_cut_sheet_items_sheet ON cut_sheet_items(cut_sheet_id);
CREATE INDEX idx_cut_sheet_sausages_sheet ON cut_sheet_sausages(cut_sheet_id);

-- Triggers for updated_at
CREATE TRIGGER update_cut_sheets_updated_at
  BEFORE UPDATE ON cut_sheets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cut_sheet_items_updated_at
  BEFORE UPDATE ON cut_sheet_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE cut_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cut_sheet_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cut_sheet_sausages ENABLE ROW LEVEL SECURITY;

-- Cut sheets: producers can manage their own, processors can view orders they're processing
CREATE POLICY "Producers can manage own cut sheets"
  ON cut_sheets
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Processors can view cut sheets for their orders"
  ON cut_sheets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM processing_orders po
      WHERE po.id = cut_sheets.processing_order_id
      AND po.processor_id IN (
        SELECT organization_id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- Cut sheet items: same access as parent cut sheet
CREATE POLICY "Users can manage cut sheet items"
  ON cut_sheet_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Sausages: same access as parent cut sheet
CREATE POLICY "Users can manage cut sheet sausages"
  ON cut_sheet_sausages
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE cut_sheets IS 'Producer cutting preferences for processing orders';
COMMENT ON TABLE cut_sheet_items IS 'Individual cut selections within a cut sheet';
COMMENT ON TABLE cut_sheet_sausages IS 'Sausage flavor selections for pork orders';
COMMENT ON COLUMN cut_sheets.is_template IS 'If true, this is a reusable template, not tied to a specific order';
COMMENT ON COLUMN cut_sheet_items.thickness IS 'Steak thickness: 1/2", 3/4", 1", 1 1/2", 2"';
COMMENT ON COLUMN cut_sheet_items.weight_lbs IS 'Roast weight in pounds';
COMMENT ON COLUMN cut_sheet_items.pieces_per_package IS 'Number of pieces per vacuum pack';
