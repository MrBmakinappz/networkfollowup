// api/uploads/screenshot.js
// Vercel serverless function for screenshot OCR upload

const multiparty = require('multiparty');
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../_helpers/auth');
const db = require('../../backend/config/database');
const { extractCustomersFromImage, calculateFileHash } = require('../../backend/utils/claude-optimized');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

async function handler(req, res) {
    try {
        const userId = req.user.userId;

        // Parse multipart form data
        const form = new multiparty.Form({
            maxFieldsSize: 10 * 1024 * 1024, // 10MB
            maxFilesSize: 10 * 1024 * 1024
        });

        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error('Form parse error:', err);
                return res.status(400).json({
                    success: false,
                    error: 'File upload failed',
                    message: err.message
                });
            }

            if (!files.screenshot || files.screenshot.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No file uploaded',
                    message: 'Please select a screenshot file'
                });
            }

            const file = files.screenshot[0];
            const fileBuffer = fs.readFileSync(file.path);
            
            // Clean up temp file
            fs.unlinkSync(file.path);

            // Calculate file hash for caching
            const fileHash = calculateFileHash(fileBuffer);
            
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
                console.log('Using cached OCR result for duplicate upload');
                extractedCustomers = JSON.parse(recentUpload.rows[0].ocr_result);
                uploadId = recentUpload.rows[0].id;
            } else {
                // Extract customers using Claude Vision
                console.log('Extracting customers from image...');
                extractedCustomers = await extractCustomersFromImage(
                    fileBuffer,
                    file.headers['content-type'] || 'image/jpeg',
                    'en',
                    userId,
                    null
                );

                if (!extractedCustomers || extractedCustomers.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'No customers found',
                        message: 'Could not extract any customer data from the image. Please ensure the screenshot contains customer information.'
                    });
                }

                // Create upload history record
                const uploadResult = await db.query(
                    `INSERT INTO public.upload_history (user_id, filename, file_size, customers_extracted, extraction_status, file_hash)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     RETURNING id`,
                    [
                        userId,
                        file.originalFilename || 'screenshot.png',
                        file.size,
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

            // Save customers to database
            const savedCustomers = [];
            const errors = [];

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
                        savedCustomers.push({ ...customer, id: existing.rows[0].id, updated: true });
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
                        savedCustomers.push({ ...result.rows[0], updated: false });
                    }
                } catch (err) {
                    console.error(`Error saving customer ${customer.email}:`, err);
                    errors.push({ customer: customer.email, error: err.message });
                }
            }

            res.json({
                success: true,
                message: `Extracted ${savedCustomers.length} customers from screenshot`,
                data: {
                    upload_id: uploadId,
                    customers_extracted: savedCustomers.length,
                    customers: savedCustomers,
                    errors: errors.length > 0 ? errors : undefined
                }
            });
        });
    } catch (error) {
        console.error('Screenshot upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Upload failed',
            message: error.message || 'Failed to process screenshot'
        });
    }
}

module.exports = requireAuth(handler);



