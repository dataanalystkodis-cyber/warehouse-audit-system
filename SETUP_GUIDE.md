# Warehouse Audit System - Setup & Deployment Guide

## 📋 Table of Contents
1. [Initial Setup](#initial-setup)
2. [Database Configuration](#database-configuration)
3. [Feature Walkthrough](#feature-walkthrough)
4. [Mobile Scanner Setup](#mobile-scanner-setup)
5. [Troubleshooting](#troubleshooting)
6. [Production Deployment](#production-deployment)

---

## 🚀 Initial Setup

### Step 1: Prerequisites Check
```bash
# Verify Node.js version (16+)
node --version

# Verify npm version
npm --version
```

### Step 2: Project Installation
```bash
# Navigate to project directory
cd warehouse-audit-system

# Install dependencies
npm install

# Check for vulnerabilities
npm audit fix
```

### Step 3: Environment Configuration

Create `.env.local` file in project root:
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://[your-project].supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]

# Optional: Enable debug logging
VITE_DEBUG=false
```

Get these values from:
1. Go to [supabase.com](https://supabase.com)
2. Create new project or select existing
3. Go to Project Settings → API
4. Copy Project URL and anon (public) key

### Step 4: Test Connection
```bash
# Start development server
npm run dev

# Should open http://localhost:5173
# Try logging in with test credentials
```

---

## 🗄️ Database Configuration

### Step 1: Create Supabase Project

1. **Sign up/Login** to [Supabase](https://supabase.com)
2. **Create new project**
   - Project name: "warehouse-audit"
   - Region: Choose closest to your location
   - Password: Save securely
   - Click "Create new project"
3. **Wait for initialization** (2-3 minutes)

### Step 2: Run Database Migrations

1. **Go to SQL Editor** in Supabase dashboard
2. **Create new query** (or use Quick Start)
3. **Copy entire content** from: `supabase/migrations/20260628000000_complete_schema.sql`
4. **Paste into SQL editor**
5. **Click "Run"** to execute migration
6. **Verify success** - should see tables created confirmation

### Step 3: Set Up Authentication

1. **Go to Authentication** section
2. **Click "Providers"**
3. **Enable Email Provider**:
   - Click "Email"
   - Toggle "Enable Email provider"
   - Confirm Email (required before signing in)
   - Save

4. **Configure Email Templates** (optional):
   - Go to Email Templates
   - Customize confirmation/reset emails
   - Add company logo

### Step 4: Create Initial User Accounts

**Method A: Manual Creation**

1. Go to Authentication → Users
2. Click "Add user"
3. Enter email & password
4. Click "Create user"
5. User can now login

**Method B: via SQL**

```sql
-- Create super admin user
-- Note: Replace with actual email/password
INSERT INTO auth.users (email, password, email_confirmed_at)
VALUES ('admin@warehouse.com', crypt('password123', gen_salt('bf')), NOW())
ON CONFLICT DO NOTHING;

-- Create corresponding profile
INSERT INTO user_profiles (id, email, full_name, role, active)
SELECT id, email, 'Super Admin', 'super_admin', true
FROM auth.users
WHERE email = 'admin@warehouse.com'
ON CONFLICT DO NOTHING;
```

**Method C: Sign Up Form**
- Use app's login page to create user via "Sign Up"
- Then manually set role in user_profiles table

### Step 5: Verify Schema

```sql
-- Run this query to verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Expected tables:
-- - audit_details
-- - audit_header
-- - audit_log
-- - notifications
-- - products
-- - scan_history
-- - user_profiles
-- - warehouses
```

---

## 📊 Feature Walkthrough

### Dashboard Features

#### KPI Cards Section
- **Top Row**: Products, System Stock, Physical Stock, Inventory Value
- **Second Row**: Audited Count, Pending Count, Discrepancies, Accuracy %, Variance $
- **Color Coding**: 
  - Blue = Status info
  - Green/Emerald = Positive metrics
  - Orange/Amber = Warning
  - Red/Rose = Critical

#### Stock Comparison Widget
```
Shows:
- System Stock (total units in system)
- Physical Stock (total units counted)
- Variance (difference with color coding)
- Real-time calculation
```

#### Category Summary
- Displays top 6 categories by inventory value
- Shows: Category name, # of products, stock units, total value
- Sortable by value

#### Top Discrepancies Table
- Shows 5 largest variances by impact ($)
- Columns: Product Code, Name, System Qty, Physical Qty, Variance, Value Impact
- Helps prioritize investigation

#### Auditor Performance
- Lists all auditors with:
  - Items counted
  - Items flagged
  - Accuracy %
  - Ranking by productivity

#### Warehouse Overview
- Summary by warehouse location
- Stock distribution
- Inventory value per warehouse
- Quick health check

### Products View Features

#### Search & Filter
- **Search**: By name, product code, or brand
- **Category Filter**: Dropdown list
- **Warehouse Filter**: Dropdown list
- **Sort Options**: Name, Price, Stock Qty, Inventory Value

#### Product Cards
Each product shows:
- Product name & code
- Category & brand badges
- Warehouse location
- Unit price & total value
- Variance status (if audited)

#### Expandable Details
Click product to expand and see:
- System vs Physical stock
- Variance & variance value
- Brand, unit, zone, rack, bin
- Audit status
- Action buttons (Edit, View History, Delete)

#### Quick Stats
- Total Products
- Total Inventory Value
- # Audited
- # With Discrepancies

### Scanner Features

#### Starting a Scan
1. Go to "QR Scanner" from sidebar
2. Click "Start Camera" button
3. Grant camera permission when prompted
4. Camera feed appears

#### Scanning Workflow
1. **Position barcode** in camera view
2. **Auto-scan** detects and reads code
3. Product details appear:
   - Name, code, category
   - System quantity
   - Current audit status
   - Previous audit results
4. **Enter Physical Quantity** you counted
5. **Add Notes** (optional - for discrepancies)
6. **Click Save** to record
7. **Ready for next scan**

#### Manual Entry
If barcode won't scan:
1. Click "Manual Entry" tab
2. Type product code
3. Click lookup
4. Enter quantity
5. Save

#### Camera Options
- **Switch Camera**: Click camera icon to toggle front/back
- **Multi-device**: App detects all available cameras
- **Offline**: Works offline, syncs when reconnected

#### Scan History
- Last 50 scans visible at bottom
- Shows: Product, status (found/not found/duplicate), timestamp
- Click to view details

### Audit Management

#### Creating an Audit

1. Go to **Audits** section
2. Click **"New Audit"**
3. Fill details:
   - **Audit Name**: Descriptive name
   - **Audit Type**: 
     - Full: Complete inventory count
     - Cycle: Specific items/categories
     - Random: Random sample
     - Location: Specific warehouse/zone
     - Category: Specific product category
   - **Warehouse**: Select target warehouse
   - **Date Range**: Start & end dates (optional)
   - **Notes**: Special instructions

4. Click **"Create"** - audit created as Draft

#### Assigning an Audit

1. Click audit from list
2. Click **"Assign Auditor"**
3. Select auditor from dropdown
4. Audit status changes to "Assigned"
5. Auditor receives notification

#### Conducting Audit

**Auditor actions:**
1. Go to "QR Scanner"
2. Active audit selected automatically
3. Begin scanning products
4. Enter physical quantities
5. Flag discrepancies as needed
6. System calculates variance

**Manager actions:**
- View progress in real-time
- Check flagged items
- Add review notes
- Request recounts

#### Submitting & Approving

1. **Auditor clicks "Submit"**
   - All required items must be counted
   - Status changes to "Submitted"

2. **Manager reviews**:
   - Checks flagged items
   - Adds review notes
   - Can approve or request recount

3. **Manager clicks "Approve"**
   - Status changes to "Approved"
   - Dashboard updates
   - Audit log recorded

---

## 📱 Mobile Scanner Setup

### Browser Camera Requirements

#### For Development
- Modern browser (Chrome, Firefox, Safari, Edge)
- Camera access enabled
- Local testing: http://localhost
- No HTTPS required

#### For Production
- **HTTPS required** (critical!)
- Domain must be HTTPS/SSL
- Camera permission persists after first use
- Works on iPhone, Android, tablets

### Mobile Best Practices

#### Optimal Scanning Environment
- **Lighting**: Good ambient light (natural or LED)
- **Angle**: 45° to barcode
- **Distance**: 4-6 inches from camera
- **Stability**: Hold steady, avoid motion blur
- **Focus**: Wait for focus confirmation before scan

#### Troubleshooting Scans
| Issue | Solution |
|-------|----------|
| "Camera not found" | Check permission, refresh page |
| Barcode won't scan | Adjust angle, lighting, distance |
| Slow scanning | Check device performance, restart |
| Permission denied | Go to browser settings, enable camera |
| Offline errors | Check internet connection |

#### Performance Tips
- Close other camera apps first
- Restart browser if issues persist
- Test camera in browser settings
- Update browser to latest version
- Clear browser cache if problems

### Testing Scanner

```bash
# 1. Start dev server
npm run dev

# 2. Access on phone
# Get your computer IP: ipconfig (Windows) or ifconfig (Mac/Linux)
# Visit: http://[your-ip]:5173

# 3. Navigate to QR Scanner
# Click "Start Camera"
# Grant permission when prompted

# 4. Point at barcode/QR code
# System should detect and scan
```

### Generating QR Codes for Products

**Online Generator**: Use [QR Code Generator](https://www.qr-code-generator.com/)

**Format for products**:
```
Product Code: PROD-12345
QR Content: warehouse-audit:PROD-12345
or simply: PROD-12345
```

**Batch Generation**:
1. Prepare CSV with product codes
2. Use [Bulk QR Generator](https://www.bulk-qr-code-generator.com/)
3. Generate all QR codes
4. Print and label products

**Include in Database**:
```sql
-- Update products with QR codes
UPDATE products 
SET qr_code = 'warehouse-audit:PROD-12345'
WHERE product_code = 'PROD-12345';
```

---

## 🔧 Troubleshooting

### Authentication Issues

**"Invalid login credentials"**
- Verify email exists in auth.users table
- Check email is confirmed (email_confirmed_at not null)
- Verify password matches

**"Email not confirmed"**
- User must click confirmation email link
- Check spam folder for email
- Request new confirmation email

**"CORS errors"**
- Verify VITE_SUPABASE_URL is correct
- Ensure URL has no trailing slash
- Clear browser cookies and cache

### Camera/Scanner Issues

**"Permission denied"**
- Grant camera access when browser asks
- Check browser privacy settings
- Ensure site is HTTPS (production)
- Try different browser

**"Camera not detected"**
- Verify device has camera hardware
- Restart browser completely
- Try incognito/private mode
- Check device camera in system settings

**"Barcode not scanning"**
- Improve lighting conditions
- Increase angle and distance
- Check barcode is not damaged
- Try manual entry instead

**"Duplicate scan detected"**
- Normal - prevents recounting same item
- To recount: Mark as "Recount Requested"
- Manager must approve recount
- Then scan again

### Data/Database Issues

**"Product not found when scanning"**
- Verify product exists in database
- Check product_code matches barcode
- Try manual entry with correct code
- May need to add product first

**"Audit shows no products"**
- Verify products assigned to audit
- Check warehouse filter
- Ensure audit type matches product selection
- Create new audit with filters

**"Slow dashboard loading**
- Large inventory may slow queries
- Indexes should be in place from migration
- Check Supabase connection
- Optimize filters in dashboard view

**"Discrepancies not calculating"**
- Verify audit_details has both system_quantity and physical_quantity
- Check unit_price is correct
- Status must be 'counted', 'flagged', or 'recounted'

### Performance Issues

**"App feels slow"**
- Clear browser cache: Ctrl+Shift+Delete
- Disable browser extensions
- Close other tabs
- Restart browser

**"Database queries slow"**
- Check Supabase dashboard for load
- Verify indexes are created (see schema)
- Limit results in filters
- Consider archiving old audits

---

## 🚀 Production Deployment

### Pre-Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] HTTPS/SSL certificate installed
- [ ] Initial users created
- [ ] Sample data loaded (optional)
- [ ] All features tested locally
- [ ] Camera permissions tested on mobile
- [ ] Scanner barcode format verified
- [ ] Backup strategy in place
- [ ] User documentation prepared

### Deployment Options

#### Option 1: Vercel (Recommended)
```bash
# 1. Push code to GitHub
git push origin main

# 2. Connect Vercel to GitHub
# a. Go to vercel.com
# b. Click "New Project"
# c. Select repository
# d. Add environment variables
# e. Deploy

# 3. Configure domain (optional)
# In Vercel settings → Domains
```

#### Option 2: Netlify
```bash
# 1. Install Netlify CLI
npm install -g netlify-cli

# 2. Build project
npm run build

# 3. Deploy
netlify deploy --prod

# 4. Configure environment in Netlify UI
```

#### Option 3: Docker
```bash
# 1. Create Dockerfile
# 2. Build image
docker build -t warehouse-audit .

# 3. Run container
docker run -p 3000:3000 warehouse-audit

# 4. Access via http://localhost:3000
```

#### Option 4: Self-Hosted
```bash
# 1. Build for production
npm run build

# 2. Upload dist/ to web server
scp -r dist/* user@server:/var/www/app/

# 3. Configure reverse proxy (Nginx/Apache)
# 4. Set up SSL certificate (Let's Encrypt)
# 5. Test HTTPS connection
```

### Post-Deployment Steps

1. **Test all features**:
   - Login/logout
   - View dashboard
   - Test scanner with camera
   - Create and complete audit
   - View reports

2. **Configure domain**:
   - Point DNS to server
   - Install SSL certificate
   - Test HTTPS

3. **Set up backups**:
   - Enable Supabase backups
   - Daily backup schedule
   - Test restore process

4. **Monitor performance**:
   - Check error logs
   - Monitor load times
   - Track usage metrics

5. **Train users**:
   - Provide access credentials
   - Guide through first audit
   - Answer initial questions

### Environment Variables (Production)

```env
# Must match production Supabase project
VITE_SUPABASE_URL=https://[production-project].supabase.co
VITE_SUPABASE_ANON_KEY=[production-anon-key]

# Security settings
VITE_DEBUG=false
```

### Maintenance Schedule

**Daily**:
- Monitor system logs
- Check for errors
- Verify backups completed

**Weekly**:
- Review performance metrics
- Check user feedback
- Update documentation

**Monthly**:
- Archive old audit data
- Review access logs
- Update security patches

**Quarterly**:
- Full system audit
- Performance optimization
- User training refresher

---

## 📞 Support Contacts

### Getting Help
1. Check COMPLETE_GUIDE.md for feature details
2. Review troubleshooting section above
3. Check browser console for errors
4. Review Supabase logs

### Common Questions

**Q: How do I add more users?**
A: Go to Supabase Authentication → Users → Add User

**Q: Can I change user roles?**
A: Yes, edit user_profiles table, change 'role' column

**Q: How do I export reports?**
A: Use Reports section → Download as PDF/Excel

**Q: Is data encrypted?**
A: Yes, Supabase provides encryption at rest and in transit

**Q: What's the maximum number of products?**
A: No hard limit, but performance optimal with <100k products

---

## ✅ Verification Checklist

After setup, verify:

```
Database:
✓ All tables created
✓ Indexes in place
✓ RLS policies enabled
✓ Sample data loaded

Application:
✓ Connects to Supabase
✓ Login works
✓ Dashboard loads
✓ Products visible
✓ Scanner detects camera
✓ Can create audit
✓ Can scan products

Security:
✓ HTTPS enabled
✓ Environment variables set
✓ RLS policies active
✓ Backups scheduled
```

---

**Setup Complete!** Your warehouse audit system is ready to use. 🎉

For detailed feature documentation, see `COMPLETE_GUIDE.md`.
