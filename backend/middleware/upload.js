// middleware/upload.js
// Multer configuration for screenshot uploads

const multer = require('multer');
const sharp = require('sharp');

// Memory storage for processing
const storage = multer.memoryStorage();

// File filter - only images
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP allowed.'), false);
    }
};

// Multer upload config
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    }
});

/**
 * Middleware to optimize image before processing
 * Reduces size for faster Claude API calls
 */
async function optimizeImage(req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const originalSize = req.file.size;
        
        // Optimize image with sharp
        // Resize if too large, compress quality
        const optimized = await sharp(req.file.buffer)
            .resize(2000, 2000, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 85 })
            .toBuffer();

        // Replace buffer with optimized version
        req.file.buffer = optimized;
        req.file.size = optimized.length;
        req.file.mimetype = 'image/jpeg';

        const compressionRatio = ((1 - optimized.length / originalSize) * 100).toFixed(1);
        console.log(`Image optimized: ${(originalSize / 1024).toFixed(0)}KB → ${(optimized.length / 1024).toFixed(0)}KB (${compressionRatio}% reduction)`);

        next();
    } catch (error) {
        console.error('Image optimization error:', error);
        return res.status(500).json({ error: 'Image processing failed' });
    }
}

module.exports = {
    upload,
    optimizeImage
};
