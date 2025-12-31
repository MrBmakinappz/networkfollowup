/**
 * Application Constants
 * Centralized constants to avoid magic numbers and strings
 */

// Rate Limiting
const RATE_LIMITS = {
    API: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100
    },
    AUTH: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5
    },
    EMAIL: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 50
    }
};

// Password Requirements
const PASSWORD = {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true
};

// File Upload Limits
const UPLOAD = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    MAX_DIMENSION: 5000 // pixels
};

// Pagination
const PAGINATION = {
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 1000,
    DEFAULT_OFFSET: 0
};

// Customer Types
const CUSTOMER_TYPES = {
    RETAIL: 'retail',
    WHOLESALE: 'wholesale',
    ADVOCATES: 'advocates'
};

// Supported Languages
const LANGUAGES = {
    ENGLISH: 'en',
    ITALIAN: 'it',
    GERMAN: 'de',
    FRENCH: 'fr',
    POLISH: 'pl',
    BULGARIAN: 'bg',
    CZECH: 'cs',
    ROMANIAN: 'ro',
    SLOVAK: 'sk'
};

// Subscription Tiers
const SUBSCRIPTION_TIERS = {
    STARTER: 'starter',
    PROFESSIONAL: 'pro',
    ENTERPRISE: 'enterprise'
};

// Email Status
const EMAIL_STATUS = {
    SENT: 'sent',
    FAILED: 'failed',
    PENDING: 'pending'
};

// JWT Configuration
const JWT = {
    EXPIRES_IN: '30d',
    ALGORITHM: 'HS256'
};

// Database Query Timeouts
const DB_TIMEOUT = {
    CONNECTION: 2000, // 2 seconds
    QUERY: 30000 // 30 seconds
};

// API Response Messages
const MESSAGES = {
    SUCCESS: {
        USER_CREATED: 'User created successfully',
        LOGIN_SUCCESS: 'Login successful',
        CUSTOMER_CREATED: 'Customer created successfully',
        CUSTOMER_UPDATED: 'Customer updated successfully',
        CUSTOMER_DELETED: 'Customer deleted successfully',
        EMAIL_SENT: 'Email sent successfully',
        GMAIL_CONNECTED: 'Gmail connected successfully'
    },
    ERROR: {
        VALIDATION_FAILED: 'Validation failed',
        UNAUTHORIZED: 'Unauthorized access',
        NOT_FOUND: 'Resource not found',
        SERVER_ERROR: 'Internal server error',
        RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
        INVALID_CREDENTIALS: 'Invalid email or password',
        USER_EXISTS: 'User already exists',
        GMAIL_NOT_CONNECTED: 'Gmail not connected'
    }
};

// HTTP Status Codes
const STATUS_CODES = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    RATE_LIMIT: 429,
    SERVER_ERROR: 500
};

module.exports = {
    RATE_LIMITS,
    PASSWORD,
    UPLOAD,
    PAGINATION,
    CUSTOMER_TYPES,
    LANGUAGES,
    SUBSCRIPTION_TIERS,
    EMAIL_STATUS,
    JWT,
    DB_TIMEOUT,
    MESSAGES,
    STATUS_CODES
};

