// Admin Middleware
// Checks if user has admin privileges

const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required'
        });
    }
    
    if (!req.user.isAdmin) {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Admin access required'
        });
    }
    
    next();
};

module.exports = { requireAdmin };
