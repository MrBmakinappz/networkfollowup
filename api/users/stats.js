// api/users/stats.js
// Vercel serverless function for user dashboard statistics

const { requireAuth } = require('../_helpers/auth');
const db = require('../../backend/config/database');

async function handler(req, res) {
    try {
        const userId = req.user.userId;

        // Customer stats
        const customerStats = await db.query(
            `SELECT 
                COUNT(*) as total_customers,
                COUNT(CASE WHEN customer_type = 'retail' THEN 1 END) as retail_count,
                COUNT(CASE WHEN customer_type = 'wholesale' THEN 1 END) as wholesale_count,
                COUNT(CASE WHEN customer_type = 'advocates' THEN 1 END) as advocates_count,
                COUNT(CASE WHEN last_contacted_at IS NOT NULL THEN 1 END) as contacted_count,
                COUNT(CASE WHEN last_contacted_at IS NULL THEN 1 END) as pending_count,
                COUNT(DISTINCT country_code) as countries_count
             FROM public.customers
             WHERE user_id = $1`,
            [userId]
        );

        // Email stats
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

        // Gmail connection status
        const gmailStatus = await db.query(
            'SELECT gmail_email FROM public.gmail_connections WHERE user_id = $1 AND is_connected = TRUE',
            [userId]
        );

        // Country breakdown
        const countryBreakdown = await db.query(
            `SELECT country_code, COUNT(*) as count
             FROM public.customers
             WHERE user_id = $1
             GROUP BY country_code
             ORDER BY count DESC`,
            [userId]
        );

        // Recent activity
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
        console.error('Stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics',
            message: error.message
        });
    }
}

module.exports = requireAuth(handler);

