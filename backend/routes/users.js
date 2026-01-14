// routes/users.js
// User routes including stats endpoint

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

// STEP 1: Stats endpoint
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        console.log('STATS REQUEST FOR USER:', userId);
        
        const emailsResult = await db.query('SELECT COUNT(*) as count FROM email_sends WHERE user_id = $1', [userId]);
        const customersResult = await db.query('SELECT COUNT(*) as count FROM customers WHERE user_id = $1', [userId]);
        const gmailResult = await db.query('SELECT gmail_email FROM gmail_connections WHERE user_id = $1', [userId]);
        
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0,0,0,0);
        const monthResult = await db.query('SELECT COUNT(*) as count FROM email_sends WHERE user_id = $1 AND sent_at >= $2', [userId, monthStart]);
        
        const response = {
            totalEmails: parseInt(emailsResult.rows[0].count) || 0,
            emailsThisMonth: parseInt(monthResult.rows[0].count) || 0,
            totalCustomers: parseInt(customersResult.rows[0].count) || 0,
            gmailConnected: gmailResult.rows.length > 0,
            gmailEmail: gmailResult.rows[0]?.gmail_email || null
        };
        
        console.log('STATS RESPONSE:', response);
        res.json(response);
    } catch (error) {
        console.error('STATS ERROR:', error);
        res.json({ totalEmails: 0, emailsThisMonth: 0, totalCustomers: 0, gmailConnected: false, gmailEmail: null });
    }
});

module.exports = router;

