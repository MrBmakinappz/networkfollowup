// middleware/auth.js
// JWT Authentication Middleware

const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('❌ Auth middleware: No token provided');
            console.error('   Request path:', req.path);
            console.error('   Authorization header:', authHeader ? 'Present but invalid' : 'Missing');
            return res.status(401).json({ 
                success: false,
                error: 'No token provided',
                message: 'Authorization header missing or invalid'
            });
        }

        // Extract token
        const token = authHeader.substring(7); // Remove 'Bearer '

        if (!token || token === 'null' || token === 'undefined') {
            console.error('❌ Auth middleware: Token is null/undefined');
            return res.status(401).json({ 
                success: false,
                error: 'Invalid token',
                message: 'Token is missing or invalid'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded || !decoded.userId) {
            console.error('❌ Auth middleware: Token decoded but missing userId');
            return res.status(401).json({ 
                success: false,
                error: 'Invalid token',
                message: 'Token does not contain user information'
            });
        }

        // Add user info to request
        req.user = {
            userId: decoded.userId,
            email: decoded.email
        };

        next();
    } catch (error) {
        console.error('❌ Auth middleware error:', error.name, error.message);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                error: 'Token expired',
                message: 'Please log in again'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid token',
                message: 'Authentication failed'
            });
        }

        return res.status(500).json({ 
            success: false,
            error: 'Authentication error',
            message: error.message
        });
    }
};

module.exports = authMiddleware;
