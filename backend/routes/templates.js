/**
 * Email Templates Routes
 * User-customizable email templates with language support
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { log, error } = require('../utils/logger');
const { getLanguageName } = require('../utils/constants');

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/templates
 * Get all templates for the authenticated user
 */
router.get('/', async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await db.query(
            `SELECT id, customer_type, language, subject, body, created_at, updated_at
             FROM public.email_templates
             WHERE user_id = $1
             ORDER BY customer_type, language`,
            [userId]
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (err) {
        error('Get templates error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch templates',
            message: err.message
        });
    }
});

/**
 * GET /api/templates/:type/:language
 * Get specific template for customer type and language
 */
router.get('/:type/:language', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { type, language } = req.params;

        // Try user's template first
        let result = await db.query(
            `SELECT id, customer_type, language, subject, body
             FROM public.email_templates
             WHERE user_id = $1 AND customer_type = $2 AND language = $3
             LIMIT 1`,
            [userId, type, language]
        );

        // If not found, try user's default language
        if (result.rows.length === 0) {
            const userResult = await db.query(
                'SELECT default_language FROM public.users WHERE id = $1',
                [userId]
            );
            const defaultLang = userResult.rows[0]?.default_language || 'en';

            result = await db.query(
                `SELECT id, customer_type, language, subject, body
                 FROM public.email_templates
                 WHERE user_id = $1 AND customer_type = $2 AND language = $3
                 LIMIT 1`,
                [userId, type, defaultLang]
            );
        }

        // If still not found, try global templates (user_id = NULL)
        if (result.rows.length === 0) {
            result = await db.query(
                `SELECT id, customer_type, language, subject, body
                 FROM public.email_templates
                 WHERE user_id IS NULL AND customer_type = $1 AND language = $2
                 LIMIT 1`,
                [type, language]
            );
        }

        if (result.rows.length > 0) {
            res.json({
                success: true,
                data: result.rows[0],
                is_fallback: result.rows[0].language !== language
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Template not found',
                message: `No template found for ${type} - ${language}`
            });
        }
    } catch (err) {
        error('Get template error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch template',
            message: err.message
        });
    }
});

/**
 * POST /api/templates
 * Create or update a template
 */
router.post('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { customer_type, language, subject, body } = req.body;

        if (!customer_type || !language || !subject || !body) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'customer_type, language, subject, and body are required'
            });
        }

        const result = await db.query(
            `INSERT INTO public.email_templates (user_id, customer_type, language, subject, body)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id, customer_type, language) 
             DO UPDATE SET
               subject = EXCLUDED.subject,
               body = EXCLUDED.body,
               updated_at = NOW()
             RETURNING id, customer_type, language, subject, body, created_at, updated_at`,
            [userId, customer_type, language, subject, body]
        );

        log(`Template saved: ${customer_type} - ${language} for user ${userId}`);

        res.json({
            success: true,
            message: 'Template saved successfully',
            data: result.rows[0]
        });
    } catch (err) {
        error('Save template error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to save template',
            message: err.message
        });
    }
});

/**
 * DELETE /api/templates/:id
 * Delete a template
 */
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        const result = await db.query(
            `DELETE FROM public.email_templates
             WHERE id = $1 AND user_id = $2
             RETURNING id`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Template not found',
                message: 'Template does not exist or you do not have permission to delete it'
            });
        }

        log(`Template deleted: ${id} by user ${userId}`);

        res.json({
            success: true,
            message: 'Template deleted successfully'
        });
    } catch (err) {
        error('Delete template error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to delete template',
            message: err.message
        });
    }
});

module.exports = router;

