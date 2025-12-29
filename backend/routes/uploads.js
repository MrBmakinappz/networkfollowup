const express = require('express');
const router = express.Router();
router.post('/screenshot', (req, res) => res.json({ message: 'OCR coming soon' }));
module.exports = router;
