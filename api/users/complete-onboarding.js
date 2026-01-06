// api/users/complete-onboarding.js
// Vercel serverless function for completing onboarding

const { requireAuth } = require('../_helpers/auth');
const db = require('../../backend/config/database');

async function handler(req, res) {
    try {
        const userId = req.user.userId;

        // Update user onboarding status
        await db.query(
            'UPDATE public.users SET onboarding_completed = TRUE WHERE id = $1',
            [userId]
        );

        console.log(`User ${userId} completed onboarding`);

        res.json({
            success: true,
            message: 'Onboarding completed successfully',
            redirectTo: '/dashboard.html'
        });
    } catch (error) {
        console.error('Complete onboarding error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to complete onboarding',
            message: error.message
        });
    }
}

module.exports = requireAuth(handler);



