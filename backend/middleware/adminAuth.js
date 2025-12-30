// middleware/adminAuth.js
// Admin authentication middleware

const jwt = require('jsonwebtoken');

const adminAuth = (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                error: 'No token provided',
                message: 'Authorization required'
            });
        }

        // Extract token
        const token = authHeader.substring(7);

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if user is admin
        if (decoded.email !== process.env.ADMIN_EMAIL) {
            return res.status(403).json({ 
                error: 'Access denied',
                message: 'Admin privileges required'
            });
        }

        // Add user info to request
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            isAdmin: true
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token expired',
                message: 'Please log in again'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                error: 'Invalid token',
                message: 'Authentication failed'
            });
        }

        return res.status(500).json({ 
            error: 'Authentication error',
            message: error.message
        });
    }
};

module.exports = adminAuth;
