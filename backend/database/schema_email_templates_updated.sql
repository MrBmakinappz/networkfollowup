-- Updated Email Templates Table Schema (Global Templates)
-- This version removes user_id requirement, making templates global

-- Drop existing table if needed (use with caution in production)
-- DROP TABLE IF EXISTS email_templates CASCADE;

-- Create email_templates table (global, no user_id)
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    customer_type VARCHAR(50) NOT NULL CHECK (customer_type IN ('retail', 'wholesale', 'advocates')),
    language VARCHAR(5) NOT NULL DEFAULT 'en',
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(customer_type, language)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_type_language 
ON email_templates(customer_type, language);

CREATE INDEX IF NOT EXISTS idx_email_templates_active 
ON email_templates(is_active) WHERE is_active = TRUE;

-- Trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at 
BEFORE UPDATE ON email_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


