-- NetworkFollowUp Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CUSTOMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    customer_type VARCHAR(50) NOT NULL CHECK (customer_type IN ('retail', 'wholesale', 'advocates')),
    country_code VARCHAR(3) NOT NULL,
    language VARCHAR(5) DEFAULT 'en',
    email_sent BOOLEAN DEFAULT FALSE,
    last_email_sent_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, email)
);

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email_sent ON customers(user_id, email_sent);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(user_id, customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_country ON customers(user_id, country_code);

-- ============================================
-- EMAIL SENDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_sends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced', 'pending')),
    error_message TEXT,
    sent_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_sends_user_id ON email_sends(user_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_customer_id ON email_sends(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends(user_id, status);

-- ============================================
-- GMAIL CONNECTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS gmail_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gmail_email VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expiry TIMESTAMP,
    connected_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_gmail_connections_user_id ON gmail_connections(user_id);

-- ============================================
-- UPLOAD HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS upload_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255),
    file_size INTEGER,
    customers_extracted INTEGER DEFAULT 0,
    extraction_status VARCHAR(50) DEFAULT 'success' CHECK (extraction_status IN ('success', 'failed', 'partial')),
    error_message TEXT,
    file_hash VARCHAR(64),
    ocr_result JSONB,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upload_history_user_id ON upload_history(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_history_file_hash ON upload_history(file_hash);
CREATE INDEX IF NOT EXISTS idx_upload_history_user_hash ON upload_history(user_id, file_hash);

-- ============================================
-- EMAIL TEMPLATES TABLE (Global Templates)
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_email_templates_type_language ON email_templates(customer_type, language);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active) WHERE is_active = TRUE;

-- ============================================
-- USAGE TRACKING TABLE (Enhanced)
-- ============================================
CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emails_sent_today INTEGER DEFAULT 0,
    emails_sent_this_hour INTEGER DEFAULT 0,
    emails_sent_this_month INTEGER DEFAULT 0,
    uploads_this_month INTEGER DEFAULT 0,
    last_email_sent_at TIMESTAMP,
    last_upload_at TIMESTAMP,
    daily_reset_date DATE DEFAULT CURRENT_DATE,
    monthly_reset_date DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);

-- ============================================
-- USER PREFERENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    default_language VARCHAR(5) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    daily_email_limit INTEGER DEFAULT 500,
    hourly_email_limit INTEGER DEFAULT 100,
    auto_send_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ============================================
-- STRIPE CUSTOMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS stripe_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255) NOT NULL,
    stripe_subscription_id VARCHAR(255),
    subscription_status VARCHAR(50) DEFAULT 'inactive',
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id),
    UNIQUE(stripe_customer_id)
);

CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_subscription ON stripe_customers(stripe_subscription_id);

-- ============================================
-- COUNTRY MAPPINGS TABLE (for custom codes)
-- ============================================
CREATE TABLE IF NOT EXISTS country_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    custom_code VARCHAR(10) NOT NULL,
    iso_code VARCHAR(3) NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    language VARCHAR(5) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, custom_code)
);

CREATE INDEX IF NOT EXISTS idx_country_mappings_user_id ON country_mappings(user_id);

-- ============================================
-- DEFAULT EMAIL TEMPLATES (Initial data)
-- ============================================
-- These will be inserted when a user first signs up

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gmail_connections_updated_at BEFORE UPDATE ON gmail_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at BEFORE UPDATE ON usage_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_customers_updated_at BEFORE UPDATE ON stripe_customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS FOR STATISTICS
-- ============================================

-- Customer stats per user
CREATE OR REPLACE VIEW customer_stats AS
SELECT 
    user_id,
    COUNT(*) as total_customers,
    COUNT(CASE WHEN customer_type = 'retail' THEN 1 END) as retail_count,
    COUNT(CASE WHEN customer_type = 'wholesale' THEN 1 END) as wholesale_count,
    COUNT(CASE WHEN customer_type = 'advocates' THEN 1 END) as advocates_count,
    COUNT(CASE WHEN email_sent = TRUE THEN 1 END) as contacted_count,
    COUNT(CASE WHEN email_sent = FALSE THEN 1 END) as pending_count,
    COUNT(DISTINCT country_code) as countries_count
FROM customers
GROUP BY user_id;

-- Email sending stats per user
CREATE OR REPLACE VIEW email_stats AS
SELECT 
    user_id,
    COUNT(*) as total_emails_sent,
    COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful_sends,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_sends,
    COUNT(CASE WHEN DATE(sent_at) = CURRENT_DATE THEN 1 END) as emails_today,
    COUNT(CASE WHEN DATE_TRUNC('month', sent_at) = DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as emails_this_month
FROM email_sends
GROUP BY user_id;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'NetworkFollowUp Database Schema created successfully!';
END $$;
