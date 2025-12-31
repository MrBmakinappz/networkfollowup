// routes/stats.js
// Dashboard statistics

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { cacheMiddleware } = require('../middleware/cache');
const { log, error } = require('../utils/logger');

/**
 * GET /api/users/stats
 * Get dashboard statistics for user
 * Cached for 5 minutes
 */
router.get('/stats', cacheMiddleware(5 * 60 * 1000), async (req, res) => {
    try {
        const userId = req.user.userId;

        // Customer stats - use public schema, no tenant logic
        const customerStats = await db.query(
            `SELECT 
                COUNT(*) as total_customers,
                COUNT(CASE WHEN member_type = 'retail' OR customer_type = 'retail' THEN 1 END) as retail_count,
                COUNT(CASE WHEN member_type = 'wholesale' OR customer_type = 'wholesale' THEN 1 END) as wholesale_count,
                COUNT(CASE WHEN member_type = 'advocates' OR customer_type = 'advocates' THEN 1 END) as advocates_count,
                COUNT(CASE WHEN last_contacted_at IS NOT NULL THEN 1 END) as contacted_count,
                COUNT(CASE WHEN last_contacted_at IS NULL THEN 1 END) as pending_count,
                COUNT(DISTINCT country_code) as countries_count
             FROM public.customers
             WHERE user_id = $1`,
            [userId]
        );

        // Email stats - use public schema
        const emailStats = await db.query(
            `SELECT 
                COUNT(*) as total_emails,
                COUNT(CASE WHEN status = 'sent' THEN 1 END) as emails_sent,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as emails_failed,
                COUNT(CASE WHEN DATE(sent_at) = CURRENT_DATE THEN 1 END) as emails_today,
                COUNT(CASE WHEN DATE_TRUNC('month', sent_at) = DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as emails_this_month
             FROM public.email_sends
             WHERE user_id = $1`,
            [userId]
        );

        // Gmail connection status - use public schema
        const gmailStatus = await db.query(
            'SELECT gmail_email FROM public.gmail_connections WHERE user_id = $1',
            [userId]
        );

        // Country breakdown - use public schema
        const countryBreakdown = await db.query(
            `SELECT country_code, COUNT(*) as count
             FROM public.customers
             WHERE user_id = $1
             GROUP BY country_code
             ORDER BY count DESC`,
            [userId]
        );

        // Recent activity - use public schema
        const recentUploads = await db.query(
            `SELECT COUNT(*) as upload_count
             FROM public.upload_history
             WHERE user_id = $1 AND uploaded_at > NOW() - INTERVAL '30 days'`,
            [userId]
        );

        res.json({
            success: true,
            data: {
                customers: {
                    total: parseInt(customerStats.rows[0].total_customers || 0),
                    retail: parseInt(customerStats.rows[0].retail_count || 0),
                    wholesale: parseInt(customerStats.rows[0].wholesale_count || 0),
                    advocates: parseInt(customerStats.rows[0].advocates_count || 0),
                    contacted: parseInt(customerStats.rows[0].contacted_count || 0),
                    pending: parseInt(customerStats.rows[0].pending_count || 0),
                    countries: parseInt(customerStats.rows[0].countries_count || 0)
                },
                emails: {
                    total: parseInt(emailStats.rows[0].total_emails || 0),
                    sent: parseInt(emailStats.rows[0].emails_sent || 0),
                    failed: parseInt(emailStats.rows[0].emails_failed || 0),
                    today: parseInt(emailStats.rows[0].emails_today || 0),
                    thisMonth: parseInt(emailStats.rows[0].emails_this_month || 0)
                },
                gmail: {
                    connected: gmailStatus.rows.length > 0,
                    email: gmailStatus.rows[0]?.gmail_email || null
                },
                countryBreakdown: countryBreakdown.rows,
                recentActivity: {
                    uploads: parseInt(recentUploads.rows[0].upload_count || 0)
                }
            }
        });
    } catch (error) {
        error('Stats error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch statistics',
            message: error.message
        });
    }
});

/**
 * GET /api/users/billing
 * Get billing and usage information
 */
router.get('/billing', async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get user and subscription info
        const userResult = await db.query(
            'SELECT subscription_tier, created_at FROM public.users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const subscriptionPlan = userResult.rows[0].subscription_tier || userResult.rows[0].subscription_plan || 'starter';

        // Get usage tracking
        const usageResult = await db.query(
            `SELECT emails_sent_today, emails_sent_this_month, uploads_this_month, daily_reset_date, monthly_reset_date
             FROM public.usage_tracking
             WHERE user_id = $1`,
            [userId]
        );

        let usage = {
            emailsSentToday: 0,
            emailsSentThisMonth: 0,
            uploadsThisMonth: 0,
            dailyResetDate: new Date().toISOString().split('T')[0],
            monthlyResetDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
        };

        if (usageResult.rows.length > 0) {
            usage = {
                emailsSentToday: usageResult.rows[0].emails_sent_today || 0,
                emailsSentThisMonth: usageResult.rows[0].emails_sent_this_month || 0,
                uploadsThisMonth: usageResult.rows[0].uploads_this_month || 0,
                dailyResetDate: usageResult.rows[0].daily_reset_date,
                monthlyResetDate: usageResult.rows[0].monthly_reset_date
            };
        }

        // Define plan limits
        const planLimits = {
            free: {
                emailsPerMonth: 10,
                emailsPerDay: 10,
                uploadsPerMonth: 1
            },
            pro: {
                emailsPerMonth: 500,
                emailsPerDay: 500,
                uploadsPerMonth: 50
            },
            enterprise: {
                emailsPerMonth: 999999,
                emailsPerDay: 999999,
                uploadsPerMonth: 999999
            }
        };

        const limits = planLimits[subscriptionPlan];

        // Get Stripe info if exists
        const stripeResult = await db.query(
            'SELECT * FROM public.stripe_customers WHERE user_id = $1',
            [userId]
        );

        let stripeInfo = null;
        if (stripeResult.rows.length > 0) {
            stripeInfo = {
                subscriptionStatus: stripeResult.rows[0].subscription_status,
                currentPeriodEnd: stripeResult.rows[0].current_period_end,
                cancelAtPeriodEnd: stripeResult.rows[0].cancel_at_period_end
            };
        }

        res.json({
            success: true,
            data: {
                plan: subscriptionPlan,
                usage: usage,
                limits: limits,
                stripe: stripeInfo,
                percentages: {
                    emails: Math.round((usage.emailsSentThisMonth / limits.emailsPerMonth) * 100),
                    uploads: Math.round((usage.uploadsThisMonth / limits.uploadsPerMonth) * 100)
                }
            }
        });
    } catch (error) {
        error('Billing info error:', err);
        res.status(500).json({ error: 'Failed to fetch billing information' });
    }
});

module.exports = router;
