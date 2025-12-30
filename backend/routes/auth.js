// routes/auth.js
// Authentication routes (signup/login)

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

/**
 * POST /api/auth/signup
 * Create new user account
 */
router.post('/signup', async (req, res) => {
    try {
        const { email, password, full_name } = req.body;

        // Validation
        if (!email || !password || !full_name) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                message: 'Email, password, and full name are required'
            });
        }

        // Check if user exists
        const existingUser = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ 
                error: 'User already exists',
                message: 'An account with this email already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const result = await db.query(
            `INSERT INTO users (email, password_hash, full_name, subscription_plan) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, email, full_name, subscription_plan, created_at`,
            [email.toLowerCase(), hashedPassword, full_name, 'free']
        );

        const user = result.rows[0];

        // Initialize usage tracking
        await db.query(
            `INSERT INTO usage_tracking (user_id) VALUES ($1)
             ON CONFLICT (user_id) DO NOTHING`,
            [user.id]
        );

        // Initialize user preferences
        await db.query(
            `INSERT INTO user_preferences (user_id) VALUES ($1)
             ON CONFLICT (user_id) DO NOTHING`,
            [user.id]
        );

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                subscription_plan: user.subscription_plan
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ 
            error: 'Signup failed',
            message: error.message
        });
    }
});

/**
 * POST /api/auth/login
 * Login existing user
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Missing credentials',
                message: 'Email and password are required'
            });
        }

        // Find user
        const result = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

        const user = result.rows[0];

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ 
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                subscription_plan: user.subscription_plan
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            error: 'Login failed',
            message: error.message
        });
    }
});

module.exports = router;
