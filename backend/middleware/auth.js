// JWT Authentication Middleware
// Verifies JWT tokens and protects routes

const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        
        if (!token) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'No token provided'
            });
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if user still exists in database
        const result = await db.query(
            'SELECT id, email, full_name, is_admin FROM users WHERE id = $1',
            [decoded.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'Invalid token',
                message: 'User no longer exists'
            });
        }
        
        // Attach user info to request
        req.user = {
            id: decoded.userId,
            email: result.rows[0].email,
            name: result.rows[0].full_name,
            isAdmin: result.rows[0].is_admin
        };
        
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({
                error: 'Invalid token',
                message: 'Token verification failed'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({
                error: 'Token expired',
                message: 'Please log in again'
            });
        }
        
        return res.status(500).json({
            error: 'Authentication failed',
            message: 'Internal server error'
        });
    }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            req.user = null;
            return next();
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const result = await db.query(
            'SELECT id, email, full_name, is_admin FROM users WHERE id = $1',
            [decoded.userId]
        );
        
        if (result.rows.length > 0) {
            req.user = {
                id: decoded.userId,
                email: result.rows[0].email,
                name: result.rows[0].full_name,
                isAdmin: result.rows[0].is_admin
            };
        } else {
            req.user = null;
        }
        
        next();
    } catch (error) {
        req.user = null;
        next();
    }
};

module.exports = {
    authenticateToken,
    optionalAuth
};
