-- Migration: Make email_templates global (remove user_id requirement)
-- This allows templates to be shared across all users

-- Step 1: Drop existing constraints/indexes that reference user_id
ALTER TABLE IF EXISTS email_templates 
DROP CONSTRAINT IF EXISTS email_templates_user_id_customer_type_language_key;

ALTER TABLE IF EXISTS email_templates 
DROP CONSTRAINT IF EXISTS email_templates_user_id_fkey;

DROP INDEX IF EXISTS idx_email_templates_user_id;
DROP INDEX IF EXISTS idx_email_templates_type;

-- Step 2: Drop user_id column
ALTER TABLE IF EXISTS email_templates 
DROP COLUMN IF EXISTS user_id;

-- Step 3: Add new unique constraint on customer_type + language
ALTER TABLE IF EXISTS email_templates 
ADD CONSTRAINT email_templates_type_language_unique 
UNIQUE (customer_type, language);

-- Step 4: Create new index
CREATE INDEX IF NOT EXISTS idx_email_templates_type_language 
ON email_templates(customer_type, language);

-- Step 5: Add name column if it doesn't exist (optional, for template naming)
ALTER TABLE IF EXISTS email_templates 
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Verify structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'email_templates';







