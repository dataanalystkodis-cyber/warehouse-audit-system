-- Warehouse Audit System - Complete Schema Migration
-- This migration creates the complete database schema with all tables, indexes, and RLS policies
-- Execute in Supabase SQL Editor

-- ===========================
-- 1. Enable Extensions
-- ===========================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ===========================
-- 2. Create Tables
-- ===========================

-- Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'manager', 'auditor', 'viewer')),
  warehouse_id UUID REFERENCES warehouses(id),
  active BOOLEAN DEFAULT TRUE,
  phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_code VARCHAR(100) UNIQUE NOT NULL,
  qr_code VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  brand VARCHAR(100),
  unit VARCHAR(50),
  warehouse_id UUID REFERENCES warehouses(id),
  zone VARCHAR(50),
  rack_number VARCHAR(50),
  bin_number VARCHAR(50),
  system_quantity INTEGER DEFAULT 0,
  reorder_point INTEGER DEFAULT 10,
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  image_url TEXT,
  supplier VARCHAR(255),
  last_audited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id)
);

-- Audit Headers
CREATE TABLE IF NOT EXISTS audit_header (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_name VARCHAR(255) NOT NULL,
  audit_type VARCHAR(50) NOT NULL CHECK (audit_type IN ('full', 'cycle', 'random', 'location', 'category')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'assigned', 'in_progress', 'submitted', 'reviewed', 'approved', 'closed')),
  assigned_to UUID REFERENCES user_profiles(id),
  warehouse_id UUID REFERENCES warehouses(id),
  filter_criteria JSONB,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  review_notes TEXT
);

