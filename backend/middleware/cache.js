/**
 * Simple in-memory cache middleware
 * For production, consider using Redis
 */

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Cache middleware
 * @param {number} ttl - Time to live in milliseconds
 */
function cacheMiddleware(ttl = CACHE_TTL) {
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const key = `${req.originalUrl}:${req.user?.userId || 'anonymous'}`;
        const cached = cache.get(key);

        if (cached && Date.now() - cached.timestamp < ttl) {
            // Return cached response
            return res.json(cached.data);
        }

        // Store original json method
        const originalJson = res.json.bind(res);

        // Override json method to cache response
        res.json = function(data) {
            if (res.statusCode === 200 && data.success) {
                cache.set(key, {
                    data,
                    timestamp: Date.now()
                });
            }
            return originalJson(data);
        };

        next();
    };
}

/**
 * Clear cache for a specific pattern
 */
function clearCache(pattern) {
    for (const key of cache.keys()) {
        if (key.includes(pattern)) {
            cache.delete(key);
        }
    }
}

/**
 * Clear all cache
 */
function clearAllCache() {
    cache.clear();
}

// Clean up expired cache entries every minute
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            cache.delete(key);
        }
    }
}, 60 * 1000);

module.exports = {
    cacheMiddleware,
    clearCache,
    clearAllCache
};















