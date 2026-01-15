// api/customers/index.js
// Vercel serverless function for getting customer list

const { requireAuth } = require('../_helpers/auth');
const db = require('../../backend/config/database');

async function handler(req, res) {
    try {
        const userId = req.user.userId;
        const { limit = 100, offset = 0, type, country } = req.query;

        let query = `
            SELECT id, full_name, email, customer_type, country_code, 
                   last_contacted_at, total_emails_sent, created_at
            FROM public.customers
            WHERE user_id = $1
        `;
        const params = [userId];
        let paramIndex = 2;

        // Add filters
        if (type) {
            query += ` AND customer_type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }

        if (country) {
            query += ` AND country_code = $${paramIndex}`;
            params.push(country);
            paramIndex++;
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await db.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM public.customers WHERE user_id = $1';
        const countParams = [userId];

        if (type) {
            countQuery += ` AND customer_type = $2`;
            countParams.push(type);
        }

        if (country) {
            countQuery += ` AND country_code = $${countParams.length + 1}`;
            countParams.push(country);
        }

        const countResult = await db.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total || 0);

        res.json({
            success: true,
            data: {
                customers: result.rows,
                pagination: {
                    total: total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: (parseInt(offset) + parseInt(limit)) < total
                }
            }
        });
    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch customers',
            message: error.message
        });
    }
}

module.exports = requireAuth(handler);












