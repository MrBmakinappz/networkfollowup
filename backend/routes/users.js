const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/database');

router.get('/me', authenticateToken, async (req, res) => {
    const result = await db.query('SELECT id, email, full_name FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
});

module.exports = router;
