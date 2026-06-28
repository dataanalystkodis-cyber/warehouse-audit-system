# Warehouse Audit System - Complete Guide

## 🏭 Overview

A comprehensive warehouse inventory audit management system with mobile barcode/QR code scanner, real-time stock tracking, and detailed analytics dashboard. Perfect for warehouses, distribution centers, and inventory management.

## ✨ Key Features

### 📊 Enhanced Dashboard
- **Real-time Stock Tracking**: System stock vs Physical stock comparison
- **Inventory Value Monitoring**: Total inventory value with price tracking
- **Visual Analytics**: Charts and graphs for category and warehouse breakdowns
- **Performance Metrics**: Auditor accuracy and productivity tracking
- **Discrepancy Alerts**: Immediate identification of stock variance
- **KPI Cards**: At-a-glance metrics (total products, audited items, accuracy %, variance value)

### 📦 Product Management
- Detailed product inventory with:
  - Product code and name
  - Category and brand tracking
  - Unit pricing and total value calculations
  - Warehouse location (zone, rack, bin)
  - System stock vs Physical stock comparison
  - Price information per unit
- Search and filter capabilities
- Sortable by name, price, stock, or value
- Expandable product details with audit history

### 📱 Mobile QR/Barcode Scanner
- Real-time barcode/QR code scanning
- Multi-camera device support
- Manual code entry fallback
- Duplicate scan detection
- Immediate product lookup
- Physical quantity input during scan
- Note-taking for discrepancies
- Scan history tracking
- Offline capability support

### 📋 Audit Management
- Multiple audit types: Full, Cycle, Random, Location-wise, Category-wise
- Audit workflow: Draft → Assigned → In Progress → Submitted → Reviewed → Approved → Closed
- Detailed audit item tracking
- Variance calculation and flagging
- Recount request handling
- Audit history and timeline
- Performance metrics per auditor

### 📈 Advanced Reports
- Inventory summary reports
- Variance analysis by category/warehouse
- Auditor performance analytics
- Trend analysis over time
- Export to PDF/Excel
- Customizable date ranges

### 👥 User Management
- Role-based access control:
  - Super Admin: Full system access
  - Manager: Audit oversight and reporting
  - Auditor: Scanning and data entry
  - Viewer: Read-only access
- User activity logging
- Notification system

### 🔐 Security
- Supabase authentication
- Row-level security policies
- Action logging and audit trails
- Role-based permissions

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- Supabase account
- Modern web browser with camera access (for mobile scanner)

### Installation

1. **Clone and Install**
   ```bash
   cd warehouse-audit-system
   npm install
   ```

2. **Configure Supabase**
   - Create a Supabase project
   - Copy your project URL and anon key
   - Create `.env.local` file:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

3. **Initialize Database**
   - Run migrations in Supabase SQL editor:
   ```bash
   # See supabase/migrations/ folder
   # Execute migration files in order
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   Access at `http://localhost:5173`

---

## 📊 Dashboard Details

### KPI Cards (Top Row)
1. **Total Products**: Complete product count
2. **System Stock**: Sum of all system inventory quantities
3. **Physical Stock**: Sum of all audited physical quantities
4. **Inventory Value**: Total $ value of system stock (Qty × Price)

### KPI Cards (Second Row)
1. **Audited**: Number of products with completed audit
2. **Pending**: Products awaiting audit
3. **Discrepancies**: Items with quantity variance
4. **Accuracy %**: % of items matching system vs physical count
5. **Variance $**: Total value impact of discrepancies

### Stock Comparison Widget
- Visual representation of system vs physical stock
- Variance calculation
- Real-time updates

### Category Summary
- Top 6 categories by inventory value
- Stock unit counts
- Value per category

### Warehouse Overview
- Stock distribution across warehouses
- System and physical stock per warehouse
- Total inventory value by warehouse

### Top Discrepancies Table
- Products with largest variances
- Sorted by impact ($)
- System vs Physical comparison
- Quick identification of problem areas

### Auditor Performance
- Items counted per auditor
- Accuracy percentage
- Flagged items count
- Ranking by productivity

---

## 📱 Mobile Scanner Features

### QR/Barcode Scanning
- **Automatic Detection**: Supports multiple barcode formats
- **Manual Entry**: Type codes when scanner fails
- **Camera Switching**: Toggle between device cameras
- **Duplicate Prevention**: Alerts on rescanning same product
- **Instant Lookup**: Immediate product information display

### Scan Workflow
1. Scan product barcode/QR code
2. System displays:
   - Product details (name, code, category)
   - System quantity
   - Current audit status
   - Previous audit result (if exists)
3. Enter physical quantity counted
4. Add optional notes
5. Confirm and save
6. Scanner ready for next product

### Scan History
- Last 50 scans visible
- Status indicators (found, not found, duplicate)
- Quick access to scanned items
- Timestamps for all scans

---

## 💾 Database Schema

### Key Tables

#### `products`
- `id`: UUID primary key
- `product_code`: Unique product code
- `qr_code`: QR/barcode reference
- `name`: Product name
- `category`: Product category
- `brand`: Brand name
- `unit`: Unit of measurement
- `warehouse_id`: Associated warehouse
- `zone`, `rack_number`, `bin_number`: Location in warehouse
- `system_quantity`: Current system stock
- `unit_price`: Price per unit
- `status`: Active/Inactive
- `image_url`: Product image
- `created_at`, `updated_at`: Timestamps

