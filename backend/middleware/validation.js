/**
 * Validation Middleware
 * Validates and sanitizes request data
 */

const { 
    isValidEmail, 
    validatePassword, 
    sanitizeInput,
    isValidUUID,
    isValidCustomerType,
    isValidCountryCode,
    isValidLanguageCode,
    validatePagination
} = require('../utils/validation');

/**
 * Middleware to sanitize all request body data
 */
function sanitizeBody(req, res, next) {
    if (req.body) {
        req.body = sanitizeInput(req.body);
    }
    if (req.query) {
        req.query = sanitizeInput(req.query);
    }
    if (req.params) {
        req.params = sanitizeInput(req.params);
    }
    next();
}

/**
 * Validates signup request
 */
function validateSignup(req, res, next) {
    const { email, password, full_name } = req.body;
    
    const errors = [];
    
    if (!email || !isValidEmail(email)) {
        errors.push('Valid email is required');
    }
    
    if (!password) {
        errors.push('Password is required');
    } else {
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            errors.push(...passwordValidation.errors);
        }
    }
    
    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
        errors.push('Full name must be at least 2 characters');
    }
    
    if (full_name && full_name.length > 100) {
        errors.push('Full name must be less than 100 characters');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            errors
        });
    }
    
    next();
}

/**
 * Validates login request
 */
function validateLogin(req, res, next) {
    const { email, password } = req.body;
    
    if (!email || !isValidEmail(email)) {
        return res.status(400).json({
            success: false,
            error: 'Valid email is required'
        });
    }
    
    if (!password || typeof password !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Password is required'
        });
    }
    
    next();
}

/**
 * Validates customer creation/update
 */
function validateCustomer(req, res, next) {
    const { full_name, email, customer_type, country_code, language } = req.body;
    
    const errors = [];
    
    if (full_name !== undefined) {
        if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
            errors.push('Full name must be at least 2 characters');
        }
        if (full_name && full_name.length > 200) {
            errors.push('Full name must be less than 200 characters');
        }
    }
    
    if (email !== undefined && !isValidEmail(email)) {
        errors.push('Valid email is required');
    }
    
    if (customer_type !== undefined && !isValidCustomerType(customer_type)) {
        errors.push('Customer type must be: retail, wholesale, or advocates');
    }
    
    if (country_code !== undefined && !isValidCountryCode(country_code)) {
        errors.push('Country code must be 3 uppercase letters (e.g., USA, DEU)');
    }
    
    if (language !== undefined && !isValidLanguageCode(language)) {
        errors.push('Invalid language code');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            errors
        });
    }
    
    next();
}

/**
 * Validates UUID parameter
 */
function validateUUID(req, res, next) {
    const { id } = req.params;
    
    if (id && !isValidUUID(id)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid ID format'
        });
    }
    
    next();
}

/**
 * Validates pagination query parameters
 */
function validatePaginationParams(req, res, next) {
    const { limit, offset } = req.query;
    const validated = validatePagination(limit, offset);
    
    req.query.limit = validated.limit;
    req.query.offset = validated.offset;
    
    next();
}

/**
 * Validates email send request
 */
function validateEmailSend(req, res, next) {
    const { customer_ids, subject, body, template_type } = req.body;
    
    const errors = [];
    
    if (!customer_ids || !Array.isArray(customer_ids) || customer_ids.length === 0) {
        errors.push('At least one customer ID is required');
    } else {
        customer_ids.forEach((id, index) => {
            if (!isValidUUID(id)) {
                errors.push(`Invalid customer ID at index ${index}`);
            }
        });
    }
    
    if (subject !== undefined && (!subject || typeof subject !== 'string' || subject.trim().length === 0)) {
        errors.push('Subject is required');
    }
    
    if (subject && subject.length > 200) {
        errors.push('Subject must be less than 200 characters');
    }
    
    if (body !== undefined && (!body || typeof body !== 'string' || body.trim().length === 0)) {
        errors.push('Email body is required');
    }
    
    if (template_type !== undefined && !isValidCustomerType(template_type)) {
        errors.push('Invalid template type');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            errors
        });
    }
    
    next();
}

module.exports = {
    sanitizeBody,
    validateSignup,
    validateLogin,
    validateCustomer,
    validateUUID,
    validatePaginationParams,
    validateEmailSend
};













