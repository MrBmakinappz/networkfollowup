// middleware/onboarding.js
// Check if user has completed onboarding

const db = require('../config/database');
const { log, error } = require('../utils/logger');

/**
 * Middleware to check if user has completed onboarding
 * Redirects to onboarding if not completed
 */
const checkOnboarding = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        // Check onboarding status
        const result = await db.query(
            'SELECT onboarding_completed FROM public.users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                message: 'User account not found'
            });
        }

        const user = result.rows[0];

        // Check onboarding status - be explicit about true/false
        const onboardingCompleted = user.onboarding_completed === true || user.onboarding_completed === 'true';
        
        if (!onboardingCompleted) {
            log(`⚠️ User ${userId} attempted to access protected route without completing onboarding`);
            return res.status(403).json({
                success: false,
                error: 'Onboarding required',
                message: 'Please complete onboarding before accessing this feature',
                requiresOnboarding: true,
                onboardingUrl: `${process.env.FRONTEND_URL || 'https://networkfollowup.netlify.app'}/onboarding.html`
            });
        }

        log(`✅ User ${userId} onboarding check passed`);

        // Onboarding completed, continue
        next();
    } catch (err) {
        error('Onboarding check error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to check onboarding status',
            message: err.message
        });
    }
};

module.exports = checkOnboarding;


