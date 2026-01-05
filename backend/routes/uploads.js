// routes/uploads.js
// Screenshot upload and OCR extraction

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const db = require('../config/database');
const { upload, optimizeImage } = require('../middleware/upload');
const { extractCustomersFromImage } = require('../utils/claude-optimized');
const { log, error } = require('../utils/logger');
const { calculateFileHash } = require('../utils/claude-optimized');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// Rate limiting: Max 10 uploads per hour per user
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 uploads per hour
    message: {
        success: false,
        error: 'Upload limit exceeded',
        message: 'Maximum 10 screenshot uploads per hour. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Rate limit per user
        return req.user?.userId || req.ip;
    }
});

/**
 * POST /api/uploads/ocr
 * Extract business card data from image using Claude Vision
 * Returns: {name, email, phone, company, role}
 */
router.post('/ocr', uploadLimiter, upload.single('image'), optimizeImage, async (req, res) => {
    try {
        const userId = req.user.userId;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded',
                message: 'Please select an image file'
            });
        }

        log('🔵 Starting business card OCR extraction');

        // Convert image to base64
        const base64Image = req.file.buffer.toString('base64');

        // Call Claude Vision API
        const message = await anthropic.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 4096,
            messages: [{
                role: "user",
                content: [
                    {
                        type: "image",
                        source: {
                            type: "base64",
                            media_type: req.file.mimetype,
                            data: base64Image,
                        }
                    },
                    {
                        type: "text",
                        text: `Extract all information from this business card image. Return ONLY a JSON object with these exact fields:
{
  "name": "Full name (First Last)",
  "email": "Email address",
  "phone": "Phone number",
  "company": "Company name",
  "role": "Job title/role"
}

If a field is not visible or cannot be extracted, use null for that field.
Return ONLY the JSON object, no markdown, no explanation.`
                    }
                ]
            }]
        });

        // Parse response
        const responseText = message.content[0].text.trim();
        let extractedData;

        try {
            // Remove markdown if present
            let jsonText = responseText;
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/```\n?/g, '');
            }
            
            extractedData = JSON.parse(jsonText);
        } catch (parseError) {
            error('JSON parse error:', parseError);
            // Try to extract JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                extractedData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Could not parse data from Claude response');
            }
        }

        // Validate and clean data
        const cleanedData = {
            name: extractedData.name ? String(extractedData.name).trim() : null,
            email: extractedData.email ? String(extractedData.email).trim().toLowerCase() : null,
            phone: extractedData.phone ? String(extractedData.phone).trim() : null,
            company: extractedData.company ? String(extractedData.company).trim() : null,
            role: extractedData.role ? String(extractedData.role).trim() : null
        };

        log('✅ Business card OCR extraction successful');

        res.json({
            success: true,
            message: 'Data extracted successfully',
            data: cleanedData
        });

    } catch (err) {
        error('Business card OCR error:', err);
        res.status(500).json({
            success: false,
            error: 'OCR extraction failed',
            message: err.message || 'Failed to extract data from image'
        });
    }
});

/**
 * POST /api/uploads/screenshot
 * Upload screenshot, extract customer data with Claude OCR, save to customers table
 * Rate limited: 10 uploads per hour per user
 */
router.post('/screenshot', uploadLimiter, upload.single('screenshot'), optimizeImage, async (req, res) => {
    try {
        const userId = req.user.userId;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded',
                message: 'Please select a screenshot file'
            });
        }

        // Calculate file hash for caching
        const fileHash = calculateFileHash(req.file.buffer);
        
        // Check if same file was uploaded recently
        const recentUpload = await db.query(
            `SELECT id, ocr_result FROM public.upload_history 
             WHERE user_id = $1 AND file_hash = $2 
             AND uploaded_at > NOW() - INTERVAL '24 hours'
             ORDER BY uploaded_at DESC LIMIT 1`,
            [userId, fileHash]
        );

        let extractedCustomers;
        let uploadId;

        if (recentUpload.rows.length > 0 && recentUpload.rows[0].ocr_result) {
            // Use cached result
            log('Using cached OCR result for duplicate upload');
            extractedCustomers = JSON.parse(recentUpload.rows[0].ocr_result);
            uploadId = recentUpload.rows[0].id;
        } else {
            // Extract customers using Claude Vision (optimized)
            log('Extracting customers from image...');
            extractedCustomers = await extractCustomersFromImage(
                req.file.buffer,
                req.file.mimetype,
                'en', // Default language
                userId, // For usage tracking
                null // uploadId will be set after insert
            );

            if (!extractedCustomers || extractedCustomers.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No customers found',
                    message: 'Could not extract any customer data from the image. Please ensure the screenshot contains customer information.'
                });
            }

            // Create upload history record (if not using cached)
            if (!uploadId) {
                const uploadResult = await db.query(
                    `INSERT INTO public.upload_history (user_id, filename, file_size, customers_extracted, extraction_status, file_hash)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     RETURNING id`,
                    [
                        userId,
                        req.file.originalname,
                        req.file.size,
                        extractedCustomers.length,
                        'success',
                        fileHash
                    ]
                );
                uploadId = uploadResult.rows[0].id;
                
                // Save OCR result to cache
                await db.query(
                    `UPDATE public.upload_history 
                     SET ocr_result = $1 
                     WHERE id = $2`,
                    [JSON.stringify(extractedCustomers), uploadId]
                );
            }
        }

        // Save customers to database
        const savedCustomers = [];
        const errors = [];

        log(`🔵 Saving ${extractedCustomers.length} customers to database...`);

        for (const customer of extractedCustomers) {
            try {
                // Check if customer already exists (by email)
                const existing = await db.query(
                    'SELECT id FROM public.customers WHERE user_id = $1 AND email = $2',
                    [userId, customer.email]
                );

                if (existing.rows.length > 0) {
                    // Update existing customer
                    await db.query(
                        `UPDATE public.customers 
                         SET full_name = $1, 
                             customer_type = $2, 
                             country_code = $3,
                             updated_at = NOW()
                         WHERE id = $4`,
                        [
                            customer.full_name,
                            customer.customer_type,
                            customer.country_code,
                            existing.rows[0].id
                        ]
                    );
                    savedCustomers.push({ 
                        id: existing.rows[0].id,
                        full_name: customer.full_name,
                        email: customer.email,
                        customer_type: customer.customer_type,
                        country_code: customer.country_code,
                        language: customer.language || 'en',
                        updated: true 
                    });
                } else {
                    // Insert new customer
                    const result = await db.query(
                        `INSERT INTO public.customers (user_id, upload_id, full_name, email, customer_type, country_code)
                         VALUES ($1, $2, $3, $4, $5, $6)
                         RETURNING id, full_name, email, customer_type, country_code, created_at`,
                        [
                            userId,
                            uploadId,
                            customer.full_name,
                            customer.email,
                            customer.customer_type,
                            customer.country_code
                        ]
                    );
                    savedCustomers.push({ 
                        ...result.rows[0],
                        language: customer.language || 'en',
                        updated: false 
                    });
                }
            } catch (err) {
                error(`Error saving customer ${customer.email}:`, err);
                errors.push({ customer: customer.email, error: err.message });
            }
        }

        log(`✅ Saved ${savedCustomers.length} customers successfully`);
        log(`   Debug: customersExtracted=${savedCustomers.length}, errors=${errors.length}`);

        // Return response with proper format for frontend
        res.json({
            success: true,
            message: `Extracted ${savedCustomers.length} customers from screenshot`,
            customersExtracted: savedCustomers.length,
            customers: savedCustomers.map(c => ({
                id: c.id,
                full_name: c.full_name,
                email: c.email,
                customer_type: c.customer_type,
                country_code: c.country_code,
                language: c.language || 'en',
                phone: c.phone || null,
                updated: c.updated || false
            })),
            data: {
                upload_id: uploadId,
                customers_extracted: savedCustomers.length,
                customers: savedCustomers,
                errors: errors.length > 0 ? errors : undefined
            },
            debug: {
                extractedCount: extractedCustomers.length,
                savedCount: savedCustomers.length,
                errorCount: errors.length
            }
        });
    } catch (err) {
        error('Screenshot upload error:', err);
        
        // Try to save error to upload_history
        try {
            const fileHash = req.file ? calculateFileHash(req.file.buffer) : null;
            await db.query(
                `INSERT INTO public.upload_history (user_id, filename, file_size, extraction_status, error_message, file_hash)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    req.user?.userId,
                    req.file?.originalname || 'unknown',
                    req.file?.size || 0,
                    'failed',
                    err.message,
                    fileHash
                ]
            );
        } catch (dbError) {
            error('Failed to save error to upload_history:', dbError);
        }

        res.status(500).json({
            success: false,
            error: 'Upload failed',
            message: err.message || 'Failed to process screenshot'
        });
    }
});

/**
 * GET /api/uploads/history
 * Get upload history for user
 */
router.get('/history', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { limit = 50, offset = 0 } = req.query;

        const result = await db.query(
            `SELECT id, filename, file_size, customers_extracted, extraction_status, 
                    error_message, uploaded_at
             FROM public.upload_history
             WHERE user_id = $1
             ORDER BY uploaded_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (err) {
        error('Upload history error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch upload history',
            message: err.message
        });
    }
});

module.exports = router;
