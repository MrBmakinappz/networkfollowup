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
            console.log('=== OCR EXTRACTION DEBUG ===');
            console.log('1. File received:', req.file.originalname);
            console.log('2. File size:', req.file.size, 'bytes');
            console.log('3. File type:', req.file.mimetype);
            console.log('4. Calling Claude API...');
            
            try {
                extractedCustomers = await extractCustomersFromImage(
                    req.file.buffer,
                    req.file.mimetype,
                    'en', // Default language
                    userId, // For usage tracking
                    null // uploadId will be set after insert
                );

                console.log('5. Claude extraction completed');
                console.log('6. Extracted customers count:', extractedCustomers ? extractedCustomers.length : 0);
                
                if (extractedCustomers && extractedCustomers.length > 0) {
                    console.log('7. First customer sample:', JSON.stringify(extractedCustomers[0], null, 2));
                } else {
                    console.log('7. WARNING: No customers extracted or empty array');
                }

                if (!extractedCustomers || extractedCustomers.length === 0) {
                    console.log('=== END DEBUG (NO CUSTOMERS) ===');
                    return res.status(200).json({
                        success: false,
                        error: 'No customers found',
                        message: 'Could not extract any customer data from the image. Please ensure the screenshot contains customer information.',
                        customersExtracted: 0,
                        customers: []
                    });
                }

                // Create upload history record (if not using cached)
                if (!uploadId) {
                    console.log('8. Creating upload history record...');
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
                    console.log('9. Upload history ID:', uploadId);
                    
                    // Save OCR result to cache
                    await db.query(
                        `UPDATE public.upload_history 
                         SET ocr_result = $1 
                         WHERE id = $2`,
                        [JSON.stringify(extractedCustomers), uploadId]
                    );
                    console.log('10. OCR result cached');
                }
            } catch (extractError) {
                console.error('=== EXTRACTION ERROR ===');
                console.error('Error:', extractError.message);
                console.error('Stack:', extractError.stack);
                console.log('=== END DEBUG (ERROR) ===');
                throw extractError; // Re-throw to be caught by outer try-catch
            }
        }

        // Save customers to database
        console.log('11. Starting database save process...');
        console.log('12. Customers to save:', extractedCustomers.length);
        
        const savedCustomers = [];
        const errors = [];

        for (let i = 0; i < extractedCustomers.length; i++) {
            const customer = extractedCustomers[i];
            console.log(`13. Processing customer ${i + 1}/${extractedCustomers.length}:`, customer.email || customer.full_name);
            
            try {
                // Validate required fields
                if (!customer.email || !customer.full_name) {
                    console.log(`   ⚠️ Skipping customer ${i + 1}: missing email or name`);
                    errors.push({ customer: customer.email || 'unknown', error: 'Missing email or full_name' });
                    continue;
                }

                // Check if customer already exists (by email)
                const existing = await db.query(
                    'SELECT id FROM public.customers WHERE user_id = $1 AND email = $2',
                    [userId, customer.email.toLowerCase()]
                );

                if (existing.rows.length > 0) {
                    // Update existing customer
                    console.log(`   ✓ Updating existing customer: ${customer.email}`);
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
                        email: customer.email.toLowerCase(),
                        customer_type: customer.customer_type,
                        country_code: customer.country_code,
                        language: customer.language || 'en',
                        phone: customer.phone || null,
                        updated: true 
                    });
                } else {
                    // Insert new customer
                    console.log(`   ✓ Inserting new customer: ${customer.email}`);
                    const result = await db.query(
                        `INSERT INTO public.customers (user_id, upload_id, full_name, email, customer_type, country_code)
                         VALUES ($1, $2, $3, $4, $5, $6)
                         RETURNING id, full_name, email, customer_type, country_code, created_at`,
                        [
                            userId,
                            uploadId,
                            customer.full_name,
                            customer.email.toLowerCase(),
                            customer.customer_type,
                            customer.country_code
                        ]
                    );
                    savedCustomers.push({ 
                        id: result.rows[0].id,
                        full_name: result.rows[0].full_name,
                        email: result.rows[0].email,
                        customer_type: result.rows[0].customer_type,
                        country_code: result.rows[0].country_code,
                        language: customer.language || 'en',
                        phone: customer.phone || null,
                        updated: false 
                    });
                }
            } catch (err) {
                console.error(`   ❌ Error saving customer ${customer.email}:`, err.message);
                error(`Error saving customer ${customer.email}:`, err);
                errors.push({ customer: customer.email, error: err.message });
            }
        }

        console.log('14. Database save complete');
        console.log('15. Total saved:', savedCustomers.length);
        console.log('16. Total errors:', errors.length);
        console.log('=== END DEBUG ===');

        // Return response with proper JSON format
        const responseData = {
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
            }))
        };

        // Only add debug/errors if in development or if there are errors
        if (process.env.NODE_ENV === 'development' || errors.length > 0) {
            responseData.debug = {
                extractedCount: extractedCustomers.length,
                savedCount: savedCustomers.length,
                errorCount: errors.length
            };
            if (errors.length > 0) {
                responseData.errors = errors;
            }
        }

        // Ensure proper JSON response
        log(`✅ Sending response: ${savedCustomers.length} customers`);
        res.status(200).json(responseData);
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
