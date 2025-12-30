// routes/admin.js
// Admin dashboard routes

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const adminAuth = require('../middleware/adminAuth');

// All admin routes require admin authentication
router.use(adminAuth);

/**
 * GET /api/admin/stats
 * Get overall platform statistics
 */
router.get('/stats', async (req, res) => {
    try {
        // Total users
        const usersResult = await db.query('SELECT COUNT(*) as count FROM users');
        const totalUsers = parseInt(usersResult.rows[0].count);

        // Active subscriptions
        const subsResult = await db.query(
            "SELECT COUNT(*) as count FROM users WHERE subscription_plan != 'free'"
        );
        const activeSubscriptions = parseInt(subsResult.rows[0].count);

        // Monthly recurring revenue
        const mrrResult = await db.query(`
            SELECT 
                COUNT(CASE WHEN subscription_plan = 'starter' THEN 1 END) * 29 +
                COUNT(CASE WHEN subscription_plan = 'pro' THEN 1 END) * 79 +
                COUNT(CASE WHEN subscription_plan = 'enterprise' THEN 1 END) * 199 as mrr
            FROM users
            WHERE subscription_plan != 'free'
        `);
        const mrr = parseInt(mrrResult.rows[0].mrr) || 0;

        // Total emails sent
        const emailsResult = await db.query('SELECT COUNT(*) as count FROM email_sends');
        const totalEmails = parseInt(emailsResult.rows[0].count);

        // Total customers extracted
        const customersResult = await db.query('SELECT COUNT(*) as count FROM customers');
        const totalCustomers = parseInt(customersResult.rows[0].count);

        // Users by plan
        const planResult = await db.query(`
            SELECT subscription_plan, COUNT(*) as count 
            FROM users 
            GROUP BY subscription_plan
        `);
        const usersByPlan = {};
        planResult.rows.forEach(row => {
            usersByPlan[row.subscription_plan] = parseInt(row.count);
        });

        // Growth (last 30 days)
        const growthResult = await db.query(`
            SELECT COUNT(*) as count 
            FROM users 
            WHERE created_at >= NOW() - INTERVAL '30 days'
        `);
        const newUsersLast30Days = parseInt(growthResult.rows[0].count);

        res.json({
            totalUsers,
            activeSubscriptions,
            mrr,
            totalEmails,
            totalCustomers,
            usersByPlan,
            newUsersLast30Days,
            conversionRate: totalUsers > 0 ? ((activeSubscriptions / totalUsers) * 100).toFixed(2) : 0
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

/**
 * GET /api/admin/users
 * Get all users with pagination
 */
router.get('/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        let query = `
            SELECT 
                u.id, u.email, u.full_name, u.subscription_plan, 
                u.created_at, u.onboarding_completed,
                COUNT(DISTINCT c.id) as customer_count,
                COUNT(DISTINCT e.id) as email_count
            FROM users u
            LEFT JOIN customers c ON u.id = c.user_id
            LEFT JOIN email_sends e ON u.id = e.user_id
        `;

        const params = [];
        if (search) {
            query += ` WHERE u.email ILIKE $1 OR u.full_name ILIKE $1`;
            params.push(`%${search}%`);
        }

        query += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        // Get total count
        const countQuery = search
            ? `SELECT COUNT(*) FROM users WHERE email ILIKE $1 OR full_name ILIKE $1`
            : `SELECT COUNT(*) FROM users`;
        const countParams = search ? [`%${search}%`] : [];
        const countResult = await db.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        res.json({
            users: result.rows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/**
 * GET /api/admin/users/:id
 * Get detailed user information
 */
router.get('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // User info
        const userResult = await db.query('SELECT * FROM users WHERE id = $1', [id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Usage stats
        const usageResult = await db.query('SELECT * FROM usage_tracking WHERE user_id = $1', [id]);
        const usage = usageResult.rows[0] || null;

        // Customer count
        const customerResult = await db.query('SELECT COUNT(*) FROM customers WHERE user_id = $1', [id]);
        const customerCount = parseInt(customerResult.rows[0].count);

        // Email count
        const emailResult = await db.query('SELECT COUNT(*) FROM email_sends WHERE user_id = $1', [id]);
        const emailCount = parseInt(emailResult.rows[0].count);

        // Stripe info
        const stripeResult = await db.query('SELECT * FROM stripe_customers WHERE user_id = $1', [id]);
        const stripeInfo = stripeResult.rows[0] || null;

        res.json({
            user,
            usage,
            customerCount,
            emailCount,
            stripeInfo
        });
    } catch (error) {
        console.error('Admin user detail error:', error);
        res.status(500).json({ error: 'Failed to fetch user details' });
    }
});

/**
 * PUT /api/admin/users/:id/subscription
 * Update user subscription (manual override)
 */
router.put('/users/:id/subscription', async (req, res) => {
    try {
        const { id } = req.params;
        const { subscription_plan } = req.body;

        if (!['free', 'starter', 'pro', 'enterprise'].includes(subscription_plan)) {
            return res.status(400).json({ error: 'Invalid subscription plan' });
        }

        await db.query(
            'UPDATE users SET subscription_plan = $1 WHERE id = $2',
            [subscription_plan, id]
        );

        res.json({ success: true, message: 'Subscription updated' });
    } catch (error) {
        console.error('Admin subscription update error:', error);
        res.status(500).json({ error: 'Failed to update subscription' });
    }
});

/**
 * DELETE /api/admin/users/:id
 * Delete user account (careful!)
 */
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await db.query('DELETE FROM users WHERE id = $1', [id]);

        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        console.error('Admin user delete error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

/**
 * GET /api/admin/revenue
 * Get revenue analytics
 */
router.get('/revenue', async (req, res) => {
    try {
        // Monthly revenue breakdown
        const revenueResult = await db.query(`
            SELECT 
                DATE_TRUNC('month', created_at) as month,
                subscription_plan,
                COUNT(*) as count,
                CASE 
                    WHEN subscription_plan = 'starter' THEN 29
                    WHEN subscription_plan = 'pro' THEN 79
                    WHEN subscription_plan = 'enterprise' THEN 199
                    ELSE 0
                END * COUNT(*) as revenue
            FROM users
            WHERE subscription_plan != 'free'
            GROUP BY DATE_TRUNC('month', created_at), subscription_plan
            ORDER BY month DESC
            LIMIT 12
        `);

        res.json({ revenueByMonth: revenueResult.rows });
    } catch (error) {
        console.error('Admin revenue error:', error);
        res.status(500).json({ error: 'Failed to fetch revenue data' });
    }
});

module.exports = router;