#### `audit_details`
- `id`: UUID primary key
- `audit_id`: Reference to audit_header
- `product_id`: Reference to product
- `system_quantity`: System stock at audit time
- `physical_quantity`: Counted physical quantity
- `variance_quantity`: Difference (physical - system)
- `variance_value`: Variance × unit_price
- `unit_price`: Price at audit time
- `status`: Pending/Counted/Flagged/Recounted
- `scanned`: Boolean flag for scanned items
- `scan_count`: Number of times scanned
- `note`: Audit notes
- `counted_by`: User ID of counter
- `counted_at`: Timestamp
- `created_at`: Timestamp

#### `audit_header`
- `id`: UUID primary key
- `audit_name`: Audit identifier
- `audit_type`: Full/Cycle/Random/Location/Category
- `status`: Workflow status
- `assigned_to`: User ID
- `warehouse_id`: Target warehouse
- `filter_criteria`: JSON filter parameters
- `created_by`: Creator user ID
- `notes`: Audit notes
- Timestamps for each workflow step

#### `user_profiles`
- `id`: UUID primary key
- `email`: User email
- `full_name`: Display name
- `role`: User role (super_admin/manager/auditor/viewer)
- `warehouse`: Default warehouse
- `active`: Account status
- `created_at`: Timestamp

#### `notifications`
- `id`: UUID primary key
- `user_id`: Target user
- `audit_id`: Related audit
- `type`: Notification type
- `title`, `message`: Content
- `read`: Read status
- `email_sent`: Email delivery status
- `created_at`: Timestamp

#### `audit_log`
- `id`: UUID primary key
- `audit_id`: Related audit
- `user_id`: User performing action
- `action`: Action type
- `entity_type`: Object type (product/audit/user)
- `entity_id`: Object ID
- `details`: JSON additional info
- `created_at`: Timestamp

---

## 🔧 Configuration

### Environment Variables
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Role-Based Access

**Super Admin**
- Full system access
- User management
- Audit creation and approval
- Report access
- Settings management

**Manager**
- Audit oversight
- All reports
- Cannot delete users
- Can create audits

**Auditor**
- Mobile scanner access
- Can scan and count items
- View assigned audits
- Cannot create audits

**Viewer**
- Read-only dashboard
- Cannot perform audits
- Can view reports

---

## 📊 Key Metrics & Calculations

### Accuracy %
```
Matched Items / Total Audited × 100
(Items where physical_qty = system_qty)
```

### Variance Quantity
```
physical_quantity - system_quantity
```

### Variance Value
```
variance_quantity × unit_price
```

### Inventory Value
```
Sum of (system_quantity × unit_price) for all products
```

### Auditor Accuracy
```
Matched Items / Items Counted × 100
```

---

## 🛠️ Troubleshooting

### Scanner Not Working
- Check camera permissions in browser
- Verify HTTPS (required for camera access in production)
- Try manual code entry
- Test with different device camera

### Product Not Found
- Verify QR/barcode code format
- Check if product exists in system
- Ensure correct warehouse is selected
- Try product code instead of QR

### Discrepancies in Reports
- Verify audit status is "counted" or "flagged"
- Check physical_quantity entry
- Confirm unit_price is correct
- Look for duplicate scans

---

## 📱 Mobile Optimization

The system is fully responsive and optimized for:
- **Tablets**: Full dashboard on iPad-sized screens
- **Smartphones**: Optimized scanner interface
- **Landscape Mode**: Wide view for scanning
- **Offline**: Service worker for offline capability

### Mobile Best Practices
- Use landscape orientation for scanner
- Ensure good lighting for barcode reading
- Hold device steady during scan
- Test camera permissions before audit
- Keep browser updated

---

## 📈 Getting Started with Your First Audit

1. **Add Products**
   - Go to Products section
   - Click "Add Product"
   - Fill in details (code, name, category, price, qty)
   - Assign to warehouse/location

2. **Create Audit**
   - Go to Audits section
   - Click "New Audit"
   - Select audit type (e.g., "Full Physical Inventory")
   - Choose warehouse and date range
   - Add notes

3. **Assign Auditor**
   - Audit status changes to "Assigned"
   - Notify assigned auditor
   - Auditor can start scanning

4. **Scan Products**
   - Auditor goes to QR Scanner
   - Starts scanning products
   - Enters physical quantities
   - Notes any discrepancies

5. **Review & Approve**
   - Manager reviews audit
   - Checks flagged items
   - Approves or requests recount
   - Audit closes

6. **View Reports**
   - Dashboard shows updated metrics
   - Variance reports available
   - Auditor performance visible

---

## 📞 Support & Feedback

For issues or feature requests:
- Check documentation
- Review error logs
- Contact system administrator
- Submit feedback through app

---

## 📋 Version Information

- **Version**: 1.0.0
- **Last Updated**: June 2026
- **React**: 18.3.1
- **Supabase**: 2.57.4
- **Tailwind CSS**: 3.4.1

---

## 📄 License

This warehouse audit system is provided as-is. Modify and deploy according to your needs.

---

## 🎯 Next Steps

1. Deploy to production (Vercel, Netlify, etc.)
2. Set up automated backups
3. Configure email notifications
4. Train auditors on mobile scanner
5. Create audit schedule
6. Monitor performance metrics
7. Iterate based on feedback

---

Happy Auditing! 📦✨
