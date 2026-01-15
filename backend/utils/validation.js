/**
 * Input Validation Utilities
 * Enterprise-grade validation for all user inputs
 */

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.toLowerCase());
}

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {{valid: boolean, errors: string[]}} - Validation result
 */
function validatePassword(password) {
    const errors = [];
    
    if (!password || typeof password !== 'string') {
        errors.push('Password is required');
        return { valid: false, errors };
    }
    
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters');
    }
    if (password.length > 128) {
        errors.push('Password must be less than 128 characters');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Sanitizes string input to prevent XSS
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeString(input) {
    if (typeof input !== 'string') return '';
    
    return input
        .replace(/[<>]/g, '') // Remove < and >
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim();
}

/**
 * Sanitizes object recursively
 * @param {any} obj - Object to sanitize
 * @returns {any} - Sanitized object
 */
function sanitizeInput(obj) {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'string') {
        return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeInput(item));
    }
    
    if (typeof obj === 'object') {
        const sanitized = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                sanitized[key] = sanitizeInput(obj[key]);
            }
        }
        return sanitized;
    }
    
    return obj;
}

/**
 * Validates UUID format
 * @param {string} uuid - UUID to validate
 * @returns {boolean} - True if valid UUID
 */
function isValidUUID(uuid) {
    if (!uuid || typeof uuid !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * Validates customer type
 * @param {string} type - Customer type to validate
 * @returns {boolean} - True if valid
 */
function isValidCustomerType(type) {
    const validTypes = ['retail', 'wholesale', 'advocates'];
    return validTypes.includes(type);
}

/**
 * Validates country code (ISO 3166-1 alpha-3)
 * @param {string} code - Country code to validate
 * @returns {boolean} - True if valid format
 */
function isValidCountryCode(code) {
    if (!code || typeof code !== 'string') return false;
    return /^[A-Z]{3}$/.test(code);
}

/**
 * Validates language code (ISO 639-1)
 * @param {string} lang - Language code to validate
 * @returns {boolean} - True if valid
 */
function isValidLanguageCode(lang) {
    const validLanguages = ['en', 'it', 'de', 'fr', 'pl', 'bg', 'cs', 'ro', 'sk'];
    return validLanguages.includes(lang);
}

/**
 * Validates file type for uploads
 * @param {string} mimetype - MIME type
 * @returns {boolean} - True if valid
 */
function isValidFileType(mimetype) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    return validTypes.includes(mimetype);
}

/**
 * Validates pagination parameters
 * @param {number} limit - Limit value
 * @param {number} offset - Offset value
 * @returns {{valid: boolean, limit: number, offset: number}} - Validated values
 */
function validatePagination(limit, offset) {
    const maxLimit = 1000;
    const defaultLimit = 50;
    const defaultOffset = 0;
    
    let validLimit = parseInt(limit) || defaultLimit;
    let validOffset = parseInt(offset) || defaultOffset;
    
    if (validLimit < 1) validLimit = defaultLimit;
    if (validLimit > maxLimit) validLimit = maxLimit;
    if (validOffset < 0) validOffset = defaultOffset;
    
    return {
        valid: true,
        limit: validLimit,
        offset: validOffset
    };
}

module.exports = {
    isValidEmail,
    validatePassword,
    sanitizeString,
    sanitizeInput,
    isValidUUID,
    isValidCustomerType,
    isValidCountryCode,
    isValidLanguageCode,
    isValidFileType,
    validatePagination
};















