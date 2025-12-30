// routes/customers.js
// Customer management CRUD

const express = require('express');
const router = express.Router();
const db = require('../config/database');

/**
 * GET /api/customers
 * Get all customers for user with optional filters
 */
router.get('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { type, country, email_sent, search, limit = 100, offset = 0 } = req.query;

        let query = 'SELECT * FROM customers WHERE user_id = $1';
        const params = [userId];
        let paramCount = 1;

        // Apply filters
        if (type) {
            paramCount++;
            query += ` AND customer_type = $${paramCount}`;
            params.push(type);
        }

        if (country) {
            paramCount++;
            query += ` AND country_code = $${paramCount}`;
            params.push(country);
        }

        if (email_sent !== undefined) {
            paramCount++;
            query += ` AND email_sent = $${paramCount}`;
            params.push(email_sent === 'true');
        }

        if (search) {
            paramCount++;
            query += ` AND (full_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        query += ' ORDER BY created_at DESC';
        
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(parseInt(limit));

        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(parseInt(offset));

        const result = await db.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM customers WHERE user_id = $1';
        const countResult = await db.query(countQuery, [userId]);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

/**
 * GET /api/customers/stats
 * Get customer statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user.userId;

        // Overall stats
        const statsResult = await db.query(
            `SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN customer_type = 'retail' THEN 1 END) as retail,
                COUNT(CASE WHEN customer_type = 'wholesale' THEN 1 END) as wholesale,
                COUNT(CASE WHEN customer_type = 'advocates' THEN 1 END) as advocates,
                COUNT(CASE WHEN email_sent = TRUE THEN 1 END) as contacted,
                COUNT(CASE WHEN email_sent = FALSE THEN 1 END) as pending,
                COUNT(DISTINCT country_code) as countries
             FROM customers
             WHERE user_id = $1`,
            [userId]
        );

        // Country breakdown
        const countryResult = await db.query(
            `SELECT country_code, COUNT(*) as count
             FROM customers
             WHERE user_id = $1
             GROUP BY country_code
             ORDER BY count DESC`,
            [userId]
        );

        // Language breakdown
        const languageResult = await db.query(
            `SELECT language, COUNT(*) as count
             FROM customers
             WHERE user_id = $1
             GROUP BY language
             ORDER BY count DESC`,
            [userId]
        );

        res.json({
            success: true,
            data: {
                overview: statsResult.rows[0],
                by_country: countryResult.rows,
                by_language: languageResult.rows
            }
        });
    } catch (error) {
        console.error('Customer stats error:', error);
        res.status(500).json({ error: 'Failed to fetch customer statistics' });
    }
});

/**
 * GET /api/customers/:id
 * Get single customer
 */
router.get('/:id', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        const result = await db.query(
            'SELECT * FROM customers WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get customer error:', error);
        res.status(500).json({ error: 'Failed to fetch customer' });
    }
});

/**
 * POST /api/customers
 * Create new customer manually
 */
router.post('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { full_name, email, customer_type, country_code, language, notes } = req.body;

        // Validation
        if (!full_name || !email || !customer_type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const validTypes = ['retail', 'wholesale', 'advocates'];
        if (!validTypes.includes(customer_type)) {
            return res.status(400).json({ error: 'Invalid customer type' });
        }

        const result = await db.query(
            `INSERT INTO customers (user_id, full_name, email, customer_type, country_code, language, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (user_id, email) DO UPDATE SET
                full_name = EXCLUDED.full_name,
                customer_type = EXCLUDED.customer_type,
                country_code = EXCLUDED.country_code,
                language = EXCLUDED.language,
                notes = EXCLUDED.notes,
                updated_at = NOW()
             RETURNING *`,
            [userId, full_name, email.toLowerCase(), customer_type, country_code || 'USA', language || 'en', notes || null]
        );

        res.status(201).json({
            success: true,
            message: 'Customer created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Create customer error:', error);
        res.status(500).json({ error: 'Failed to create customer' });
    }
});

/**
 * PUT /api/customers/:id
 * Update customer
 */
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { full_name, email, customer_type, country_code, language, notes } = req.body;

        // Check if customer exists and belongs to user
        const checkResult = await db.query(
            'SELECT * FROM customers WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const result = await db.query(
            `UPDATE customers 
             SET full_name = COALESCE($1, full_name),
                 email = COALESCE($2, email),
                 customer_type = COALESCE($3, customer_type),
                 country_code = COALESCE($4, country_code),
                 language = COALESCE($5, language),
                 notes = COALESCE($6, notes),
                 updated_at = NOW()
             WHERE id = $7 AND user_id = $8
             RETURNING *`,
            [full_name, email, customer_type, country_code, language, notes, id, userId]
        );

        res.json({
            success: true,
            message: 'Customer updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update customer error:', error);
        res.status(500).json({ error: 'Failed to update customer' });
    }
});

/**
 * DELETE /api/customers/:id
 * Delete customer
 */
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        const result = await db.query(
            'DELETE FROM customers WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.json({
            success: true,
            message: 'Customer deleted successfully'
        });
    } catch (error) {
        console.error('Delete customer error:', error);
        res.status(500).json({ error: 'Failed to delete customer' });
    }
});

/**
 * DELETE /api/customers
 * Delete all customers (with confirmation)
 */
router.delete('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { confirm } = req.query;

        if (confirm !== 'yes') {
            return res.status(400).json({ 
                error: 'Confirmation required',
                message: 'Add ?confirm=yes to the URL to delete all customers'
            });
        }

        const result = await db.query(
            'DELETE FROM customers WHERE user_id = $1',
            [userId]
        );

        res.json({
            success: true,
            message: `Deleted ${result.rowCount} customers`
        });
    } catch (error) {
        console.error('Delete all customers error:', error);
        res.status(500).json({ error: 'Failed to delete customers' });
    }
});

module.exports = router;
