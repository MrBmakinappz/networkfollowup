/**
 * Production-Safe Logging Utility
 * Only logs in development, errors always logged
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Log info messages (only in development)
 */
function log(...args) {
    if (isDevelopment) {
        console.log(...args);
    }
}

/**
 * Log errors (always logged, even in production)
 */
function error(...args) {
    console.error(...args);
}

/**
 * Log warnings (only in development)
 */
function warn(...args) {
    if (isDevelopment) {
        console.warn(...args);
    }
}

/**
 * Log debug messages (only in development)
 */
function debug(...args) {
    if (isDevelopment) {
        console.debug(...args);
    }
}

module.exports = {
    log,
    error,
    warn,
    debug,
    isDevelopment
};











