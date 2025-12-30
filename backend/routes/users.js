const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/database');

router.get('/me', authenticateToken, async (req, res) => {
    const result = await db.query('SELECT id, email, full_name FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
});

// Get user dashboard stats
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get total emails sent
        const emailsResult = await db.query(
            'SELECT COUNT(*) as total FROM email_sends WHERE user_id = $1',
            [userId]
        );

        // Get emails this month
        const emailsMonthResult = await db.query(
            `SELECT COUNT(*) as total FROM email_sends 
             WHERE user_id = $1 AND sent_at >= date_trunc('month', CURRENT_DATE)`,
            [userId]
        );

        // Get total customers
        const customersResult = await db.query(
            'SELECT COUNT(*) as total FROM customers WHERE user_id = $1',
            [userId]
        );

        // Check Gmail connection
        const gmailResult = await db.query(
            'SELECT COUNT(*) as total FROM gmail_connections WHERE user_id = $1 AND access_token IS NOT NULL',
            [userId]
        );

        res.json({
            totalEmails: parseInt(emailsResult.rows[0].total),
            emailsThisMonth: parseInt(emailsMonthResult.rows[0].total),
            totalCustomers: parseInt(customersResult.rows[0].total),
            gmailConnected: parseInt(gmailResult.rows[0].total) > 0
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

module.exports = router;
