# Email Templates Migration Guide

## Problem
Email templates table had `user_id NOT NULL`, making templates per-user. This is inefficient - templates should be global.

## Solution
Remove `user_id` column from `email_templates` table, making templates global.

## Migration Steps

### Step 1: Run Migration SQL
Run `backend/database/migrations/make_templates_global.sql` to:
- Drop user_id column
- Update constraints
- Update indexes

```sql
-- This will:
-- 1. Drop user_id column
-- 2. Update unique constraint to (customer_type, language)
-- 3. Update indexes
```

### Step 2: Seed Templates
Run `backend/database/seed_email_templates.sql` to create 15 templates:
- 3 customer types (retail, wholesale, advocates)
- 5 languages (en, it, de, fr, es)
- Total: 15 templates

### Step 3: Verify
Check that templates exist:
```sql
SELECT customer_type, language, name 
FROM email_templates 
ORDER BY customer_type, language;
```

You should see 15 rows.

## Files Changed

1. **Migration SQL**: `backend/database/migrations/make_templates_global.sql`
   - Drops user_id column
   - Updates constraints

2. **Seed SQL**: `backend/database/seed_email_templates.sql`
   - Creates 15 global templates
   - Uses ON CONFLICT to update if exists

3. **Email Route**: `backend/routes/emails.js` (line ~345)
   - Updated to query without user_id
   - Simpler query: `WHERE customer_type = $1 AND language = $2`

4. **Schema**: `backend/database/schema_email_templates_updated.sql`
   - New schema definition (for reference)
   - Use this for new deployments

## Benefits

✅ **Global Templates**: One set of templates for all users
✅ **Easier Management**: Update templates once, applies to everyone
✅ **Simpler Code**: No user_id in queries
✅ **Better Performance**: Smaller table, simpler indexes

## Rollback (if needed)

If you need to rollback, you'd need to:
1. Add user_id column back
2. Update constraints
3. Migrate data (would need to assign templates to users)
4. Revert code changes

## Testing

After migration:
1. Verify templates exist: `SELECT COUNT(*) FROM email_templates;` (should be 15)
2. Test email sending: Templates should be found and used
3. Check email content: Variables should be replaced correctly




