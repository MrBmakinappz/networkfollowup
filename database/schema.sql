-- NetworkFollowUp Database Schema
-- PostgreSQL Schema for complete user management and settings

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_step INTEGER DEFAULT 1,
    subscription_tier VARCHAR(50) DEFAULT 'starter', -- starter, professional, enterprise
    subscription_status VARCHAR(50) DEFAULT 'active',
    trial_ends_at TIMESTAMP
);

-- User Profiles
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(50),
    website VARCHAR(255),
    company_name VARCHAR(255),
    photo_url VARCHAR(500),
    timezone VARCHAR(50) DEFAULT 'UTC',
    mlm_platform VARCHAR(50), -- doterra, herbalife, amway, etc
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Country Mappings (User's custom country code definitions)
CREATE TABLE country_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    backend_code VARCHAR(10) NOT NULL, -- DEU, ITA, GER, etc
    country_name VARCHAR(100) NOT NULL, -- Germany, Italy, etc
    email_language VARCHAR(50) NOT NULL, -- German, Italian, etc
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, backend_code)
);

-- Email Templates (User's custom messages per language and type)
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message_type VARCHAR(20) NOT NULL, -- retail, wholesale, advocate
    language VARCHAR(50) NOT NULL, -- English, German, Italian, etc
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    last_edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, message_type, language)
);

-- User Preferences
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    max_emails_per_hour INTEGER DEFAULT 50,
    max_emails_per_day INTEGER DEFAULT 250,
    email_delay_seconds DECIMAL(3,1) DEFAULT 2.0,
    auto_signature BOOLEAN DEFAULT TRUE,
    track_email_opens BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gmail Connections
CREATE TABLE gmail_connections (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    token_expiry TIMESTAMP,
    connected_email VARCHAR(255),
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- OCR Template Configurations (Learned screenshot formats)
CREATE TABLE ocr_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    template_name VARCHAR(100),
    screenshot_example_url VARCHAR(500),
    field_positions JSONB, -- Stores x,y,width,height for each field
    accuracy_score DECIMAL(3,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Upload History (Screenshots processed)
CREATE TABLE upload_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    file_url VARCHAR(500),
    file_size_kb INTEGER,
    customers_extracted INTEGER,
    ocr_cost DECIMAL(10,4),
    processing_time_ms INTEGER,
    status VARCHAR(50), -- success, failed, processing
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers (Extracted from screenshots)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    upload_id UUID REFERENCES upload_history(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    member_type VARCHAR(50), -- Retail Customer, Wholesale, Wellness Advocate
    country_code VARCHAR(10),
    enrollment_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, email)
);

-- Email Sends (Track every email sent)
CREATE TABLE email_sends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    language VARCHAR(50),
    message_type VARCHAR(20), -- retail, wholesale, advocate
    status VARCHAR(50), -- sent, failed, bounced
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    bounced_at TIMESTAMP,
    error_message TEXT
);

-- Usage Tracking (Rate limiting and analytics)
CREATE TABLE usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tracked_date DATE NOT NULL,
    emails_sent_count INTEGER DEFAULT 0,
    ocr_api_calls INTEGER DEFAULT 0,
    total_api_cost DECIMAL(10,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tracked_date)
);

-- Billing and Subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    plan VARCHAR(50), -- starter, professional, enterprise
    status VARCHAR(50), -- active, canceled, past_due
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment History
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stripe_payment_id VARCHAR(255),
    amount_cents INTEGER,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50), -- succeeded, failed, pending
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_customers_user_email ON customers(user_id, email);
CREATE INDEX idx_email_sends_user_date ON email_sends(user_id, sent_at);
CREATE INDEX idx_usage_tracking_user_date ON usage_tracking(user_id, tracked_date);
CREATE INDEX idx_country_mappings_user ON country_mappings(user_id);
CREATE INDEX idx_email_templates_user_type ON email_templates(user_id, message_type);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample Data (for development)
-- INSERT INTO users (email, password_hash, full_name, onboarding_completed) 
-- VALUES ('alessandro@example.com', '$2b$12$...', 'Alessandro Brozzi', TRUE);

-- Views for Analytics
CREATE VIEW user_stats AS
SELECT 
    u.id as user_id,
    u.email,
    u.full_name,
    COUNT(DISTINCT c.id) as total_customers,
    COUNT(DISTINCT es.id) as total_emails_sent,
    COALESCE(SUM(ut.emails_sent_count), 0) as lifetime_emails,
    COALESCE(AVG(CASE WHEN es.opened_at IS NOT NULL THEN 1 ELSE 0 END), 0) as avg_open_rate
FROM users u
LEFT JOIN customers c ON u.id = c.user_id
LEFT JOIN email_sends es ON u.id = es.user_id
LEFT JOIN usage_tracking ut ON u.id = ut.user_id
GROUP BY u.id, u.email, u.full_name;

-- Customer Type Statistics
CREATE VIEW customer_type_stats AS
SELECT 
    user_id,
    CASE 
        WHEN member_type LIKE '%Retail%' THEN 'retail'
        WHEN member_type LIKE '%Wholesale%' THEN 'wholesale'
        WHEN member_type LIKE '%Advocate%' OR member_type LIKE '%Wellness%' THEN 'advocate'
        ELSE 'other'
    END as customer_type,
    COUNT(*) as customer_count,
    COUNT(DISTINCT CASE WHEN es.id IS NOT NULL THEN c.id END) as customers_contacted,
    AVG(CASE WHEN es.opened_at IS NOT NULL THEN 1 ELSE 0 END) as open_rate
FROM customers c
LEFT JOIN email_sends es ON c.id = es.customer_id
WHERE c.is_active = TRUE
GROUP BY user_id, customer_type;

-- Rate Limiting Function
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id UUID,
    p_limit_type VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    v_hourly_limit INTEGER;
    v_daily_limit INTEGER;
    v_emails_this_hour INTEGER;
    v_emails_today INTEGER;
BEGIN
    -- Get user's limits
    SELECT max_emails_per_hour, max_emails_per_day 
    INTO v_hourly_limit, v_daily_limit
    FROM user_preferences 
    WHERE user_id = p_user_id;
    
    -- Count emails sent in last hour
    SELECT COUNT(*) INTO v_emails_this_hour
    FROM email_sends
    WHERE user_id = p_user_id
    AND sent_at > NOW() - INTERVAL '1 hour';
    
    -- Count emails sent today
    SELECT COUNT(*) INTO v_emails_today
    FROM email_sends
    WHERE user_id = p_user_id
    AND sent_at::DATE = CURRENT_DATE;
    
    -- Check limits
    IF p_limit_type = 'hourly' THEN
        RETURN v_emails_this_hour < v_hourly_limit;
    ELSIF p_limit_type = 'daily' THEN
        RETURN v_emails_today < v_daily_limit;
    ELSE
        RETURN v_emails_this_hour < v_hourly_limit AND v_emails_today < v_daily_limit;
    END IF;
END;
$$ LANGUAGE plpgsql;