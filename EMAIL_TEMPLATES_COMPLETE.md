# ✅ Email Templates Migration - COMPLETE

## Problem Solved
✅ Email templates table had `user_id NOT NULL`, requiring templates per-user
✅ Changed to global templates (no user_id required)
✅ Templates are now shared across all users

## Files Created/Updated

### 1. Migration SQL ✅
**File**: `backend/database/migrations/make_templates_global.sql`
- Drops `user_id` column
- Updates constraints to `(customer_type, language)`
- Updates indexes
- **Run this first** if table already exists

### 2. Seed SQL ✅
**File**: `backend/database/seed_email_templates.sql`
- Creates 15 templates (3 types × 5 languages)
- No user_id required
- Uses `ON CONFLICT` to update if exists
- **Run this after migration**

### 3. Updated Schema ✅
**File**: `backend/database/schema.sql`
- Updated email_templates table definition
- Removed user_id column
- Updated unique constraint
- Updated indexes

### 4. Updated Email Route ✅
**File**: `backend/routes/emails.js` (line ~345)
- Removed user_id from query
- Simplified query: `WHERE customer_type = $1 AND language = $2`
- Templates are now global

## Migration Steps

### Step 1: Run Migration
```sql
-- Run backend/database/migrations/make_templates_global.sql
-- This will:
-- 1. Drop user_id column
-- 2. Update constraints
-- 3. Update indexes
```

### Step 2: Seed Templates
```sql
-- Run backend/database/seed_email_templates.sql
-- This will create 15 templates:
-- - 3 customer types (retail, wholesale, advocates)
-- - 5 languages (en, it, de, fr, es)
```

### Step 3: Verify
```sql
-- Check templates exist
SELECT customer_type, language, name 
FROM email_templates 
ORDER BY customer_type, language;

-- Should return 15 rows:
-- retail: en, it, de, fr, es
-- wholesale: en, it, de, fr, es
-- advocates: en, it, de, fr, es
```

## Schema Changes

### Before:
```sql
CREATE TABLE email_templates (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    customer_type VARCHAR(50) NOT NULL,
    language VARCHAR(5) NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    UNIQUE(user_id, customer_type, language)
);
```

### After:
```sql
CREATE TABLE email_templates (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    customer_type VARCHAR(50) NOT NULL,
    language VARCHAR(5) NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(customer_type, language)
);
```

## Benefits

✅ **Global Templates**: One set of templates for all users
✅ **Easier Management**: Update templates once, applies to everyone
✅ **Simpler Code**: No user_id in queries
✅ **Better Performance**: Smaller table, simpler indexes
✅ **Cost Optimization**: Templates prevent Claude API calls per email

## Testing

After migration, test:
1. ✅ Templates exist: `SELECT COUNT(*) FROM email_templates;` (should be 15)
2. ✅ Email sending: Send email, verify template is used
3. ✅ Variable replacement: Check {{firstname}}, {{your-name}} are replaced
4. ✅ Language detection: Different countries get correct language templates

## Status

✅ **Migration SQL**: Created
✅ **Seed SQL**: Created
✅ **Schema Updated**: Updated
✅ **Code Updated**: Email route updated
✅ **Ready to Deploy**: Yes!

**Next Step**: Run migration and seed SQL in database, then deploy!