-- Audit Details
CREATE TABLE IF NOT EXISTS audit_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id UUID NOT NULL REFERENCES audit_header(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  system_quantity INTEGER NOT NULL DEFAULT 0,
  physical_quantity INTEGER,
  variance_quantity INTEGER GENERATED ALWAYS AS (COALESCE(physical_quantity, 0) - system_quantity) STORED,
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  variance_value DECIMAL(14, 2) GENERATED ALWAYS AS ((COALESCE(physical_quantity, 0) - system_quantity) * unit_price) STORED,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'counted', 'flagged', 'recount_requested', 'recounted')),
  scanned BOOLEAN DEFAULT FALSE,
  scan_count INTEGER DEFAULT 0,
  note TEXT,
  counted_by UUID REFERENCES user_profiles(id),
  counted_at TIMESTAMP WITH TIME ZONE,
  recount_approved_by UUID REFERENCES user_profiles(id),
  recount_approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs (Audit Trail)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id UUID REFERENCES audit_header(id),
  user_id UUID REFERENCES user_profiles(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  audit_id UUID REFERENCES audit_header(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  email_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scan History (for tracking all scans during audit)
CREATE TABLE IF NOT EXISTS scan_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id UUID NOT NULL REFERENCES audit_header(id) ON DELETE CASCADE,
  audit_detail_id UUID REFERENCES audit_details(id),
  product_id UUID NOT NULL REFERENCES products(id),
  scanned_by UUID REFERENCES user_profiles(id),
  scan_result VARCHAR(50) CHECK (scan_result IN ('found', 'not_found', 'duplicate')),
  barcode_value VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================
-- 3. Create Indexes
-- ===========================

-- Products Indexes
CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_qr_code ON products(qr_code);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_warehouse_id ON products(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);

-- Audit Header Indexes
CREATE INDEX IF NOT EXISTS idx_audit_header_status ON audit_header(status);
CREATE INDEX IF NOT EXISTS idx_audit_header_assigned_to ON audit_header(assigned_to);
CREATE INDEX IF NOT EXISTS idx_audit_header_warehouse_id ON audit_header(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_audit_header_created_at ON audit_header(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_header_created_by ON audit_header(created_by);

-- Audit Details Indexes
CREATE INDEX IF NOT EXISTS idx_audit_details_audit_id ON audit_details(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_details_product_id ON audit_details(product_id);
CREATE INDEX IF NOT EXISTS idx_audit_details_status ON audit_details(status);
CREATE INDEX IF NOT EXISTS idx_audit_details_counted_by ON audit_details(counted_by);
CREATE INDEX IF NOT EXISTS idx_audit_details_variance ON audit_details(variance_quantity) WHERE variance_quantity != 0;

-- Audit Log Indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_audit_id ON audit_log(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- Notifications Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Scan History Indexes
CREATE INDEX IF NOT EXISTS idx_scan_history_audit_id ON scan_history(audit_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_product_id ON scan_history(product_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_scanned_by ON scan_history(scanned_by);

-- ===========================
-- 4. Create Views
-- ===========================

-- Dashboard Statistics View
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM products WHERE status = 'active') as total_products,
  (SELECT COUNT(*) FROM audit_details WHERE status IN ('counted', 'flagged', 'recounted')) as total_audited,
  (SELECT SUM(system_quantity) FROM products WHERE status = 'active') as total_system_stock,
  (SELECT SUM(physical_quantity) FROM audit_details WHERE status IN ('counted', 'flagged', 'recounted')) as total_physical_stock,
  (SELECT SUM(system_quantity * unit_price) FROM products WHERE status = 'active') as total_inventory_value,
  (SELECT COUNT(*) FROM audit_details WHERE variance_quantity != 0 AND status IN ('counted', 'flagged', 'recounted')) as discrepancy_count
;

-- Warehouse Summary View
CREATE OR REPLACE VIEW warehouse_summary AS
SELECT
  w.id,
  w.name,
  COUNT(DISTINCT p.id) as product_count,
  SUM(p.system_quantity) as system_stock,
  (SELECT SUM(ad.physical_quantity) FROM audit_details ad 
   JOIN products p2 ON ad.product_id = p2.id 
   WHERE p2.warehouse_id = w.id AND ad.status IN ('counted', 'flagged', 'recounted')) as physical_stock,
  SUM(p.system_quantity * p.unit_price) as inventory_value,
  (SELECT COUNT(*) FROM audit_details ad 
   JOIN products p2 ON ad.product_id = p2.id 
   WHERE p2.warehouse_id = w.id AND ad.variance_quantity != 0) as discrepancy_count
FROM warehouses w
LEFT JOIN products p ON w.id = p.warehouse_id
GROUP BY w.id, w.name
;

-- Category Summary View
CREATE OR REPLACE VIEW category_summary AS
SELECT
  p.category,
  COUNT(*) as product_count,
  SUM(p.system_quantity) as system_stock,
  (SELECT SUM(ad.physical_quantity) FROM audit_details ad 
   WHERE ad.product_id = p.id AND ad.status IN ('counted', 'flagged', 'recounted')) as physical_stock,
  SUM(p.system_quantity * p.unit_price) as inventory_value,
  COUNT(DISTINCT ad.id) as audited_count
FROM products p
LEFT JOIN audit_details ad ON p.id = ad.product_id
GROUP BY p.category
;

-- Auditor Performance View
CREATE OR REPLACE VIEW auditor_performance AS
SELECT
  up.id,
  up.full_name,
  COUNT(DISTINCT ad.id) as items_counted,
  SUM(CASE WHEN ad.status = 'flagged' THEN 1 ELSE 0 END) as items_flagged,
  SUM(CASE WHEN ad.variance_quantity = 0 THEN 1 ELSE 0 END) as items_matched,
  ROUND(100.0 * SUM(CASE WHEN ad.variance_quantity = 0 THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT ad.id), 0), 2) as accuracy_percentage
FROM user_profiles up
LEFT JOIN audit_details ad ON up.id = ad.counted_by
WHERE up.role = 'auditor'
GROUP BY up.id, up.full_name
;

-- ===========================
-- 5. Create Triggers & Functions
-- ===========================

-- Function to update product's last_audited_at
CREATE OR REPLACE FUNCTION update_product_last_audited()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('counted', 'flagged', 'recounted') THEN
    UPDATE products SET last_audited_at = NOW() WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_last_audited
AFTER INSERT OR UPDATE ON audit_details
FOR EACH ROW
EXECUTE FUNCTION update_product_last_audited();

-- Function to create notification on audit assignment
CREATE OR REPLACE FUNCTION notify_audit_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'assigned' AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO notifications (user_id, audit_id, type, title, message)
    VALUES (NEW.assigned_to, NEW.id, 'audit_assignment', 'New Audit Assigned', 'You have been assigned to audit: ' || NEW.audit_name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_audit_assignment
AFTER INSERT OR UPDATE ON audit_header
FOR EACH ROW
EXECUTE FUNCTION notify_audit_assignment();

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION log_audit_action()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (audit_id, action, entity_type, entity_id, details)
  VALUES (NEW.id, 'status_change', 'audit_header', NEW.id, 
    jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_audit_action
AFTER UPDATE ON audit_header
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION log_audit_action();

-- ===========================
-- 6. Row Level Security (RLS)
-- ===========================

-- Enable RLS on all tables
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_header ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Super admin can view all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Products Policies
CREATE POLICY "Authenticated users can view products" ON products
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Managers and above can modify products" ON products
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('manager', 'super_admin')
    )
  );

CREATE POLICY "Managers and above can update products" ON products
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('manager', 'super_admin')
    )
  );

-- Audit Header Policies
CREATE POLICY "Authenticated users can view audits" ON audit_header
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Managers can create audits" ON audit_header
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('manager', 'super_admin')
    )
  );

CREATE POLICY "Assigned auditor and managers can update" ON audit_header
  FOR UPDATE USING (
    auth.uid() = assigned_to OR 
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('manager', 'super_admin')
    )
  );

-- Audit Details Policies
CREATE POLICY "Authenticated users can view audit details" ON audit_details
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Auditors can update their own audit details" ON audit_details
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'auditor'
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('manager', 'super_admin')
    )
  );

