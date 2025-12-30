-- NetworkFollowUp Database Schema
-- PostgreSQL Schema for complete user management and settings

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_step INTEGER DEFAULT 1,
    subscription_tier VARCHAR(50) DEFAULT 'starter',
    subscription_status VARCHAR(50) DEFAULT 'active',
    trial_ends_at TIMESTAMP DEFAULT (NOW() + INTERVAL '14 days'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- USER PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(50),
    website VARCHAR(255),
    company_name VARCHAR(255),
    mlm_platform VARCHAR(100) DEFAULT 'doTERRA',
    timezone VARCHAR(50) DEFAULT 'UTC',
    photo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- USER PREFERENCES
-- ============================================
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    max_emails_per_hour INTEGER DEFAULT 50,
    max_emails_per_day INTEGER DEFAULT 250,
    enable_notifications BOOLEAN DEFAULT TRUE,
    notification_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CUSTOMERS
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    upload_id UUID,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    member_type VARCHAR(50) DEFAULT 'retail',
    country_code VARCHAR(3),
    enrollment_date DATE,
    last_contacted_at TIMESTAMP,
    total_emails_sent INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, email)
);

CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_member_type ON customers(member_type);

-- ============================================
-- EMAIL TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_name VARCHAR(255) NOT NULL,
    message_type VARCHAR(50) NOT NULL,
    subject_line VARCHAR(500) NOT NULL,
    email_body TEXT NOT NULL,
    variables_used TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_templates_user_id ON email_templates(user_id);
CREATE INDEX idx_templates_message_type ON email_templates(message_type);

-- ============================================
-- EMAIL SENDS
-- ============================================
CREATE TABLE IF NOT EXISTS email_sends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    template_id UUID REFERENCES email_templates(id),
    message_type VARCHAR(50),
    subject_line VARCHAR(500),
    email_body TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_sends_user_id ON email_sends(user_id);
CREATE INDEX idx_email_sends_customer_id ON email_sends(customer_id);
CREATE INDEX idx_email_sends_status ON email_sends(status);
CREATE INDEX idx_email_sends_sent_at ON email_sends(sent_at);

-- ============================================
-- UPLOAD HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS upload_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_size_kb INTEGER,
    customers_extracted INTEGER DEFAULT 0,
    ocr_cost DECIMAL(10, 4) DEFAULT 0,
    processing_time_ms INTEGER,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_upload_history_user_id ON upload_history(user_id);
CREATE INDEX idx_upload_history_created_at ON upload_history(created_at);

-- ============================================
-- USAGE TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tracked_date DATE NOT NULL,
    ocr_api_calls INTEGER DEFAULT 0,
    gmail_api_calls INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    total_api_cost DECIMAL(10, 4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tracked_date)
);

CREATE INDEX idx_usage_tracking_user_date ON usage_tracking(user_id, tracked_date);

-- ============================================
-- COUNTRY MAPPINGS
-- ============================================
CREATE TABLE IF NOT EXISTS country_mappings (
    country_code VARCHAR(3) PRIMARY KEY,
    country_name VARCHAR(100) NOT NULL,
    doterra_id VARCHAR(10)
);

-- Insert common countries
INSERT INTO country_mappings (country_code, country_name, doterra_id) VALUES
('USA', 'United States', 'USA'),
('ITA', 'Italy', 'ITA'),
('DEU', 'Germany', 'DEU'),
('GBR', 'United Kingdom', 'GBR'),
('CAN', 'Canada', 'CAN'),
('AUS', 'Australia', 'AUS'),
('FRA', 'France', 'FRA'),
('ESP', 'Spain', 'ESP')
ON CONFLICT (country_code) DO NOTHING;

-- ============================================
-- GMAIL CONNECTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS gmail_connections (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    gmail_email VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    is_connected BOOLEAN DEFAULT FALSE,
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ADMIN AUDIT LOG
-- ============================================
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_admin_id ON admin_audit_log(admin_user_id);
CREATE INDEX idx_audit_log_created_at ON admin_audit_log(created_at);

-- ============================================
-- CREATE DEFAULT ADMIN USER
-- ============================================
-- Password: admin123 (CHANGE THIS IN PRODUCTION!)
INSERT INTO users (email, password_hash, full_name, is_admin, onboarding_completed)
VALUES (
    'admin@networkfollowup.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYb0L3Z3KxO',
    'Admin User',
    TRUE,
    TRUE
)
ON CONFLICT (email) DO NOTHING;

-- Create admin profile
INSERT INTO user_profiles (user_id)
SELECT id FROM users WHERE email = 'admin@networkfollowup.com'
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- USEFUL VIEWS
-- ============================================

-- Customer stats by type
CREATE OR REPLACE VIEW customer_type_stats AS
SELECT 
    user_id,
    member_type,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE last_contacted_at IS NOT NULL) as contacted,
    COUNT(*) FILTER (WHERE last_contacted_at IS NULL) as not_contacted
FROM customers
GROUP BY user_id, member_type;

-- User dashboard stats
CREATE OR REPLACE VIEW user_dashboard_stats AS
SELECT 
    u.id as user_id,
    u.email,
    u.full_name,
    u.subscription_tier,
    COUNT(DISTINCT c.id) as total_customers,
    COUNT(DISTINCT CASE WHEN c.member_type = 'retail' THEN c.id END) as retail_customers,
    COUNT(DISTINCT CASE WHEN c.member_type = 'wholesale' THEN c.id END) as wholesale_customers,
    COUNT(DISTINCT CASE WHEN c.member_type = 'advocate' THEN c.id END) as advocate_customers,
    COUNT(DISTINCT es.id) as total_emails_sent,
    COALESCE(SUM(ut.total_api_cost), 0) as total_api_cost
FROM users u
LEFT JOIN customers c ON u.id = c.user_id
LEFT JOIN email_sends es ON u.id = es.user_id
LEFT JOIN usage_tracking ut ON u.id = ut.user_id
GROUP BY u.id, u.email, u.full_name, u.subscription_tier;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA (for testing)
-- ============================================

-- Create a test user
INSERT INTO users (email, password_hash, full_name, subscription_tier)
VALUES (
    'test@networkfollowup.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYb0L3Z3KxO',
    'Test User',
    'professional'
)
ON CONFLICT (email) DO NOTHING;

-- Create test user profile
INSERT INTO user_profiles (user_id, company_name)
SELECT id, 'Test Company' FROM users WHERE email = 'test@networkfollowup.com'
ON CONFLICT (user_id) DO NOTHING;

-- Create test user preferences
INSERT INTO user_preferences (user_id)
SELECT id FROM users WHERE email = 'test@networkfollowup.com'
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- CLEANUP & MAINTENANCE
-- ============================================

-- Function to delete old audit logs (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM admin_audit_log WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- GRANTS (if needed for specific users)
-- ============================================

-- Grant permissions to authenticated users (Supabase handles this automatically)
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ NetworkFollowUp database schema created successfully!';
    RAISE NOTICE '📊 Tables: users, customers, email_templates, email_sends, etc.';
    RAISE NOTICE '👤 Default admin: admin@networkfollowup.com / admin123';
    RAISE NOTICE '🧪 Test user: test@networkfollowup.com / admin123';
    RAISE NOTICE '⚠️  IMPORTANT: Change default passwords in production!';
END $$;
