-- Migration: RLS policies for processor cut sheet editing
-- Description: Allow processors to update cut sheets for their orders

-- Allow processors to update cut sheets for orders they're processing
CREATE POLICY "Processors can update cut sheets for their orders"
  ON cut_sheets FOR UPDATE
  TO authenticated
  USING (
    processing_order_id IN (
      SELECT id FROM processing_orders
      WHERE processor_id = (SELECT organization_id FROM users WHERE auth_id = auth.uid())
    )
  )
  WITH CHECK (
    processing_order_id IN (
      SELECT id FROM processing_orders
      WHERE processor_id = (SELECT organization_id FROM users WHERE auth_id = auth.uid())
    )
  );

-- Note: produced_packages RLS is already defined in 20250116000002_produced_packages.sql
-- Note: cut_sheet_history INSERT policy is already defined in 20250104000001_cut_sheet_history.sql