-- Notifications Policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Audit Log Policies
CREATE POLICY "Authenticated users can view audit logs" ON audit_log
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Super admin can insert audit logs" ON audit_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
    ) OR auth.uid() IS NOT NULL
  );

-- Scan History Policies
CREATE POLICY "Auditors can view and insert scan history" ON scan_history
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Auditors can insert scans" ON scan_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('auditor', 'manager', 'super_admin')
    )
  );

-- ===========================
-- 7. Insert Sample Data (Optional)
-- ===========================

-- Sample Warehouses
INSERT INTO warehouses (code, name, city, state, country) VALUES
  ('WH-001', 'Main Warehouse', 'New York', 'NY', 'USA'),
  ('WH-002', 'Distribution Center', 'Chicago', 'IL', 'USA'),
  ('WH-003', 'Regional Hub', 'Los Angeles', 'CA', 'USA')
ON CONFLICT (code) DO NOTHING;

-- Sample Products (comment out if you want to add manually)
-- INSERT INTO products (product_code, name, category, brand, unit, warehouse_id, system_quantity, unit_price)
-- SELECT 'PROD-' || i, 'Sample Product ' || i, ARRAY['Electronics', 'Furniture', 'Supplies'][random() % 3 + 1], 'Brand ' || (i % 5), 'Unit', 
--   (SELECT id FROM warehouses LIMIT 1 OFFSET random() * 2), random() * 1000, random() * 1000
-- FROM generate_series(1, 100) i;

-- ===========================
-- 8. Maintenance Views
-- ===========================

-- Low Stock View
CREATE OR REPLACE VIEW low_stock_products AS
SELECT
  id, product_code, name, category,
  system_quantity, reorder_point,
  (reorder_point - system_quantity) as shortage
FROM products
WHERE status = 'active' AND system_quantity <= reorder_point
ORDER BY shortage DESC;

-- High Variance View
CREATE OR REPLACE VIEW high_variance_items AS
SELECT
  ad.id, p.product_code, p.name, p.category,
  ad.system_quantity, ad.physical_quantity, ad.variance_quantity,
  ad.unit_price, ad.variance_value,
  ah.audit_name, ah.assigned_to
FROM audit_details ad
JOIN products p ON ad.product_id = p.id
JOIN audit_header ah ON ad.audit_id = ah.id
WHERE ad.variance_quantity != 0
ORDER BY ABS(ad.variance_value) DESC;

-- ===========================
-- 9. Comments and Documentation
-- ===========================

COMMENT ON TABLE products IS 'Main product inventory table. Tracks system quantity vs physical stock.';
COMMENT ON TABLE audit_header IS 'Audit session header. Tracks overall audit workflow and status.';
COMMENT ON TABLE audit_details IS 'Individual product audit records. Contains system vs physical qty comparison.';
COMMENT ON COLUMN audit_details.variance_quantity IS 'Calculated field: physical_quantity - system_quantity';
COMMENT ON COLUMN audit_details.variance_value IS 'Calculated field: variance_quantity * unit_price';
COMMENT ON TABLE audit_log IS 'Complete audit trail of all system actions for compliance.';

-- ===========================
-- MIGRATION COMPLETE
-- ===========================

-- All tables, indexes, RLS policies, and views have been created.
-- The system is ready for use.

-- To verify setup:
-- SELECT * FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT * FROM pg_stat_user_indexes;
