-- Migration: Add language support and user-specific templates
-- Run this in Supabase SQL Editor

-- 1. Add language column to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';

-- 2. Update existing customers with language based on country_code
UPDATE public.customers 
SET language = CASE
  WHEN country_code IN ('USA', 'GBR', 'CAN', 'AUS', 'NZL', 'IRL', 'ZAF') THEN 'en'
  WHEN country_code IN ('ITA') THEN 'it'
  WHEN country_code IN ('FRA', 'BEL', 'CHE') THEN 'fr'
  WHEN country_code IN ('ESP', 'MEX', 'ARG', 'COL', 'CHL', 'PER', 'VEN') THEN 'es'
  WHEN country_code IN ('PRT', 'BRA') THEN 'pt'
  WHEN country_code IN ('DEU', 'AUT') THEN 'de'
  WHEN country_code IN ('NLD') THEN 'nl'
  WHEN country_code IN ('POL') THEN 'pl'
  WHEN country_code IN ('BGR') THEN 'bg'
  WHEN country_code IN ('HUN') THEN 'hu'
  WHEN country_code IN ('CZE') THEN 'cs'
  WHEN country_code IN ('SVK') THEN 'sk'
  WHEN country_code IN ('RUS') THEN 'ru'
  ELSE 'en'
END
WHERE language IS NULL OR language = 'en';

-- 3. Make email_templates user-specific
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- 4. Drop old unique constraint if exists
ALTER TABLE public.email_templates 
DROP CONSTRAINT IF EXISTS email_templates_type_lang_unique;

-- 5. Add new unique constraint for user-specific templates
ALTER TABLE public.email_templates 
ADD CONSTRAINT unique_user_template 
UNIQUE(user_id, customer_type, language);

-- 6. Add default_language to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS default_language VARCHAR(10) DEFAULT 'en';

-- 7. Create index for faster template lookups
CREATE INDEX IF NOT EXISTS idx_email_templates_user_type_lang 
ON public.email_templates(user_id, customer_type, language);

-- 8. Create index for customer language lookups
CREATE INDEX IF NOT EXISTS idx_customers_language 
ON public.customers(language);

-- 9. Update existing global templates to have user_id = NULL (for system defaults)
UPDATE public.email_templates 
SET user_id = NULL 
WHERE user_id IS NULL;

-- Migration complete
SELECT 'Migration completed successfully' AS status;










