const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const generateToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await db.query(
        'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email',
        [email.toLowerCase(), hashedPassword, name]
    );
    const token = generateToken(result.rows[0].id);
    res.json({ success: true, token, user: result.rows[0] });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!result.rows[0] || !await bcrypt.compare(password, result.rows[0].password_hash)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = generateToken(result.rows[0].id);
    res.json({ success: true, token, user: { id: result.rows[0].id, email: result.rows[0].email, isAdmin: result.rows[0].is_admin }});
});

// Verify token endpoint
router.get('/verify', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, email, full_name, is_admin FROM users WHERE id = $1',
            [req.user.userId]
        );
        
        if (!result.rows[0]) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ 
            success: true, 
            user: {
                id: result.rows[0].id,
                email: result.rows[0].email,
                full_name: result.rows[0].full_name,
                is_admin: result.rows[0].is_admin
            }
        });
    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

module.exports = router;
